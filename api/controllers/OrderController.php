<?php
/**
 * Order & Shipment Controller - Create Orders, Manifest, Cancel & Tracking
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class OrderController {

    public static function createOrder(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $pickupAddressId = $data['pickupAddressId'] ?? '';
        $buyerAddressId  = $data['buyerAddressId'] ?? '';
        $itemDesc        = trim($data['itemDescription'] ?? 'Merchandise Goods');
        $declaredValue   = (float)($data['declaredValue'] ?? 500);
        $weight          = (float)($data['weight'] ?? 0.5);
        $length          = (float)($data['length'] ?? 10);
        $width           = (float)($data['width'] ?? 10);
        $height          = (float)($data['height'] ?? 10);
        $paymentMode     = strtoupper($data['paymentMode'] ?? 'PREPAID');
        $codAmount       = (float)($data['codAmount'] ?? 0);
        $courierId       = $data['courierId'] ?? '';
        $sellerPrice     = (float)($data['sellerPrice'] ?? 0);
        $marginInput     = (float)($data['margin'] ?? 0);

        if (empty($pickupAddressId) || empty($buyerAddressId)) {
            Response::error('Pickup and Buyer address are required', 400);
        }

        $rawItems = $data['items'] ?? [];
        $items = [];
        if (is_array($rawItems) && !empty($rawItems)) {
            foreach ($rawItems as $it) {
                $items[] = [
                    'name' => trim($it['name'] ?? $it['itemDescription'] ?? 'Item'),
                    'category' => trim($it['category'] ?? 'General Merchandise'),
                    'quantity' => max(1, (int)($it['quantity'] ?? 1)),
                    'declaredValue' => (float)($it['declaredValue'] ?? 500),
                    'weight' => max(0.01, (float)($it['weight'] ?? 0.5)),
                    'length' => max(1, (float)($it['length'] ?? 10)),
                    'width' => max(1, (float)($it['width'] ?? 10)),
                    'height' => max(1, (float)($it['height'] ?? 10))
                ];
            }
        } else {
            $items[] = [
                'name' => $itemDesc,
                'category' => trim($data['itemCategory'] ?? 'General Merchandise'),
                'quantity' => 1,
                'declaredValue' => $declaredValue,
                'weight' => $weight,
                'length' => $length,
                'width' => $width,
                'height' => $height
            ];
        }

        // Aggregate across all items
        $totalWeight = 0;
        $totalVolWeight = 0;
        $totalDeclaredValue = 0;
        $itemNames = [];
        foreach ($items as $it) {
            $qty = $it['quantity'];
            $totalWeight += $it['weight'] * $qty;
            $totalVolWeight += (($it['length'] * $it['width'] * $it['height']) / 5000.0) * $qty;
            $totalDeclaredValue += $it['declaredValue'] * $qty;
            $itemNames[] = $it['name'] . ($qty > 1 ? " (x{$qty})" : "");
        }

        $billableWeight = max($totalWeight, $totalVolWeight);
        $itemDesc = implode(', ', $itemNames);
        $declaredValue = $totalDeclaredValue;
        $weight = $totalWeight;

        $db = Database::getConnection();

        // Check courier rate
        $courierStmt = $db->prepare("SELECT * FROM couriers WHERE id = ? AND active = 1");
        $courierStmt->execute([$courierId]);
        $courier = $courierStmt->fetch();
        if (!$courier) {
            $courier = $db->query("SELECT * FROM couriers WHERE active = 1 LIMIT 1")->fetch();
            $courierId = $courier['id'];
        }

        $baseFreight = ceil($billableWeight) * (float)$courier['base_rate_per_kg'];
        $codCharge = ($paymentMode === 'COD') ? max((float)$courier['cod_charge_flat'], (float)$courier['cod_charge_percent'] / 100 * $codAmount) : 0;
        $margin = $marginInput > 0 ? $marginInput : (($baseFreight + $codCharge) * 0.10);
        $totalShippingCost = round($baseFreight + $codCharge + $margin, 2);

        // Check wallet balance
        $walletStmt = $db->prepare("SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE");
        $db->beginTransaction();

        try {
            $walletStmt->execute([$auth['userId']]);
            $wallet = $walletStmt->fetch();

            if (!$wallet || (float)$wallet['balance'] < $totalShippingCost) {
                $db->rollBack();
                Response::error('Insufficient wallet balance. Required: ₹' . $totalShippingCost . ', Available: ₹' . ($wallet['balance'] ?? 0), 402);
            }

            // Deduct shipping fee
            $balBefore = (float)$wallet['balance'];
            $balAfter = $balBefore - $totalShippingCost;
            $db->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?")->execute([$balAfter, $wallet['id']]);

            // Create Order
            $orderId = Response::generateUuid();
            $orderNum = 'HTX' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 8));

            $db->prepare("
                INSERT INTO orders (id, order_number, user_id, pickup_address_id, buyer_address_id, item_description, declared_value, weight, length, width, height, volumetric_weight, billable_weight, payment_mode, cod_amount, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', NOW())
            ")->execute([$orderId, $orderNum, $auth['userId'], $pickupAddressId, $buyerAddressId, $itemDesc, $declaredValue, $weight, $length, $width, $height, $totalVolWeight, $billableWeight, $paymentMode, $codAmount]);

            // Insert each item into order_items (guarded against missing table)
            if (!empty($items) && is_array($items)) {
                // Ensure table exists
                try {
                    $db->exec("
                        CREATE TABLE IF NOT EXISTS `order_items` (
                          `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                          `order_id` VARCHAR(36) NOT NULL,
                          `name` VARCHAR(255) NOT NULL,
                          `category` VARCHAR(100) NOT NULL DEFAULT 'General',
                          `quantity` INT NOT NULL DEFAULT 1,
                          `declared_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                          `weight` DECIMAL(10,3) NOT NULL DEFAULT 0.500,
                          `length` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `width` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `height` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
                          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          INDEX `idx_items_order` (`order_id`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                    ");
                } catch (Throwable $t) {}

                foreach ($items as $it) {
                    try {
                        $db->prepare("
                            INSERT INTO order_items (id, order_id, name, category, quantity, declared_value, weight, length, width, height, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        ")->execute([
                            Response::generateUuid(), $orderId, $it['name'] ?? 'Item', $it['category'] ?? 'General', $it['quantity'] ?? 1,
                            $it['declaredValue'] ?? 0, $it['weight'] ?? 0.5, $it['length'] ?? 10, $it['width'] ?? 10, $it['height'] ?? 10
                        ]);
                    } catch (Throwable $itErr) {
                        error_log("Non-fatal: failed to insert order item: " . $itErr->getMessage());
                    }
                }
            }

            // Create Shipment & AWB
            $shipmentId = Response::generateUuid();
            $awb = 'AWB' . random_int(1000000000, 9999999999);

            $db->prepare("
                INSERT INTO shipments (id, order_id, courier_id, awb_number, rate_charged, margin_earned, status, current_location, label_generated, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'READY_TO_SHIP', 'Origin Hub', 1, NOW(), NOW())
            ")->execute([$shipmentId, $orderId, $courierId, $awb, $totalShippingCost, $margin]);

            // Wallet Debit Transaction
            $db->prepare("
                INSERT INTO wallet_transactions (id, wallet_id, user_id, type, amount, balance_before, balance_after, reason, order_id, created_at)
                VALUES (?, ?, ?, 'DEBIT', ?, ?, ?, ?, ?, NOW())
            ")->execute([Response::generateUuid(), $wallet['id'], $auth['userId'], $totalShippingCost, $balBefore, $balAfter, 'Shipping Fee for Order ' . $orderNum, $orderId]);

            // Initial Tracking Event
            $db->prepare("
                INSERT INTO tracking_events (id, shipment_id, status, description, location, timestamp)
                VALUES (?, ?, 'READY_TO_SHIP', 'Shipment booked and label generated', 'Origin Hub', NOW())
            ")->execute([Response::generateUuid(), $shipmentId]);

            $db->commit();

            Response::json([
                'success' => true,
                'orderId' => $orderId,
                'orderNumber' => $orderNum,
                'awbNumber' => $awb,
                'status' => 'CONFIRMED',
                'rateCharged' => $totalShippingCost
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create order: ' . $e->getMessage(), 500);
        }
    }

    public static function listOrders(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $statusFilter = $_GET['status'] ?? '';
        $sql = "
            SELECT o.*, s.id as shipment_id, s.awb_number, s.status as shipment_status, s.rate_charged, 
                   c.name as courier_name, c.logo_color,
                   b.contact_name as buyer_name, b.city as buyer_city, b.phone as buyer_phone, b.pincode as buyer_pincode, b.address_line1 as buyer_addr
            FROM orders o
            LEFT JOIN shipments s ON o.id = s.order_id
            LEFT JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            WHERE o.user_id = ?
        ";
        $params = [$auth['userId']];

        if (!empty($statusFilter) && $statusFilter !== 'ALL') {
            $sql .= " AND (o.status = ? OR s.status = ?)";
            $params[] = $statusFilter;
            $params[] = $statusFilter;
        }

        $sql .= " ORDER BY o.created_at DESC LIMIT 100";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        Response::json([
            'orders' => array_map(function($o) {
                return [
                    'id' => $o['id'],
                    'orderNumber' => $o['order_number'],
                    'itemDescription' => $o['item_description'],
                    'status' => $o['status'],
                    'paymentMode' => $o['payment_mode'],
                    'codAmount' => (float)$o['cod_amount'],
                    'declaredValue' => (float)$o['declared_value'],
                    'weight' => (float)$o['weight'],
                    'billableWeight' => (float)$o['billable_weight'],
                    'buyerAddress' => [
                        'contactName' => $o['buyer_name'] ?? 'Buyer',
                        'city' => $o['buyer_city'] ?? 'City',
                        'phone' => $o['buyer_phone'] ?? '',
                        'pincode' => $o['buyer_pincode'] ?? '',
                        'addressLine1' => $o['buyer_addr'] ?? ''
                    ],
                    'shipment' => $o['awb_number'] ? [
                        'id' => $o['shipment_id'],
                        'status' => $o['shipment_status'],
                        'awbNumber' => $o['awb_number'],
                        'rateCharged' => (float)$o['rate_charged'],
                        'courier' => [
                            'name' => $o['courier_name'],
                            'logoColor' => $o['logo_color'] ?? '#2563eb'
                        ]
                    ] : null,
                    'createdAt' => $o['created_at']
                ];
            }, $orders)
        ]);
    }

    public static function getOrder(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $whereSql = ($auth['role'] === 'ADMIN') ? "(o.id = ? OR o.order_number = ?)" : "(o.id = ? OR o.order_number = ?) AND o.user_id = ?";
        $params = ($auth['role'] === 'ADMIN') ? [$id, $id] : [$id, $id, $auth['userId']];

        $stmt = $db->prepare("
            SELECT o.*, s.id as shipment_id, s.awb_number, s.status as shipment_status, s.rate_charged, s.current_location,
                   c.name as courier_name, c.logo_color,
                   b.contact_name as buyer_name, b.city as buyer_city, b.phone as buyer_phone, b.pincode as buyer_pincode, b.address_line1 as buyer_addr,
                   p.contact_name as pickup_name, p.city as pickup_city, p.phone as pickup_phone, p.pincode as pickup_pincode, p.address_line1 as pickup_addr
            FROM orders o
            LEFT JOIN shipments s ON o.id = s.order_id
            LEFT JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            LEFT JOIN addresses p ON o.pickup_address_id = p.id
            WHERE {$whereSql}
        ");
        $stmt->execute($params);
        $o = $stmt->fetch();

        if (!$o) Response::error('Order not found', 404);

        // Fetch Order Items (with resilient fallback)
        $orderItems = [];
        try {
            $itemsStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC");
            $itemsStmt->execute([$o['id']]);
            $orderItems = $itemsStmt->fetchAll();
        } catch (Throwable $e) {}

        if (empty($orderItems)) {
            $orderItems = [[
                'name' => $o['item_description'],
                'category' => 'General Merchandise',
                'quantity' => 1,
                'declared_value' => (float)$o['declared_value'],
                'weight' => (float)$o['weight'],
                'length' => (float)$o['length'],
                'width' => (float)$o['width'],
                'height' => (float)$o['height']
            ]];
        }

        $events = [];
        if ($o['shipment_id']) {
            $eStmt = $db->prepare("SELECT * FROM tracking_events WHERE shipment_id = ? ORDER BY timestamp DESC");
            $eStmt->execute([$o['shipment_id']]);
            $events = $eStmt->fetchAll();
        }

        Response::json([
            'order' => [
                'id' => $o['id'],
                'orderNumber' => $o['order_number'],
                'itemDescription' => $o['item_description'],
                'status' => $o['status'],
                'paymentMode' => $o['payment_mode'],
                'codAmount' => (float)$o['cod_amount'],
                'declaredValue' => (float)$o['declared_value'],
                'weight' => (float)$o['weight'],
                'dimensions' => "{$o['length']} x {$o['width']} x {$o['height']} cm",
                'billableWeight' => (float)$o['billable_weight'],
                'items' => array_map(function($it) {
                    return [
                        'name' => $it['name'],
                        'category' => $it['category'] ?? 'General Merchandise',
                        'quantity' => (int)$it['quantity'],
                        'declaredValue' => (float)$it['declared_value'],
                        'weight' => (float)$it['weight'],
                        'dimensions' => "{$it['length']} x {$it['width']} x {$it['height']} cm",
                        'length' => (float)$it['length'],
                        'width' => (float)$it['width'],
                        'height' => (float)$it['height']
                    ];
                }, $orderItems),
                'buyerAddress' => [
                    'contactName' => $o['buyer_name'],
                    'city' => $o['buyer_city'],
                    'phone' => $o['buyer_phone'],
                    'pincode' => $o['buyer_pincode'],
                    'addressLine1' => $o['buyer_addr']
                ],
                'pickupAddress' => [
                    'contactName' => $o['pickup_name'],
                    'city' => $o['pickup_city'],
                    'phone' => $o['pickup_phone'],
                    'pincode' => $o['pickup_pincode'],
                    'addressLine1' => $o['pickup_addr']
                ],
                'shipment' => $o['awb_number'] ? [
                    'id' => $o['shipment_id'],
                    'status' => $o['shipment_status'],
                    'awbNumber' => $o['awb_number'],
                    'rateCharged' => (float)$o['rate_charged'],
                    'currentLocation' => $o['current_location'],
                    'courier' => ['name' => $o['courier_name'], 'logoColor' => $o['logo_color']],
                    'events' => $events
                ] : null,
                'createdAt' => $o['created_at']
            ]
        ]);
    }

    public static function cancelOrder(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT o.*, s.id as shipment_id, s.rate_charged FROM orders o LEFT JOIN shipments s ON o.id = s.order_id WHERE o.id = ? AND o.user_id = ?");
        $stmt->execute([$id, $auth['userId']]);
        $o = $stmt->fetch();

        if (!$o) Response::error('Order not found', 404);

        $db->beginTransaction();
        try {
            $db->prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?")->execute([$id]);
            if ($o['shipment_id']) {
                $db->prepare("UPDATE shipments SET status = 'CANCELLED' WHERE id = ?")->execute([$o['shipment_id']]);
                // Refund shipping cost to wallet
                $refundAmount = (float)$o['rate_charged'];
                if ($refundAmount > 0) {
                    WalletController::creditWallet($auth['userId'], $refundAmount, "Refund for cancelled order {$o['order_number']}");
                }
            }
            $db->commit();
            Response::json(['ok' => true]);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to cancel order: ' . $e->getMessage(), 500);
        }
    }

    public static function trackShipment(?string $awbParam = null): void {
        $awb = trim($awbParam ?? $_GET['awb'] ?? '');

        if (empty($awb)) {
            Response::error('AWB number or tracking ID is required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT s.*, o.order_number, o.item_description, o.user_id, c.name as courier_name,
                   b.city as buyer_city, b.contact_name as buyer_name,
                   tc.brand_name, tc.primary_color, tc.logo_url
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            LEFT JOIN tracking_page_configs tc ON o.user_id = tc.user_id
            WHERE s.awb_number = ?
        ");
        $stmt->execute([$awb]);
        $shipment = $stmt->fetch();

        if (!$shipment) {
            // Return simulation tracking for demo / non-existent dummy numbers
            Response::json([
                'awbNumber' => $awb,
                'status' => 'IN_TRANSIT',
                'currentLocation' => 'Sorting Hub, Delhi',
                'courierName' => 'Delhivery Express',
                'destinationCity' => 'Buyer Destination',
                'branding' => [
                    'brandName' => 'HetEx Logistics',
                    'primaryColor' => '#2563eb',
                    'logoUrl' => null
                ],
                'events' => [
                    [
                        'id' => 'evt_1',
                        'status' => 'IN_TRANSIT',
                        'description' => 'Package processed at central sorting hub',
                        'location' => 'Sorting Hub, Delhi',
                        'timestamp' => date('Y-m-d H:i:s', time() - 3600)
                    ],
                    [
                        'id' => 'evt_2',
                        'status' => 'MANIFESTED',
                        'description' => 'Package received at pickup center',
                        'location' => 'Origin Hub',
                        'timestamp' => date('Y-m-d H:i:s', time() - 14400)
                    ]
                ]
            ]);
            return;
        }

        $eventsStmt = $db->prepare("SELECT * FROM tracking_events WHERE shipment_id = ? ORDER BY timestamp DESC");
        $eventsStmt->execute([$shipment['id']]);
        $events = $eventsStmt->fetchAll();

        Response::json([
            'awbNumber' => $shipment['awb_number'],
            'orderNumber' => $shipment['order_number'],
            'courierName' => $shipment['courier_name'],
            'status' => $shipment['status'],
            'currentLocation' => $shipment['current_location'],
            'destinationCity' => $shipment['buyer_city'] ?? 'India',
            'branding' => [
                'brandName' => $shipment['brand_name'] ?? 'HetEx',
                'primaryColor' => $shipment['primary_color'] ?? '#2563eb',
                'logoUrl' => $shipment['logo_url'] ?? null
            ],
            'events' => array_map(function($e) {
                return [
                    'id' => $e['id'],
                    'status' => $e['status'],
                    'description' => $e['description'],
                    'location' => $e['location'],
                    'timestamp' => $e['timestamp']
                ];
            }, $events)
        ]);
    }

    public static function getLabelPdf(string $shipmentId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT s.*, o.id as raw_order_id, o.order_number, o.payment_mode, o.cod_amount, o.declared_value, o.billable_weight, o.item_description,
                   c.name as courier_name,
                   b.contact_name as buyer_name, b.address_line1 as buyer_addr, b.city as buyer_city, b.state as buyer_state, b.pincode as buyer_pincode, b.phone as buyer_phone,
                   p.contact_name as pickup_name, p.address_line1 as pickup_addr, p.city as pickup_city, p.state as pickup_state, p.pincode as pickup_pincode, p.phone as pickup_phone
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            LEFT JOIN addresses p ON o.pickup_address_id = p.id
            WHERE s.id = ? OR s.order_id = ?
        ");
        $stmt->execute([$shipmentId, $shipmentId]);
        $data = $stmt->fetch();

        if (!$data) {
            // Also check orders table directly if shipmentId was order id or order number
            $stmt2 = $db->prepare("
                SELECT o.id as raw_order_id, o.order_number, o.payment_mode, o.cod_amount, o.declared_value, o.billable_weight, o.item_description,
                       b.contact_name as buyer_name, b.address_line1 as buyer_addr, b.city as buyer_city, b.state as buyer_state, b.pincode as buyer_pincode, b.phone as buyer_phone,
                       p.contact_name as pickup_name, p.address_line1 as pickup_addr, p.city as pickup_city, p.state as pickup_state, p.pincode as pickup_pincode, p.phone as pickup_phone
                FROM orders o
                LEFT JOIN addresses b ON o.buyer_address_id = b.id
                LEFT JOIN addresses p ON o.pickup_address_id = p.id
                WHERE o.id = ? OR o.order_number = ?
            ");
            $stmt2->execute([$shipmentId, $shipmentId]);
            $data = $stmt2->fetch() ?: [];
        }

        $realOrderId = $data['raw_order_id'] ?? $shipmentId;
        $awb = $data['awb_number'] ?? ('AWB' . time());
        $orderNum = $data['order_number'] ?? 'HTX-ORDER';
        $courier = $data['courier_name'] ?? 'Delhivery Express';
        $bName = htmlspecialchars($data['buyer_name'] ?? 'Consignee');
        $bAddr = htmlspecialchars($data['buyer_addr'] ?? '');
        $bCity = htmlspecialchars($data['buyer_city'] ?? '');
        $bState = htmlspecialchars($data['buyer_state'] ?? '');
        $bPin = htmlspecialchars($data['buyer_pincode'] ?? '');
        $bPhone = htmlspecialchars($data['buyer_phone'] ?? '');

        $pName = htmlspecialchars($data['pickup_name'] ?? 'HetEx Seller Hub');
        $pAddr = htmlspecialchars($data['pickup_addr'] ?? '');
        $pCity = htmlspecialchars($data['pickup_city'] ?? '');
        $pState = htmlspecialchars($data['pickup_state'] ?? '');
        $pPin = htmlspecialchars($data['pickup_pincode'] ?? '');
        $pPhone = htmlspecialchars($data['pickup_phone'] ?? '');

        $mode = $data['payment_mode'] ?? 'PREPAID';
        $cod = (float)($data['cod_amount'] ?? 0);
        $totalBillableWeight = (float)($data['billable_weight'] ?? 0.5);

        // Fetch Order Items to generate accurate number of labels (with resilient fallback)
        $orderItems = [];
        try {
            $itemsStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC");
            $itemsStmt->execute([$realOrderId]);
            $orderItems = $itemsStmt->fetchAll();
        } catch (Throwable $e) {}

        $labelsList = [];
        if (!empty($orderItems)) {
            foreach ($orderItems as $it) {
                $qty = max(1, (int)($it['quantity'] ?? 1));
                for ($q = 1; $q <= $qty; $q++) {
                    $labelsList[] = [
                        'name' => htmlspecialchars($it['name']),
                        'category' => htmlspecialchars($it['category'] ?? 'General Merchandise'),
                        'weight' => (float)$it['weight'],
                        'dimensions' => "{$it['length']} × {$it['width']} × {$it['height']} cm",
                        'declaredValue' => (float)$it['declared_value'],
                        'unitIndex' => $q,
                        'totalInLine' => $qty
                    ];
                }
            }
        } else {
            $labelsList[] = [
                'name' => htmlspecialchars($data['item_description'] ?? 'Merchandise Goods'),
                'category' => 'General Merchandise',
                'weight' => $totalBillableWeight,
                'dimensions' => '15 × 10 × 5 cm',
                'declaredValue' => (float)($data['declared_value'] ?? 500),
                'unitIndex' => 1,
                'totalInLine' => 1
            ];
        }

        $totalLabels = count($labelsList);

        header("Content-Type: text/html; charset=UTF-8");
        echo <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Shipping Labels ({$totalLabels}) - {$awb}</title>
    <style>
        @page { size: 100mm 150mm; margin: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 12px; background: #f1f5f9; color: #000; box-sizing: border-box; }
        .label-page { width: 100mm; max-width: 100%; margin: 0 auto 24px auto; background: #fff; padding: 12px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 4px; }
        .label-box { border: 2px solid #000; padding: 8px; font-size: 11px; line-height: 1.3; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
        .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #000; }
        .courier { font-size: 13px; font-weight: 800; text-align: right; }
        .pkg-badge { display: inline-block; background: #000; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; margin-top: 2px; }
        .awb-sec { text-align: center; border-bottom: 2px solid #000; padding: 6px 0; }
        .awb-num { font-size: 17px; font-weight: 900; letter-spacing: 2px; font-family: monospace; }
        .barcode { height: 38px; display: flex; justify-content: center; align-items: flex-end; gap: 2px; margin: 4px 0; }
        .bar { background: #000; width: 2px; height: 34px; }
        .bar.w { width: 4px; }
        .bar.s { width: 1px; }
        .bar.g { width: 3px; }
        .routing { display: flex; justify-content: space-between; font-weight: 700; border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; }
        .section { border-bottom: 1px solid #000; padding: 5px 0; }
        .sec-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444; }
        .bold { font-weight: 700; }
        .item-box { background: #f8fafc; border: 1px dashed #64748b; border-radius: 3px; padding: 4px 6px; margin-top: 4px; font-size: 10px; }
        .footer { font-size: 9px; margin-top: 6px; display: flex; justify-content: space-between; color: #555; }
        @media print { 
            body { background: #fff; padding: 0; } 
            .no-print { display: none !important; } 
            .label-page { box-shadow: none; border-radius: 0; padding: 6px; margin: 0; page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 16px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
            🖨️ Print All {$totalLabels} Thermal Shipping Labels
        </button>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Total {$totalLabels} label(s) generated for this shipment.</p>
    </div>
HTML;

        foreach ($labelsList as $idx => $lbl) {
            $labelNum = $idx + 1;
            $payText = ($mode === 'COD') ? "COD — Collect ₹{$cod}" : "PREPAID";
            echo <<<HTML
    <div class="label-page">
        <div class="label-box">
            <div class="header">
                <div>
                    <div class="brand">HetEx Logistics</div>
                    <span class="pkg-badge">PACKAGE {$labelNum} OF {$totalLabels}</span>
                </div>
                <div class="courier">
                    <div>{$courier}</div>
                    <div style="font-size: 10px; color: #555;">Standard Surface/Air</div>
                </div>
            </div>
            <div class="awb-sec">
                <div style="font-size: 9px; font-weight: 700; text-transform: uppercase;">TRACKING / AWB NUMBER</div>
                <div class="barcode">
                    <div class="bar w"></div><div class="bar s"></div><div class="bar g"></div><div class="bar w"></div>
                    <div class="bar"></div><div class="bar w"></div><div class="bar s"></div><div class="bar g"></div>
                    <div class="bar w"></div><div class="bar"></div><div class="bar w"></div><div class="bar s"></div>
                    <div class="bar g"></div><div class="bar w"></div><div class="bar"></div><div class="bar w"></div>
                    <div class="bar s"></div><div class="bar g"></div><div class="bar w"></div><div class="bar"></div>
                    <div class="bar w"></div><div class="bar s"></div><div class="bar g"></div><div class="bar w"></div>
                </div>
                <div class="awb-num">{$awb}</div>
            </div>
            <div class="routing">
                <div>Order: <strong>{$orderNum}</strong></div>
                <div>{$payText}</div>
            </div>
            <div class="section">
                <div class="sec-title">SHIP TO (CONSIGNEE):</div>
                <div class="bold" style="font-size: 12px;">{$bName}</div>
                <div>{$bAddr}</div>
                <div class="bold">{$bCity}, {$bState} - {$bPin}</div>
                <div>Phone: {$bPhone}</div>
            </div>
            <div class="section">
                <div class="sec-title">RETURN TO (ORIGIN WAREHOUSE):</div>
                <div class="bold">{$pName}</div>
                <div>{$pAddr}</div>
                <div>{$pCity}, {$pState} - {$pPin}</div>
                <div>Phone: {$pPhone}</div>
            </div>
            <div class="section" style="border-bottom: none;">
                <div class="sec-title">ITEM & PACKAGE SPECIFICATION:</div>
                <div class="item-box">
                    <div style="display: flex; justify-content: space-between; font-weight: 700;">
                        <span>📦 {$lbl['name']}</span>
                        <span style="color: #2563eb;">{$lbl['category']}</span>
                    </div>
                    <div style="margin-top: 3px; display: flex; justify-content: space-between; color: #475569;">
                        <span>Unit Weight: {$lbl['weight']} kg</span>
                        <span>Dimensions: {$lbl['dimensions']}</span>
                        <span>Value: ₹{$lbl['declaredValue']}</span>
                    </div>
                </div>
                <div style="margin-top: 4px; font-size: 9px; color: #64748b;">
                    Total Consignment Weight: {$totalBillableWeight} kg | Package: {$labelNum} of {$totalLabels}
                </div>
            </div>
            <div class="footer">
                <div>hetex.in · Tracking: track.hetex.in</div>
                <div>HetEx Logistics Cloud</div>
            </div>
        </div>
    </div>
HTML;
        }

        echo <<<HTML
</body>
</html>
HTML;
        exit;
    }

    public static function getInvoicePdf(string $shipmentId): void {
        header("Content-Type: application/pdf");
        header("Content-Disposition: inline; filename=\"tax_invoice_{$shipmentId}.pdf\"");
        echo "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 400 600]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF";
        exit;
    }
}
