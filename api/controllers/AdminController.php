<?php
/**
 * Admin Controller - Commission Rules, User Management & System Stats
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class AdminController {

    public static function getStats(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $userCount = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $orderCount = $db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $totalShipments = $db->query("SELECT COUNT(*) FROM shipments")->fetchColumn();
        $totalMargin = $db->query("SELECT SUM(margin_earned) FROM shipments")->fetchColumn() ?: 0.00;

        Response::json([
            'totalUsers' => (int)$userCount,
            'totalOrders' => (int)$orderCount,
            'totalShipments' => (int)$totalShipments,
            'totalRevenue' => round((float)$totalMargin, 2)
        ]);
    }

    public static function listUsers(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT u.*, w.balance as wallet_balance
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
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
                    'role' => $u['role'],
                    'businessName' => $u['business_name'],
                    'kycStatus' => $u['kyc_status'],
                    'walletBalance' => (float)($u['wallet_balance'] ?? 0),
                    'createdAt' => $u['created_at']
                ];
            }, $users)
        ]);
    }

    public static function getCommissionRules(): void {
        AuthMiddleware::requireAdmin();
        $db = Database::getConnection();

        $rules = $db->query("SELECT * FROM commission_rules ORDER BY created_at DESC")->fetchAll();
        Response::json(['rules' => $rules]);
    }

    public static function setCommissionRule(): void {
        AuthMiddleware::requireAdmin();
        $data = Response::getJsonInput();

        $marginType = strtoupper($data['marginType'] ?? 'PERCENT');
        $marginValue = (float)($data['marginValue'] ?? 10.0);

        $db = Database::getConnection();
        $id = Response::generateUuid();

        $stmt = $db->prepare("
            INSERT INTO commission_rules (id, courier_id, min_weight, max_weight, margin_type, margin_value, created_at)
            VALUES (?, NULL, 0, 1000, ?, ?, NOW())
        ");
        $stmt->execute([$id, $marginType, $marginValue]);

        Response::json(['success' => true, 'id' => $id]);
    }
}
