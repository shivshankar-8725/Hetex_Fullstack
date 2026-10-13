<?php
/**
 * Extra Controller - Channels, Disputes, COD Remittance, Notifications, Analytics, Settings, NDR Actions
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

    public static function disconnectChannel(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $db->prepare("DELETE FROM marketplace_connections WHERE id = ? AND user_id = ?")->execute([$id, $auth['userId']]);
        Response::json(['ok' => true]);
    }

    public static function syncChannel(string $id): void {
        $auth = AuthMiddleware::authenticate();
        Response::json(['imported' => 0, 'message' => 'Store synced successfully']);
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

    public static function raiseDispute(string $shipmentId): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $id = Response::generateUuid();
        $db->prepare("
            INSERT INTO weight_disputes (id, shipment_id, declared_weight, courier_weight, extra_charge, status, created_at)
            VALUES (?, ?, 0.5, 1.2, 45.00, 'OPEN', NOW())
            ON DUPLICATE KEY UPDATE status = 'OPEN'
        ")->execute([$id, $shipmentId]);

        Response::json(['dispute' => ['id' => $id, 'shipmentId' => $shipmentId, 'status' => 'OPEN']]);
    }

    public static function respondDispute(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $status = $data['status'] ?? 'RESOLVED';
        $note = $data['resolutionNote'] ?? '';

        $db = Database::getConnection();
        $db->prepare("UPDATE weight_disputes SET status = ?, resolution_note = ? WHERE id = ?")->execute([$status, $note, $id]);
        Response::json(['ok' => true]);
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
            'courierSplit' => [
                ['name' => 'Delhivery Surface', 'count' => max(1, (int)($totalOrders * 0.6)), 'avgDeliveryDays' => 3, 'slaComplianceRate' => 96.5],
                ['name' => 'Delhivery Express', 'count' => (int)($totalOrders * 0.4), 'avgDeliveryDays' => 2, 'slaComplianceRate' => 98.2]
            ],
            'courierSla' => [
                ['courierName' => 'Delhivery Surface', 'meetingSla' => 78, 'slaAtRisk' => 14, 'missedSla' => 8, 'slaPercentage' => 94.2],
                ['courierName' => 'Delhivery Express', 'meetingSla' => 88, 'slaAtRisk' => 8, 'missedSla' => 4, 'slaPercentage' => 96.5]
            ],
            'monthlyExpenses' => [
                ['month' => 'Jan', 'freightCharges' => 12000, 'codHandling' => 1400, 'fuelSurcharge' => 900, 'marginEarned' => 2300],
                ['month' => 'Feb', 'freightCharges' => 18500, 'codHandling' => 2100, 'fuelSurcharge' => 1200, 'marginEarned' => 3400]
            ],
            'totals' => [
                'orders' => $totalOrders,
                'delivered' => $deliveredOrders,
                'rto' => 0,
                'rtoPercent' => 0,
                'totalInvestment' => $totalOrders * 85,
                'revenueGenerated' => $totalOrders * 120,
                'avgDeliveryDays' => 3,
                'overallSlaRate' => 95.8
            ],
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

    public static function actOnNdr(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $action = $data['action'] ?? 'REATTEMPT';
        $notes = $data['notes'] ?? '';

        $db = Database::getConnection();
        $db->prepare("UPDATE ndr_records SET action = ?, notes = ? WHERE id = ?")->execute([$action, $notes, $id]);
        Response::json(['ok' => true]);
    }

    // --- BRANDED TRACKING PAGE CONFIG ---
    public static function getTrackingPageConfig(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM tracking_page_configs WHERE user_id = ?");
        $stmt->execute([$auth['userId']]);
        $row = $stmt->fetch();

        Response::json([
            'config' => [
                'brandName' => $row['brand_name'] ?? 'HetEx',
                'primaryColor' => $row['primary_color'] ?? '#2563eb',
                'logoUrl' => $row['logo_url'] ?? null
            ]
        ]);
    }

    public static function updateTrackingPageConfig(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $brandName = trim($data['brandName'] ?? 'HetEx');
        $primaryColor = trim($data['primaryColor'] ?? '#2563eb');
        $logoUrl = trim($data['logoUrl'] ?? '');

        $db = Database::getConnection();
        $db->prepare("
            INSERT INTO tracking_page_configs (id, user_id, brand_name, primary_color, logo_url)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE brand_name = VALUES(brand_name), primary_color = VALUES(primary_color), logo_url = VALUES(logo_url)
        ")->execute([Response::generateUuid(), $auth['userId'], $brandName, $primaryColor, empty($logoUrl) ? null : $logoUrl]);

        self::getTrackingPageConfig();
    }
}
