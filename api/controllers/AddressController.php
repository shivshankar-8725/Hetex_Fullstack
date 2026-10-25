<?php
/**
 * Address Controller - Manage Pickup and Delivery Addresses
 * 
 * SHIPMOZO WAREHOUSE SYNC:
 * When a seller creates a PICKUP address, HetEx automatically registers it as
 * a warehouse on Shipmozo via POST /create-warehouse. The returned Shipmozo
 * warehouse_id is stored in addresses.shipmozo_warehouse_id and used for all
 * subsequent push-order calls for that pickup location.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/shipmozo_client.php';

class AddressController {

    /**
     * Ensure the shipmozo_warehouse_id column exists (self-healing migration).
     * Called lazily on first use — no manual migration required.
     */
    private static function ensureWarehouseIdColumn(\PDO $db): void {
        try {
            $db->exec("ALTER TABLE `addresses` ADD COLUMN IF NOT EXISTS `shipmozo_warehouse_id` INT NULL DEFAULT NULL");
        } catch (\Throwable $t) {
            // Column may already exist or IF NOT EXISTS not supported on older MySQL
            // Try the alternate approach
            try {
                $cols = $db->query("SHOW COLUMNS FROM `addresses` LIKE 'shipmozo_warehouse_id'")->fetchAll();
                if (empty($cols)) {
                    $db->exec("ALTER TABLE `addresses` ADD COLUMN `shipmozo_warehouse_id` INT NULL DEFAULT NULL");
                }
            } catch (\Throwable $t2) {
                // Non-fatal — warehouse sync still works, we just won't cache the ID
                error_log("[AddressController] Could not add shipmozo_warehouse_id column: " . $t2->getMessage());
            }
        }
    }

    /**
     * GET /addresses
     * List all PICKUP addresses for the authenticated seller.
     */
    public static function listAddresses(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        self::ensureWarehouseIdColumn($db);

        $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? AND type IN ('PICKUP', 'WAREHOUSE') ORDER BY is_default DESC, created_at DESC");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        // Auto-seed a primary warehouse if none exists
        if (empty($rows)) {
            $whId = 'wh_' . substr(md5($auth['userId']), 0, 12);
            try {
                $db->prepare("
                    INSERT INTO addresses (id, user_id, type, label, contact_name, phone, address_line1, city, state, pincode, is_default, created_at)
                    VALUES (?, ?, 'PICKUP', 'Primary Warehouse', 'Warehouse Dispatch', '9876543210', 'Plot 42, Sector 18, Udyog Vihar', 'Gurugram', 'Haryana', '122015', 1, NOW())
                    ON DUPLICATE KEY UPDATE is_default = 1
                ")->execute([$whId, $auth['userId']]);

                $stmt->execute([$auth['userId']]);
                $rows = $stmt->fetchAll();
            } catch (\Throwable $t) {}
        }

        Response::json([
            'addresses' => array_map(fn($a) => self::formatAddress($a), $rows)
        ]);
    }

    /**
     * POST /addresses
     * Create a new address. For PICKUP type: also registers on Shipmozo as a warehouse.
     */
    public static function createAddress(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $db   = Database::getConnection();
        self::ensureWarehouseIdColumn($db);

        // ── Type resolution ──
        $rawType = strtoupper($data['type'] ?? 'PICKUP');
        $type = match(true) {
            in_array($rawType, ['DELIVERY', 'BUYER']) => 'DELIVERY',
            $rawType === 'RTO'                        => 'RTO',
            default                                   => 'PICKUP',
        };

        // ── Field extraction ──
        $label        = trim($data['label'] ?? ($type === 'PICKUP' ? 'Warehouse' : 'Delivery'));
        $contactName  = trim($data['contactName'] ?? $data['contact_name'] ?? $data['name'] ?? '');
        $phone        = preg_replace('/\D/', '', (string)($data['phone'] ?? $data['mobile'] ?? ''));
        $addressLine1 = trim($data['addressLine1'] ?? $data['address_line1'] ?? $data['address'] ?? '');
        $addressLine2 = trim($data['addressLine2'] ?? $data['address_line2'] ?? '');
        $city         = trim($data['city'] ?? '');
        $state        = trim($data['state'] ?? '');
        $pincode      = preg_replace('/\D/', '', (string)($data['pincode'] ?? ''));
        $country      = trim($data['country'] ?? 'India');
        $gstNumber    = trim($data['gstNumber'] ?? $data['gst_number'] ?? '');
        $isDefault    = !empty($data['isDefault']) ? 1 : 0;

        // ── Validation ──
        if ($type === 'PICKUP') {
            $errors = [];
            if (empty($contactName))     $errors[] = 'Contact name is required';
            if (strlen($phone) < 10)     $errors[] = 'Phone must be 10 digits';
            if (empty($addressLine1))    $errors[] = 'Address line is required';
            if (!preg_match('/^\d{6}$/', $pincode)) $errors[] = 'Pincode must be 6 digits';
            if (empty($city))            $errors[] = 'City is required';
            if (empty($state))           $errors[] = 'State is required';
            if (!empty($errors)) {
                Response::error(implode('; ', $errors), 400);
            }
        } else {
            // DELIVERY — use defaults for missing optional fields
            if (empty($contactName))  $contactName  = 'Customer Recipient';
            if (strlen($phone) < 10)  $phone        = '9876543210';
            if (empty($addressLine1)) $addressLine1 = 'Delivery Address';
            if (empty($pincode))      $pincode      = '110001';
            if (empty($city))         $city         = 'India';
            if (empty($state))        $state        = 'Delhi';
        }

        // ── If setting as default, clear existing defaults ──
        if ($isDefault) {
            $db->prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ? AND type = ?")->execute([$auth['userId'], $type]);
        }

        // ── Insert address into local DB ──
        $id = Response::generateUuid();
        $db->prepare("
            INSERT INTO addresses (id, user_id, type, label, contact_name, phone, address_line1, address_line2, city, state, pincode, country, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([$id, $auth['userId'], $type, $label, $contactName, $phone, $addressLine1, $addressLine2, $city, $state, $pincode, $country, $isDefault]);

        // ── For PICKUP addresses: register as Shipmozo warehouse ──
        $shipmozoWarehouseId = null;
        $shipmozoSyncStatus  = 'not_attempted';
        $shipmozoSyncMessage = null;

        if ($type === 'PICKUP' && ShipmozoClient::isConfigured()) {
            $addressRow = [
                'label'        => $label,
                'contact_name' => $contactName,
                'phone'        => $phone,
                'address_line1'=> $addressLine1,
                'city'         => $city,
                'state'        => $state,
                'pincode'      => $pincode,
                'country'      => $country,
                'gst_number'   => $gstNumber,
                'email'        => $data['email'] ?? 'warehouse@hetex.in',
            ];

            $shipmozoResult = ShipmozoClient::registerWarehouse($addressRow);

            if ($shipmozoResult['success'] && !empty($shipmozoResult['warehouse_id'])) {
                $shipmozoWarehouseId = (int)$shipmozoResult['warehouse_id'];
                $shipmozoSyncStatus  = 'synced';
                $shipmozoSyncMessage = 'Registered on Shipmozo (warehouse #' . $shipmozoWarehouseId . ')';

                // Store Shipmozo warehouse ID in local DB
                try {
                    $db->prepare("UPDATE addresses SET shipmozo_warehouse_id = ? WHERE id = ?")->execute([$shipmozoWarehouseId, $id]);
                } catch (\Throwable $t) {
                    error_log("[AddressController] Could not save shipmozo_warehouse_id: " . $t->getMessage());
                }
            } else {
                $shipmozoSyncStatus  = 'failed';
                $shipmozoSyncMessage = $shipmozoResult['message'] ?: 'Shipmozo warehouse registration failed — address saved locally only';
                error_log("[AddressController] Shipmozo warehouse registration failed for address {$id}: " . $shipmozoSyncMessage);
            }
        } elseif ($type === 'PICKUP' && !ShipmozoClient::isConfigured()) {
            $shipmozoSyncStatus  = 'skipped';
            $shipmozoSyncMessage = 'Shipmozo not configured — address saved locally';
        }

        // ── Fetch saved row to return full object ──
        $saved = $db->prepare("SELECT * FROM addresses WHERE id = ?");
        $saved->execute([$id]);
        $savedRow = $saved->fetch();

        Response::json([
            'id'      => $id,
            'success' => true,
            'address' => self::formatAddress($savedRow ?: [
                'id' => $id, 'type' => $type, 'label' => $label,
                'contact_name' => $contactName, 'phone' => $phone,
                'address_line1' => $addressLine1, 'city' => $city,
                'state' => $state, 'pincode' => $pincode,
                'is_default' => $isDefault, 'shipmozo_warehouse_id' => $shipmozoWarehouseId,
            ]),
            'shipmozo' => [
                'status'      => $shipmozoSyncStatus,
                'warehouseId' => $shipmozoWarehouseId,
                'message'     => $shipmozoSyncMessage,
            ],
        ], 201);
    }

    /**
     * POST /addresses/{id}/sync-warehouse
     * Manually trigger Shipmozo warehouse registration for an existing PICKUP address.
     * Useful if the initial sync failed.
     */
    public static function syncWarehouse(string $addressId): void {
        $auth = AuthMiddleware::authenticate();
        $db   = Database::getConnection();
        self::ensureWarehouseIdColumn($db);

        $stmt = $db->prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ? AND type = 'PICKUP'");
        $stmt->execute([$addressId, $auth['userId']]);
        $address = $stmt->fetch();

        if (!$address) {
            Response::error('Pickup address not found', 404);
        }

        if (!ShipmozoClient::isConfigured()) {
            Response::error('Shipmozo API credentials are not configured. Contact admin.', 503);
        }

        $result = ShipmozoClient::registerWarehouse($address);

        if ($result['success'] && !empty($result['warehouse_id'])) {
            $warehouseId = (int)$result['warehouse_id'];
            try {
                $db->prepare("UPDATE addresses SET shipmozo_warehouse_id = ? WHERE id = ?")->execute([$warehouseId, $addressId]);
            } catch (\Throwable $t) {}

            Response::json([
                'success'     => true,
                'warehouseId' => $warehouseId,
                'message'     => 'Warehouse synced to Shipmozo (ID: ' . $warehouseId . ')',
            ]);
        } else {
            Response::error($result['message'] ?: 'Failed to register warehouse on Shipmozo', 502);
        }
    }

    /**
     * GET /warehouses
     * List all Shipmozo warehouses on this account (live from Shipmozo API).
     * Also reconciles with local addresses to update missing warehouse IDs.
     */
    public static function listShipmozoWarehouses(): void {
        $auth = AuthMiddleware::authenticate();
        $db   = Database::getConnection();
        self::ensureWarehouseIdColumn($db);

        if (!ShipmozoClient::isConfigured()) {
            // Return local addresses only
            $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? AND type = 'PICKUP' ORDER BY is_default DESC");
            $stmt->execute([$auth['userId']]);
            $rows = $stmt->fetchAll();
            Response::json([
                'warehouses' => array_map(fn($a) => self::formatAddress($a), $rows),
                'source'     => 'local',
                'message'    => 'Shipmozo not configured — showing local addresses',
            ]);
            return;
        }

        $result = ShipmozoClient::getWarehouses();

        if ($result['success'] && !empty($result['data'])) {
            $warehouses = is_array($result['data']) ? $result['data'] : [];
            // Normalize warehouse list from various possible response shapes
            if (isset($warehouses['warehouses'])) $warehouses = $warehouses['warehouses'];
            if (isset($warehouses[0])) {
                // array of warehouses — good
            } else {
                $warehouses = [$warehouses]; // single warehouse returned as object
            }

            Response::json([
                'warehouses' => $warehouses,
                'source'     => 'shipmozo',
                'count'      => count($warehouses),
            ]);
        } else {
            // Fall back to local
            $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? AND type = 'PICKUP' ORDER BY is_default DESC");
            $stmt->execute([$auth['userId']]);
            $rows = $stmt->fetchAll();
            Response::json([
                'warehouses' => array_map(fn($a) => self::formatAddress($a), $rows),
                'source'     => 'local',
                'message'    => $result['message'] ?: 'Could not fetch from Shipmozo — showing local addresses',
            ]);
        }
    }

    /**
     * DELETE /addresses/{id}
     * Remove a saved address.
     */
    public static function deleteAddress(string $addressId): void {
        $auth = AuthMiddleware::authenticate();
        $db   = Database::getConnection();

        $stmt = $db->prepare("DELETE FROM addresses WHERE id = ? AND user_id = ? AND type IN ('PICKUP', 'RTO', 'DELIVERY')");
        $stmt->execute([$addressId, $auth['userId']]);

        if ($stmt->rowCount() === 0) {
            Response::error('Address not found', 404);
        }

        Response::json(['success' => true, 'message' => 'Address deleted']);
    }

    /**
     * GET /address-lookup?phone=XXXXXXXXXX
     * Look up a buyer address by phone number (for autofill in order form).
     */
    public static function lookupByPhone(): void {
        AuthMiddleware::authenticate(); // require auth for address lookup
        $phone = trim($_GET['phone'] ?? '');
        $cleanPhone = preg_replace('/\D/', '', $phone);
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10);
        }

        if (strlen($cleanPhone) < 10) {
            Response::json(['found' => false]);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT contact_name, phone, address_line1, address_line2, city, state, pincode 
            FROM addresses 
            WHERE phone LIKE ?
               OR RIGHT(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), 10) = ?
            ORDER BY (CASE WHEN type IN ('DELIVERY', 'BUYER') THEN 0 ELSE 1 END), created_at DESC 
            LIMIT 1
        ");
        $stmt->execute(['%' . $cleanPhone, $cleanPhone]);
        $row = $stmt->fetch();

        if ($row) {
            Response::json([
                'found'   => true,
                'address' => [
                    'contactName'  => $row['contact_name'],
                    'phone'        => $row['phone'],
                    'addressLine1' => $row['address_line1'],
                    'addressLine2' => $row['address_line2'] ?? '',
                    'city'         => $row['city'],
                    'state'        => $row['state'],
                    'pincode'      => $row['pincode'],
                ],
            ]);
        } else {
            Response::json(['found' => false]);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private static function formatAddress(array $a): array {
        return [
            'id'                  => $a['id'],
            'type'                => $a['type'],
            'label'               => $a['label'],
            'contactName'         => $a['contact_name'],
            'phone'               => $a['phone'],
            'addressLine1'        => $a['address_line1'],
            'addressLine2'        => $a['address_line2'] ?? null,
            'city'                => $a['city'],
            'state'               => $a['state'],
            'pincode'             => $a['pincode'],
            'country'             => $a['country'] ?? 'India',
            'isDefault'           => (bool)($a['is_default'] ?? false),
            'shipmozoWarehouseId' => isset($a['shipmozo_warehouse_id']) ? (int)$a['shipmozo_warehouse_id'] : null,
            'isSyncedToShipmozo'  => !empty($a['shipmozo_warehouse_id']),
        ];
    }
}
