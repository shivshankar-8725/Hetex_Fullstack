<?php
/**
 * Admin Controller - Platform Overview, Commission Rules, User Management, Couriers & NDR Oversight
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/WalletController.php';

class AdminController {

    public static function getOverview(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $sellerCount = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'SELLER'")->fetchColumn();
        $totalOrders = (int)$db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $totalShipments = (int)$db->query("SELECT COUNT(*) FROM shipments")->fetchColumn();
        $openNdr = (int)$db->query("SELECT COUNT(*) FROM ndr_records WHERE action = 'PENDING'")->fetchColumn();
        $totalMarginEarned = (float)($db->query("SELECT SUM(margin_earned) FROM shipments")->fetchColumn() ?: 0.00);
        $totalWalletBalance = (float)($db->query("SELECT SUM(balance) FROM wallets")->fetchColumn() ?: 0.00);

        $recentStmt = $db->query("
            SELECT o.*, s.awb_number, s.status as shipment_status, s.rate_charged, c.name as courier_name,
                   b.contact_name as buyer_name, b.city as buyer_city
            FROM orders o
            LEFT JOIN shipments s ON o.id = s.order_id
            LEFT JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            ORDER BY o.created_at DESC
            LIMIT 10
        ");
        $recentOrders = $recentStmt->fetchAll();

        Response::json([
            'sellerCount' => max(1, $sellerCount),
            'totalOrders' => $totalOrders,
            'totalShipments' => $totalShipments,
            'openNdr' => $openNdr,
            'totalMarginEarned' => round($totalMarginEarned, 2),
            'totalWalletBalance' => round($totalWalletBalance, 2),
            'recentOrders' => array_map(function($o) {
                return [
                    'id' => $o['id'],
                    'orderNumber' => $o['order_number'],
                    'itemDescription' => $o['item_description'],
                    'status' => $o['status'],
                    'buyerAddress' => ['contactName' => $o['buyer_name'] ?? 'Buyer', 'city' => $o['buyer_city'] ?? 'City'],
                    'shipment' => $o['awb_number'] ? [
                        'status' => $o['shipment_status'],
                        'awbNumber' => $o['awb_number'],
                        'courier' => ['name' => $o['courier_name']]
                    ] : null,
                    'createdAt' => $o['created_at']
                ];
            }, $recentOrders),
            'courierSla' => [
                ['courierName' => 'Delhivery Surface', 'meetingSla' => 78, 'slaAtRisk' => 14, 'missedSla' => 8, 'slaPercentage' => 94.2],
                ['courierName' => 'Delhivery Express', 'meetingSla' => 88, 'slaAtRisk' => 8, 'missedSla' => 4, 'slaPercentage' => 96.5],
                ['courierName' => 'DTDC Priority', 'meetingSla' => 85, 'slaAtRisk' => 9, 'missedSla' => 6, 'slaPercentage' => 93.8]
            ]
        ]);
    }

    public static function listSellers(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT u.*, w.balance as wallet_balance,
                   (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'SELLER'
            ORDER BY u.created_at DESC
        ");
        $users = $stmt->fetchAll();

        Response::json([
            'users' => array_map(function($u) {
                return [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'email' => $u['email'],
                    'phone' => $u['phone'],
                    'businessName' => $u['business_name'],
                    'kycStatus' => $u['kyc_status'],
                    'wallet' => ['balance' => (float)($u['wallet_balance'] ?? 0)],
                    '_count' => ['orders' => (int)$u['order_count']],
                    'createdAt' => $u['created_at']
                ];
            }, $users),
            'sellers' => array_map(function($u) {
                return [
                    'id' => $u['id'],
                    'businessName' => $u['business_name'],
                    'name' => $u['name'],
                    'phone' => $u['phone'],
                    'kycStatus' => 'KYC_' . $u['kyc_status'],
                    'walletBalance' => (float)($u['wallet_balance'] ?? 0),
                    'orderCount' => (int)$u['order_count']
                ];
            }, $users)
        ]);
    }

    public static function getSellerDetail(string $userId): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT u.*, w.balance as wallet_balance
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Seller not found', 404);
        }

        $ordStmt = $db->prepare("
            SELECT o.*, s.awb_number, s.status as shipment_status, s.rate_charged, c.name as courier_name,
                   b.contact_name as buyer_name, b.city as buyer_city
            FROM orders o
            LEFT JOIN shipments s ON o.id = s.order_id
            LEFT JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ");
        $ordStmt->execute([$userId]);
        $orders = $ordStmt->fetchAll();

        Response::json([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'businessName' => $user['business_name'],
                'kycStatus' => $user['kyc_status'],
                'walletBalance' => (float)($user['wallet_balance'] ?? 0),
                'role' => $user['role'],
                'createdAt' => $user['created_at'],
                'orderCount' => count($orders)
            ],
            'orders' => array_map(function($o) {
                return [
                    'id' => $o['id'],
                    'orderNumber' => $o['order_number'],
                    'awbNumber' => $o['awb_number'],
                    'status' => $o['status'],
                    'weight' => (float)$o['weight'],
                    'billableWeight' => (float)$o['billable_weight'],
                    'declaredValue' => (float)$o['declared_value'],
                    'buyerAddress' => ['contactName' => $o['buyer_name'] ?? 'Buyer', 'city' => $o['buyer_city'] ?? 'City'],
                    'shipment' => $o['awb_number'] ? [
                        'status' => $o['shipment_status'],
                        'awbNumber' => $o['awb_number'],
                        'rateCharged' => (float)$o['rate_charged'],
                        'courier' => ['name' => $o['courier_name']]
                    ] : null,
                    'createdAt' => $o['created_at']
                ];
            }, $orders)
        ]);
    }

    public static function adjustWallet(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $userId = $data['userId'] ?? '';
        $amount = (float)($data['amount'] ?? 0);
        $reason = trim($data['reason'] ?? 'Admin Adjustment');

        if (empty($userId) || $amount == 0) Response::error('User ID and non-zero amount are required', 400);

        if ($amount > 0) {
            WalletController::creditWallet($userId, $amount, $reason);
        } else {
            // Debit adjustment
            $db = Database::getConnection();
            $db->prepare("UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?")->execute([$amount, $userId]);
        }

        $db = Database::getConnection();
        $balStmt = $db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
        $balStmt->execute([$userId]);

        Response::json(['balance' => (float)$balStmt->fetchColumn()]);
    }

    public static function listCouriers(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();
        $couriers = $db->query("SELECT * FROM couriers ORDER BY created_at ASC")->fetchAll();
        if (empty($couriers)) {
            $db->exec("INSERT IGNORE INTO `couriers` (`id`, `name`, `code`, `logo_color`, `active`, `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`, `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`) VALUES 
              ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface', 'DELHIVERY_SURFACE', '#000000', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
              ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express', 'DELHIVERY_EXPRESS', '#e11d48', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
              ('c1000000-0000-0000-0000-000000000003', 'Shipmozo Standard', 'SHIPMOZO_STD', '#2563eb', 1, 39.00, 22.00, 1.40, 4.20, 3, 6, 7.00),
              ('c1000000-0000-0000-0000-000000000004', 'BlueDart Express', 'BLUEDART_EXP', '#0284c7', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50)");
            $couriers = $db->query("SELECT * FROM couriers ORDER BY created_at ASC")->fetchAll();
        }

        Response::json(['couriers' => array_map(function($c) {
            return [
                'id' => $c['id'],
                'name' => $c['name'],
                'code' => $c['code'],
                'active' => (bool)$c['active'],
                'baseRatePerKg' => (float)$c['base_rate_per_kg'],
                'codChargeFlat' => (float)$c['cod_charge_flat'],
                'codChargePercent' => (float)$c['cod_charge_percent'],
                'rating' => (float)$c['rating'],
                'etaMinDays' => (int)$c['eta_min_days'],
                'etaMaxDays' => (int)$c['eta_max_days'],
                'rtoRiskPercent' => (float)$c['rto_risk_percent']
            ];
        }, $couriers)]);
    }

    public static function updateCourier(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $id = $data['id'] ?? '';

        if (empty($id)) Response::error('Courier ID required', 400);

        $db = Database::getConnection();
        if (isset($data['active'])) {
            $db->prepare("UPDATE couriers SET active = ? WHERE id = ?")->execute([$data['active'] ? 1 : 0, $id]);
        }
        if (isset($data['baseRatePerKg'])) {
            $db->prepare("UPDATE couriers SET base_rate_per_kg = ? WHERE id = ?")->execute([(float)$data['baseRatePerKg'], $id]);
        }

        $courier = $db->prepare("SELECT * FROM couriers WHERE id = ?");
        $courier->execute([$id]);
        Response::json(['courier' => $courier->fetch()]);
    }

    public static function listNdrRtoOversight(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT s.awb_number, s.status, c.name as courier_name, u.business_name, u.name as user_name, n.reason
            FROM shipments s
            JOIN couriers c ON s.courier_id = c.id
            JOIN orders o ON s.order_id = o.id
            JOIN users u ON o.user_id = u.id
            LEFT JOIN ndr_records n ON n.shipment_id = s.id
            WHERE s.status IN ('NDR', 'RTO_INITIATED', 'RTO_DELIVERED')
            ORDER BY s.updated_at DESC
        ");
        $rows = $stmt->fetchAll();

        Response::json([
            'shipments' => array_map(function($r) {
                return [
                    'id' => $r['awb_number'],
                    'awbNumber' => $r['awb_number'],
                    'status' => $r['status'],
                    'courier' => ['name' => $r['courier_name']],
                    'order' => ['user' => ['businessName' => $r['business_name'] ?: $r['user_name'], 'name' => $r['user_name']]],
                    'ndrRecords' => $r['reason'] ? [['reason' => $r['reason']]] : []
                ];
            }, $rows)
        ]);
    }

    public static function getCommissionRules(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $rules = $db->query("
            SELECT r.*, c.name as courier_name
            FROM commission_rules r
            LEFT JOIN couriers c ON r.courier_id = c.id
            ORDER BY r.created_at DESC
        ")->fetchAll();

        if (empty($rules)) {
            $db->exec("INSERT IGNORE INTO commission_rules (id, courier_id, min_weight, max_weight, margin_type, margin_value, created_at) VALUES ('r1000000-0000-0000-0000-000000000001', NULL, 0.00, 1000.00, 'PERCENT', 10.00, NOW())");
            $rules = $db->query("
                SELECT r.*, c.name as courier_name
                FROM commission_rules r
                LEFT JOIN couriers c ON r.courier_id = c.id
                ORDER BY r.created_at DESC
            ")->fetchAll();
        }

        Response::json(['rules' => array_map(function($r) {
            return [
                'id' => $r['id'],
                'courierId' => $r['courier_id'],
                'courierName' => $r['courier_name'] ?? 'All Couriers (Default)',
                'minWeight' => (float)$r['min_weight'],
                'maxWeight' => (float)$r['max_weight'],
                'marginType' => $r['margin_type'],
                'marginValue' => (float)$r['margin_value'],
                'createdAt' => $r['created_at']
            ];
        }, $rules)]);
    }

    public static function setCommissionRule(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();

        $marginType = strtoupper($data['marginType'] ?? 'PERCENT');
        $marginValue = (float)($data['marginValue'] ?? 10.0);
        $courierId = !empty($data['courierId']) ? $data['courierId'] : null;

        $db = Database::getConnection();
        $id = Response::generateUuid();

        $stmt = $db->prepare("
            INSERT INTO commission_rules (id, courier_id, min_weight, max_weight, margin_type, margin_value, created_at)
            VALUES (?, ?, 0, 1000, ?, ?, NOW())
        ");
        $stmt->execute([$id, $courierId, $marginType, $marginValue]);

        Response::json(['success' => true, 'id' => $id]);
    }

    public static function deleteCommissionRule(string $id): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();
        $db->prepare("DELETE FROM commission_rules WHERE id = ?")->execute([$id]);
        Response::json(['ok' => true]);
    }

    public static function listAllShipments(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT s.*, o.order_number, c.name as courier_name, b.contact_name as buyer_name, b.city as buyer_city
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            LEFT JOIN couriers c ON s.courier_id = c.id
            LEFT JOIN addresses b ON o.buyer_address_id = b.id
            ORDER BY s.created_at DESC
            LIMIT 100
        ");
        $shipments = $stmt->fetchAll();
        Response::json(['shipments' => $shipments ?: []]);
    }

    public static function listRechargeRequests(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.business_name
            FROM wallet_recharges r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT 100
        ");
        $rows = $stmt->fetchAll();

        Response::json([
            'recharges' => array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'userId' => $r['user_id'],
                    'userName' => $r['user_name'],
                    'userEmail' => $r['user_email'],
                    'userPhone' => $r['user_phone'],
                    'businessName' => $r['business_name'] ?? 'Seller',
                    'amount' => (float)$r['amount'],
                    'paymentMethod' => $r['payment_method'],
                    'upiId' => $r['upi_id'],
                    'utrNumber' => $r['utr_number'],
                    'status' => $r['status'],
                    'adminNotes' => $r['admin_notes'],
                    'createdAt' => $r['created_at'],
                    'reviewedAt' => $r['reviewed_at']
                ];
            }, $rows)
        ]);
    }

    public static function approveRechargeRequest(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $requestId = trim($data['requestId'] ?? '');

        if (empty($requestId)) {
            Response::error('Request ID is required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM wallet_recharges WHERE id = ? FOR UPDATE");
        $stmt->execute([$requestId]);
        $recharge = $stmt->fetch();

        if (!$recharge) {
            Response::error('Recharge request not found', 404);
        }

        if ($recharge['status'] === 'APPROVED') {
            Response::error('Recharge request already approved', 400);
        }

        $db->beginTransaction();
        try {
            $db->prepare("UPDATE wallet_recharges SET status = 'APPROVED', reviewed_at = NOW() WHERE id = ?")->execute([$requestId]);
            $db->commit();

            // Credit the wallet now that admin approved
            $amount = (float)$recharge['amount'];
            WalletController::creditWallet($recharge['user_id'], $amount, "UPI Recharge Approved (Ref: {$requestId})", $requestId);

            Response::json([
                'success' => true,
                'status' => 'APPROVED',
                'message' => "Recharge of ₹{$amount} approved and credited to wallet."
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to approve recharge: ' . $e->getMessage(), 500);
        }
    }

    public static function rejectRechargeRequest(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $requestId = trim($data['requestId'] ?? '');
        $notes = trim($data['reason'] ?? $data['notes'] ?? 'Rejected by Admin');

        if (empty($requestId)) {
            Response::error('Request ID is required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE wallet_recharges SET status = 'REJECTED', admin_notes = ?, reviewed_at = NOW() WHERE id = ? AND status = 'UNDER_REVIEW'");
        $stmt->execute([$notes, $requestId]);

        Response::json([
            'success' => true,
            'status' => 'REJECTED',
            'message' => 'Recharge request marked as rejected.'
        ]);
    }

    public static function getSettings(): void {
        $settingsFile = __DIR__ . '/../config/settings.json';
        $defaults = [
            'upiId' => 'hetex@icici',
            'payeeName' => 'HetEx Logistics',
            'helplineNumber' => '+91 98765 43210',
            'helplineHours' => 'Mon - Sat: 9:00 AM - 8:00 PM IST',
            'supportEmail' => 'support@hetex.in'
        ];

        try {
            $db = Database::getConnection();
            $stmt = $db->query("SELECT setting_key, setting_value FROM platform_settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            if (!empty($rows)) {
                if (isset($rows['upi_id'])) $defaults['upiId'] = $rows['upi_id'];
                if (isset($rows['payee_name'])) $defaults['payeeName'] = $rows['payee_name'];
                if (isset($rows['helpline_number'])) $defaults['helplineNumber'] = $rows['helpline_number'];
                if (isset($rows['helpline_hours'])) $defaults['helplineHours'] = $rows['helpline_hours'];
                if (isset($rows['support_email'])) $defaults['supportEmail'] = $rows['support_email'];
            }
        } catch (Throwable $e) {
            if (file_exists($settingsFile)) {
                $json = json_decode(file_get_contents($settingsFile), true);
                if (is_array($json)) {
                    $defaults = array_merge($defaults, $json);
                }
            }
        }

        Response::json(['settings' => $defaults]);
    }

    public static function updateSettings(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();

        $settingsFile = __DIR__ . '/../config/settings.json';
        $current = [
            'upiId' => 'hetex@icici',
            'payeeName' => 'HetEx Logistics',
            'helplineNumber' => '+91 98765 43210',
            'helplineHours' => 'Mon - Sat: 9:00 AM - 8:00 PM IST',
            'supportEmail' => 'support@hetex.in'
        ];

        if (file_exists($settingsFile)) {
            $existing = json_decode(file_get_contents($settingsFile), true);
            if (is_array($existing)) $current = array_merge($current, $existing);
        }

        if (isset($data['upiId']) && trim($data['upiId']) !== '') $current['upiId'] = trim($data['upiId']);
        if (isset($data['payeeName']) && trim($data['payeeName']) !== '') $current['payeeName'] = trim($data['payeeName']);
        if (isset($data['helplineNumber']) && trim($data['helplineNumber']) !== '') $current['helplineNumber'] = trim($data['helplineNumber']);
        if (isset($data['helplineHours']) && trim($data['helplineHours']) !== '') $current['helplineHours'] = trim($data['helplineHours']);
        if (isset($data['supportEmail']) && trim($data['supportEmail']) !== '') $current['supportEmail'] = trim($data['supportEmail']);

        @file_put_contents($settingsFile, json_encode($current, JSON_PRETTY_PRINT));

        try {
            $db = Database::getConnection();
            $db->exec("CREATE TABLE IF NOT EXISTS platform_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $map = [
                'upi_id' => $current['upiId'],
                'payee_name' => $current['payeeName'],
                'helpline_number' => $current['helplineNumber'],
                'helpline_hours' => $current['helplineHours'],
                'support_email' => $current['supportEmail']
            ];

            $stmt = $db->prepare("INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            foreach ($map as $k => $v) {
                $stmt->execute([$k, $v]);
            }
        } catch (Throwable $e) {}

        Response::json([
            'success' => true,
            'settings' => $current,
            'message' => 'Platform settings updated successfully!'
        ]);
    }
}
