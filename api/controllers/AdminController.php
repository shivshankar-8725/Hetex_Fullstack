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
                    'userCode' => $u['user_code'] ?? null,
                    'name' => $u['name'],
                    'email' => $u['email'],
                    'phone' => $u['phone'],
                    'businessName' => $u['business_name'],
                    'kycStatus' => $u['kyc_status'],
                    'rateMarginPercent' => $u['rate_margin_percent'] !== null ? (float)$u['rate_margin_percent'] : null,
                    'rateMarginType' => $u['rate_margin_type'] ?? 'PERCENT',
                    'wallet' => ['balance' => (float)($u['wallet_balance'] ?? 0)],
                    '_count' => ['orders' => (int)$u['order_count']],
                    'createdAt' => $u['created_at']
                ];
            }, $users),
            'sellers' => array_map(function($u) {
                return [
                    'id' => $u['id'],
                    'userCode' => $u['user_code'] ?? null,
                    'businessName' => $u['business_name'],
                    'name' => $u['name'],
                    'phone' => $u['phone'],
                    'kycStatus' => 'KYC_' . $u['kyc_status'],
                    'rateMarginPercent' => $u['rate_margin_percent'] !== null ? (float)$u['rate_margin_percent'] : null,
                    'rateMarginType' => $u['rate_margin_type'] ?? 'PERCENT',
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
                'userCode' => $user['user_code'] ?? null,
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'businessName' => $user['business_name'],
                'kycStatus' => $user['kyc_status'],
                'rateMarginPercent' => $user['rate_margin_percent'] !== null ? (float)$user['rate_margin_percent'] : null,
                'rateMarginType' => $user['rate_margin_type'] ?? 'PERCENT',
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

    private static function ensureUserMarginColumns(PDO $db): void {
        try { $db->exec("ALTER TABLE `users` ADD COLUMN `rate_margin_percent` DECIMAL(5,2) NULL DEFAULT NULL AFTER `role`"); } catch (Throwable $t) {}
        try { $db->exec("ALTER TABLE `users` ADD COLUMN `rate_margin_type` VARCHAR(16) NOT NULL DEFAULT 'PERCENT' AFTER `rate_margin_percent`"); } catch (Throwable $t) {}
    }

    public static function adjustWallet(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $userId = $data['userId'] ?? '';
        $amount = (float)($data['amount'] ?? 0);
        $reason = trim($data['reason'] ?? 'Admin Adjustment');

        if (empty($userId)) Response::error('User ID is required', 400);

        // Check if admin passed rate margin update along with or instead of wallet adjustment
        if (isset($data['marginPercent']) || isset($data['rateMarginPercent'])) {
            $mVal = $data['marginPercent'] ?? $data['rateMarginPercent'];
            $marginPercent = ($mVal !== '' && $mVal !== null) ? (float)$mVal : null;
            $marginType = strtoupper($data['marginType'] ?? $data['rateMarginType'] ?? 'PERCENT');
            $db = Database::getConnection();
            self::ensureUserMarginColumns($db);
            $db->prepare("UPDATE users SET rate_margin_percent = ?, rate_margin_type = ? WHERE id = ?")->execute([$marginPercent, $marginType, $userId]);
            if ($amount == 0) {
                Response::json(['success' => true, 'rateMarginPercent' => $marginPercent, 'rateMarginType' => $marginType, 'message' => 'Rate margin updated successfully']);
                return;
            }
        }

        if ($amount == 0) Response::error('Non-zero amount is required for wallet adjustment', 400);

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
        $newBalance = (float)$balStmt->fetchColumn();

        // Audit log — record every wallet adjustment
        $admin = AuthMiddleware::requireAdmin();
        self::auditLog($admin['userId'], 'WALLET_ADJUSTMENT', 'USER', $userId, [
            'amount' => $amount,
            'reason' => $reason,
            'newBalance' => $newBalance,
        ]);

        Response::json(['balance' => $newBalance]);
    }

    public static function updateUserMargin(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $userId = trim($data['userId'] ?? '');
        $mVal = $data['marginPercent'] ?? $data['rateMarginPercent'] ?? null;
        $marginPercent = ($mVal !== '' && $mVal !== null) ? (float)$mVal : null;
        $marginType = strtoupper($data['marginType'] ?? $data['rateMarginType'] ?? 'PERCENT');

        if (empty($userId)) {
            Response::error('User ID is required', 400);
        }

        if ($marginPercent !== null && $marginPercent < 0) {
            Response::error('Rate margin cannot be negative', 400);
        }

        $db = Database::getConnection();
        self::ensureUserMarginColumns($db);
        $stmt = $db->prepare("UPDATE users SET rate_margin_percent = ?, rate_margin_type = ? WHERE id = ?");
        $stmt->execute([$marginPercent, $marginType, $userId]);

        // Audit log
        $admin = AuthMiddleware::requireAdmin();
        self::auditLog($admin['userId'], 'MARGIN_UPDATED', 'USER', $userId, [
            'marginPercent' => $marginPercent,
            'marginType'    => $marginType,
        ]);

        Response::json([
            'success' => true,
            'userId' => $userId,
            'rateMarginPercent' => $marginPercent,
            'rateMarginType' => $marginType,
            'message' => 'User rate margin updated successfully'
        ]);
    }

    public static function listCouriers(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        // 1. Auto-seed / Auto-heal all 8 standard couriers
        try {
            $db->exec("INSERT IGNORE INTO `couriers` (`id`, `name`, `code`, `logo_color`, `active`, `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`, `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`) VALUES 
              ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface', 'DELHIVERY_SURFACE', '#d90429', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
              ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express', 'DELHIVERY_EXPRESS', '#d90429', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
              ('c1000000-0000-0000-0000-000000000003', 'DTDC Express', 'DTDC_EXP', '#0f2d59', 1, 52.00, 25.00, 1.50, 4.50, 2, 4, 5.50),
              ('c1000000-0000-0000-0000-000000000004', 'Blue Dart Express', 'BLUEDART_EXP', '#065dac', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50),
              ('c1000000-0000-0000-0000-000000000005', 'Ekart Logistics', 'EKART_EXP', '#0062a9', 1, 46.00, 25.00, 1.50, 4.40, 2, 4, 5.00),
              ('c1000000-0000-0000-0000-000000000006', 'Shadowfax Technologies', 'SHADOWFAX_EXP', '#008d96', 1, 44.00, 25.00, 1.50, 4.20, 2, 5, 6.00),
              ('c1000000-0000-0000-0000-000000000007', 'Xpressbees Logistics', 'XPRESSBEES_EXP', '#e65100', 1, 45.00, 25.00, 1.50, 4.30, 2, 4, 5.80),
              ('c1000000-0000-0000-0000-000000000008', 'Amazon Shipping', 'AMAZON_SHIPPING', '#ea580c', 1, 58.00, 30.00, 1.60, 4.60, 1, 3, 4.00)");
            
            // Remove obsolete dummy SHIPMOZO_STD courier
            $db->exec("DELETE FROM `couriers` WHERE `code` = 'SHIPMOZO_STD'");
        } catch (\Throwable $e) {}

        $couriers = $db->query("SELECT * FROM couriers WHERE code != 'SHIPMOZO_STD' ORDER BY rating DESC, base_rate_per_kg ASC")->fetchAll();

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
        $admin = AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $id = $data['id'] ?? '';

        $db = Database::getConnection();

        // Support bulk activate / deactivate all couriers
        if ($id === 'ALL' || !empty($data['all'])) {
            $activeVal = (!empty($data['active']) && $data['active'] !== '0' && $data['active'] !== false) ? 1 : 0;
            $db->prepare("UPDATE couriers SET active = ? WHERE code != 'SHIPMOZO_STD'")->execute([$activeVal]);
            self::auditLog($admin['userId'], 'COURIER_BULK_UPDATED', 'COURIER', 'ALL', ['active' => $activeVal]);
            Response::json(['success' => true, 'message' => 'All couriers updated', 'active' => $activeVal]);
            return;
        }

        if (empty($id)) Response::error('Courier ID required', 400);

        if (isset($data['active'])) {
            $activeVal = (!empty($data['active']) && $data['active'] !== '0' && $data['active'] !== false) ? 1 : 0;
            $db->prepare("UPDATE couriers SET active = ? WHERE id = ? OR code = ?")->execute([$activeVal, $id, $id]);
        }
        if (isset($data['baseRatePerKg'])) {
            $db->prepare("UPDATE couriers SET base_rate_per_kg = ? WHERE id = ? OR code = ?")->execute([(float)$data['baseRatePerKg'], $id, $id]);
        }

        self::auditLog($admin['userId'], 'COURIER_UPDATED', 'COURIER', $id, $data);

        $courier = $db->prepare("SELECT * FROM couriers WHERE id = ? OR code = ?");
        $courier->execute([$id, $id]);
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
        $admin = AuthMiddleware::requireAdmin();
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

        self::auditLog($admin['userId'], 'COMMISSION_RULE_SET', 'COMMISSION_RULE', $id, [
            'marginType' => $marginType,
            'marginValue' => $marginValue,
            'courierId' => $courierId
        ]);

        Response::json(['success' => true, 'id' => $id]);
    }

    public static function deleteCommissionRule(string $id): void {
        $admin = AuthMiddleware::requireAdmin();
        $db = Database::getConnection();
        $db->prepare("DELETE FROM commission_rules WHERE id = ?")->execute([$id]);
        self::auditLog($admin['userId'], 'COMMISSION_RULE_DELETED', 'COMMISSION_RULE', $id);
        Response::json(['ok' => true]);
    }

    public static function updateCommissionRule(string $id): void {
        $admin = AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();
        $db = Database::getConnection();

        // Verify rule exists
        $stmt = $db->prepare("SELECT * FROM commission_rules WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            Response::error('Commission rule not found', 404);
        }

        $marginType = isset($data['marginType']) ? strtoupper($data['marginType']) : $existing['margin_type'];
        $marginValue = isset($data['marginValue']) ? (float)$data['marginValue'] : (float)$existing['margin_value'];
        $courierId = array_key_exists('courierId', $data) ? (!empty($data['courierId']) ? $data['courierId'] : null) : $existing['courier_id'];
        $minWeight = isset($data['minWeight']) ? (float)$data['minWeight'] : (float)$existing['min_weight'];
        $maxWeight = isset($data['maxWeight']) ? (float)$data['maxWeight'] : (float)$existing['max_weight'];

        $update = $db->prepare("UPDATE commission_rules SET courier_id = ?, min_weight = ?, max_weight = ?, margin_type = ?, margin_value = ? WHERE id = ?");
        $update->execute([$courierId, $minWeight, $maxWeight, $marginType, $marginValue, $id]);

        self::auditLog($admin['userId'], 'COMMISSION_RULE_UPDATED', 'COMMISSION_RULE', $id, [
            'marginType' => $marginType,
            'marginValue' => $marginValue,
            'courierId' => $courierId,
            'minWeight' => $minWeight,
            'maxWeight' => $maxWeight
        ]);

        Response::json(['success' => true, 'id' => $id]);
    }

    public static function listAllShipments(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT s.*, o.order_number, o.user_id, COALESCE(o.user_code, u.user_code) as user_code,
                   u.business_name, u.name as seller_name,
                   c.name as courier_name, b.contact_name as buyer_name, b.city as buyer_city
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            LEFT JOIN users u ON o.user_id = u.id
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

        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS `wallet_recharges` (
                  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                  `user_id` VARCHAR(36) NOT NULL,
                  `user_code` VARCHAR(16) NULL,
                  `amount` DECIMAL(10,2) NOT NULL,
                  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'UPI',
                  `upi_id` VARCHAR(128) NULL,
                  `utr_number` VARCHAR(64) NULL,
                  `status` ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'UNDER_REVIEW',
                  `admin_notes` TEXT NULL,
                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `reviewed_at` DATETIME NULL,
                  INDEX `idx_recharge_user` (`user_id`),
                  INDEX `idx_recharge_status` (`status`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            // Auto add user_code if missing
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `id`"); } catch (Throwable $t) {}
            try { $db->exec("ALTER TABLE `wallet_recharges` ADD COLUMN `user_code` VARCHAR(16) NULL AFTER `user_id`"); } catch (Throwable $t) {}
        } catch (Throwable $t) {}

        // Check if table is empty; if so, auto-seed the initial pending recharge request to match local dev
        try {
            $cnt = (int)$db->query("SELECT COUNT(*) FROM `wallet_recharges`")->fetchColumn();
            if ($cnt === 0) {
                $firstUser = $db->query("SELECT id, user_code FROM users WHERE role = 'SELLER' ORDER BY created_at ASC LIMIT 1")->fetch();
                if (!$firstUser) {
                    $firstUser = $db->query("SELECT id, user_code FROM users ORDER BY created_at ASC LIMIT 1")->fetch();
                }
                $seedUid = $firstUser['id'] ?? 'usr_seller_1';
                $seedUcode = $firstUser['user_code'] ?? 'HET000002';
                $db->prepare("
                    INSERT INTO `wallet_recharges` (id, user_id, user_code, amount, payment_method, upi_id, utr_number, status, created_at)
                    VALUES ('HTX-UPIR-1001', ?, ?, 2500.00, 'UPI', 'hetex@icici', '429182749102', 'UNDER_REVIEW', DATE_SUB(NOW(), INTERVAL 2 HOUR))
                ")->execute([$seedUid, $seedUcode]);
            }
        } catch (Throwable $t) {}

        // Safe query checking if user_code column exists in users table
        $hasUserCode = false;
        try {
            $c = $db->query("SHOW COLUMNS FROM `users` LIKE 'user_code'")->fetch();
            if ($c) $hasUserCode = true;
        } catch (Throwable $t) {}
        $userCodeField = $hasUserCode ? "u.user_code," : "NULL as user_code,";

        $rows = [];
        try {
            $stmt = $db->query("
                SELECT r.*, {$userCodeField} u.name as user_name, u.email as user_email, u.phone as user_phone, u.business_name
                FROM wallet_recharges r
                LEFT JOIN users u ON r.user_id = u.id
                ORDER BY r.created_at DESC
                LIMIT 100
            ");
            $rows = $stmt->fetchAll() ?: [];
        } catch (Throwable $e) {
            try {
                $stmt = $db->query("SELECT * FROM wallet_recharges ORDER BY created_at DESC LIMIT 100");
                $rows = $stmt->fetchAll() ?: [];
            } catch (Throwable $e2) {
                $rows = [];
            }
        }

        Response::json([
            'recharges' => array_map(function($r) {
                $uName = $r['user_name'] ?? $r['userName'] ?? 'Seller';
                $bName = $r['business_name'] ?? $r['businessName'] ?? $uName;
                $uCode = $r['user_code'] ?? $r['userCode'] ?? ('HET' . substr(preg_replace('/\D/', '', (string)($r['user_id'] ?? '1')), -6));
                return [
                    'id' => $r['id'],
                    'userId' => $r['user_id'],
                    'user_id' => $r['user_id'],
                    'userCode' => $uCode,
                    'user_code' => $uCode,
                    'userName' => $uName,
                    'user_name' => $uName,
                    'userEmail' => $r['user_email'] ?? '',
                    'userPhone' => $r['user_phone'] ?? '',
                    'businessName' => $bName,
                    'business_name' => $bName,
                    'amount' => (float)$r['amount'],
                    'paymentMethod' => $r['payment_method'] ?? 'UPI',
                    'upiId' => $r['upi_id'] ?? 'hetex@icici',
                    'utrNumber' => $r['utr_number'] ?? ($r['utrNumber'] ?? ''),
                    'utr_number' => $r['utr_number'] ?? ($r['utrNumber'] ?? ''),
                    'status' => $r['status'] ?? 'UNDER_REVIEW',
                    'adminNotes' => $r['admin_notes'] ?? null,
                    'createdAt' => $r['created_at'],
                    'reviewedAt' => $r['reviewed_at'] ?? null,
                    'user' => [
                        'name' => $uName,
                        'businessName' => $bName,
                        'email' => $r['user_email'] ?? '',
                        'phone' => $r['user_phone'] ?? '',
                        'userCode' => $uCode
                    ]
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

            // Audit log
            $admin = AuthMiddleware::requireAdmin();
            self::auditLog($admin['userId'], 'RECHARGE_APPROVED', 'RECHARGE', $requestId, [
                'userId' => $recharge['user_id'],
                'amount' => $amount,
            ]);

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

        // Fetch recharge details for audit before updating
        $rStmt = $db->prepare("SELECT user_id, amount FROM wallet_recharges WHERE id = ?");
        $rStmt->execute([$requestId]);
        $rInfo = $rStmt->fetch();

        $stmt = $db->prepare("UPDATE wallet_recharges SET status = 'REJECTED', admin_notes = ?, reviewed_at = NOW() WHERE id = ? AND status = 'UNDER_REVIEW'");
        $stmt->execute([$notes, $requestId]);

        // Audit log
        $admin = AuthMiddleware::requireAdmin();
        self::auditLog($admin['userId'], 'RECHARGE_REJECTED', 'RECHARGE', $requestId, [
            'userId' => $rInfo['user_id'] ?? null,
            'amount' => $rInfo ? (float)$rInfo['amount'] : null,
            'reason' => $notes,
        ]);

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

    // =========================================================================
    // AUDIT LOG (TASK-P1-01)
    // =========================================================================

    /**
     * Record an admin action to the audit log.
     * Call this from every admin write method.
     *
     * @param string $adminId    UUID of the admin performing the action
     * @param string $action     Action name, e.g. WALLET_ADJUSTMENT, RECHARGE_APPROVED
     * @param string $targetType Entity type, e.g. USER, SHIPMENT, COURIER
     * @param string|null $targetId UUID of the entity affected
     * @param array  $details    Additional context (amount, old/new values, etc.)
     */
    public static function auditLog(
        string $adminId,
        string $action,
        string $targetType,
        ?string $targetId = null,
        array $details = []
    ): void {
        try {
            $db = Database::getConnection();

            // Auto-create table on first use (no migration script required)
            $db->exec("
                CREATE TABLE IF NOT EXISTS `audit_logs` (
                    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                    `admin_id` VARCHAR(36) NOT NULL,
                    `action` VARCHAR(100) NOT NULL,
                    `target_type` VARCHAR(50) NOT NULL,
                    `target_id` VARCHAR(36) NULL,
                    `details` JSON NULL,
                    `ip_address` VARCHAR(45) NULL,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_audit_admin` (`admin_id`),
                    INDEX `idx_audit_action` (`action`),
                    INDEX `idx_audit_created` (`created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");

            $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
                ?? $_SERVER['REMOTE_ADDR']
                ?? null;

            $db->prepare("
                INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ")->execute([
                Response::generateUuid(),
                $adminId,
                $action,
                $targetType,
                $targetId,
                !empty($details) ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
                $ip ? substr($ip, 0, 45) : null,
            ]);
        } catch (Throwable $e) {
            error_log("[AuditLog] Failed to record audit event {$action}: " . $e->getMessage());
        }
    }

    /**
     * GET /admin/audit-logs
     * Returns paginated audit log entries with optional filters.
     */
    public static function listAuditLogs(): void {
        $admin = AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        // Ensure table exists
        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS `audit_logs` (
                    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                    `admin_id` VARCHAR(36) NOT NULL,
                    `action` VARCHAR(100) NOT NULL,
                    `target_type` VARCHAR(50) NOT NULL,
                    `target_id` VARCHAR(36) NULL,
                    `details` JSON NULL,
                    `ip_address` VARCHAR(45) NULL,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_audit_admin` (`admin_id`),
                    INDEX `idx_audit_action` (`action`),
                    INDEX `idx_audit_created` (`created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        } catch (Throwable $t) {}

        $page    = max(1, (int)($_GET['page'] ?? 1));
        $limit   = min(100, max(10, (int)($_GET['limit'] ?? 50)));
        $offset  = ($page - 1) * $limit;
        $action  = trim($_GET['action'] ?? '');
        $fromDate = $_GET['from'] ?? '';
        $toDate   = $_GET['to'] ?? '';

        $where = [];
        $params = [];

        if (!empty($action)) {
            $where[] = 'al.action = ?';
            $params[] = strtoupper($action);
        }
        if (!empty($fromDate)) {
            $where[] = 'DATE(al.created_at) >= ?';
            $params[] = $fromDate;
        }
        if (!empty($toDate)) {
            $where[] = 'DATE(al.created_at) <= ?';
            $params[] = $toDate;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $db->prepare("SELECT COUNT(*) FROM audit_logs al $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT al.*, u.name as admin_name, u.email as admin_email
            FROM audit_logs al
            LEFT JOIN users u ON al.admin_id = u.id
            $whereClause
            ORDER BY al.created_at DESC
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        Response::json([
            'logs' => array_map(function($l) {
                return [
                    'id'         => $l['id'],
                    'adminName'  => $l['admin_name'] ?? 'Admin',
                    'adminEmail' => $l['admin_email'] ?? '',
                    'action'     => $l['action'],
                    'targetType' => $l['target_type'],
                    'targetId'   => $l['target_id'],
                    'details'    => $l['details'] ? json_decode($l['details'], true) : null,
                    'ipAddress'  => $l['ip_address'],
                    'createdAt'  => $l['created_at'],
                ];
            }, $logs),
            'pagination' => [
                'total'   => $total,
                'page'    => $page,
                'limit'   => $limit,
                'pages'   => (int)ceil($total / $limit),
            ],
        ]);
    }
}
