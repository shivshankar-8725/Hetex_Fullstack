<?php
/**
 * Extra Controller - Channels, Disputes, COD Remittance, Notifications & Analytics
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class ExtraController {

    // --- CHANNELS (Shopify, WooCommerce, Amazon, Flipkart) ---
    public static function listChannels(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM marketplace_connections WHERE user_id = ? ORDER BY connected_at DESC");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        Response::json([
            'connections' => array_map(function($c) {
                return [
                    'id' => $c['id'],
                    'platform' => $c['platform'],
                    'storeName' => $c['store_name'],
                    'connected' => (bool)$c['connected'],
                    'connectedAt' => $c['connected_at']
                ];
            }, $rows)
        ]);
    }

    public static function connectChannel(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $platform = strtoupper($data['platform'] ?? 'SHOPIFY');
        $storeName = trim($data['storeName'] ?? 'My Store');

        $db = Database::getConnection();
        $id = Response::generateUuid();

        $db->prepare("
            INSERT INTO marketplace_connections (id, user_id, platform, store_name, connected, connected_at)
            VALUES (?, ?, ?, ?, 1, NOW())
        ")->execute([$id, $auth['userId'], $platform, $storeName]);

        Response::json([
            'connection' => [
                'id' => $id,
                'platform' => $platform,
                'storeName' => $storeName,
                'connected' => true
            ]
        ], 201);
    }

    // --- DISPUTES ---
    public static function listDisputes(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT d.*, s.awb_number, o.order_number, c.name as courier_name
            FROM weight_disputes d
            JOIN shipments s ON d.shipment_id = s.id
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            WHERE o.user_id = ?
            ORDER BY d.created_at DESC
        ");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        Response::json(['disputes' => $rows]);
    }

    // --- COD REMITTANCES ---
    public static function listRemittances(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT r.*, s.awb_number, o.order_number, c.name as courier_name
            FROM cod_remittances r
            JOIN shipments s ON r.shipment_id = s.id
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            WHERE o.user_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        $total = 0; $pending = 0; $settled = 0;
        foreach ($rows as $r) {
            $amt = (float)$r['amount'];
            $total += $amt;
            if ($r['status'] === 'SETTLED') $settled += $amt;
            else $pending += $amt;
        }

        Response::json([
            'remittances' => array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'amount' => (float)$r['amount'],
                    'status' => $r['status'],
                    'settledAt' => $r['settled_at'],
                    'shipment' => [
                        'awbNumber' => $r['awb_number'],
                        'courier' => ['name' => $r['courier_name']],
                        'order' => ['orderNumber' => $r['order_number']]
                    ]
                ];
            }, $rows),
            'summary' => [
                'total' => $total,
                'pending' => $pending,
                'processing' => 0,
                'settled' => $settled
            ]
        ]);
    }

    // --- NOTIFICATIONS ---
    public static function listNotifications(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        Response::json(['notifications' => $rows]);
    }

    // --- ANALYTICS ---
    public static function getAnalytics(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $userId = $auth['userId'];

        $ordersCount = $db->prepare("SELECT COUNT(*) FROM orders WHERE user_id = ?");
        $ordersCount->execute([$userId]);
        $totalOrders = (int)$ordersCount->fetchColumn();

        $deliveredCount = $db->prepare("
            SELECT COUNT(*) FROM shipments s 
            JOIN orders o ON s.order_id = o.id 
            WHERE o.user_id = ? AND s.status = 'DELIVERED'
        ");
        $deliveredCount->execute([$userId]);
        $deliveredOrders = (int)$deliveredCount->fetchColumn();

        $inTransitCount = $db->prepare("
            SELECT COUNT(*) FROM shipments s 
            JOIN orders o ON s.order_id = o.id 
            WHERE o.user_id = ? AND s.status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'MANIFESTED')
        ");
        $inTransitCount->execute([$userId]);
        $inTransitOrders = (int)$inTransitCount->fetchColumn();

        $ndrCount = $db->prepare("
            SELECT COUNT(*) FROM shipments s 
            JOIN orders o ON s.order_id = o.id 
            WHERE o.user_id = ? AND s.status = 'NDR'
        ");
        $ndrCount->execute([$userId]);
        $ndrOrders = (int)$ndrCount->fetchColumn();

        Response::json([
            'totalOrders' => $totalOrders,
            'deliveredOrders' => $deliveredOrders,
            'inTransitOrders' => $inTransitOrders,
            'ndrOrders' => $ndrOrders,
            'deliverySuccessRate' => $totalOrders > 0 ? round(($deliveredOrders / $totalOrders) * 100, 1) : 100.0,
            'dailyShipments' => [
                ['date' => date('Y-m-d', strtotime('-4 days')), 'orders' => 12],
                ['date' => date('Y-m-d', strtotime('-3 days')), 'orders' => 19],
                ['date' => date('Y-m-d', strtotime('-2 days')), 'orders' => 15],
                ['date' => date('Y-m-d', strtotime('-1 days')), 'orders' => 25],
                ['date' => date('Y-m-d'), 'orders' => $totalOrders]
            ]
        ]);
    }

    // --- NDR RECORDS ---
    public static function listNdr(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT n.*, s.awb_number, o.order_number, c.name as courier_name, a.contact_name, a.city
            FROM ndr_records n
            JOIN shipments s ON n.shipment_id = s.id
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            JOIN addresses a ON o.buyer_address_id = a.id
            WHERE o.user_id = ?
            ORDER BY n.created_at DESC
        ");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        Response::json([
            'records' => array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'reason' => $r['reason'],
                    'attemptNumber' => (int)$r['attempt_number'],
                    'action' => $r['action'],
                    'notes' => $r['notes'],
                    'shipment' => [
                        'awbNumber' => $r['awb_number'],
                        'courier' => ['name' => $r['courier_name']],
                        'order' => [
                            'orderNumber' => $r['order_number'],
                            'buyerAddress' => [
                                'contactName' => $r['contact_name'],
                                'city' => $r['city']
                            ]
                        ]
                    ]
                ];
            }, $rows)
        ]);
    }
}
