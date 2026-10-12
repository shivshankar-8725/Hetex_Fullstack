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

        if (empty($pickupAddressId) || empty($buyerAddressId)) {
            Response::error('Pickup and Buyer address are required', 400);
        }

        $volWeight = ($length * $width * $height) / 5000.0;
        $billableWeight = max($weight, $volWeight);

        $db = Database::getConnection();

        // Check courier rate
        $courierStmt = $db->prepare("SELECT * FROM couriers WHERE id = ? AND active = 1");
        $courierStmt->execute([$courierId]);
        $courier = $courierStmt->fetch();
        if (!$courier) {
            // Default to first active courier
            $courier = $db->query("SELECT * FROM couriers WHERE active = 1 LIMIT 1")->fetch();
            $courierId = $courier['id'];
        }

        $baseFreight = ceil($billableWeight) * (float)$courier['base_rate_per_kg'];
        $codCharge = ($paymentMode === 'COD') ? max((float)$courier['cod_charge_flat'], (float)$courier['cod_charge_percent'] / 100 * $codAmount) : 0;
        $margin = ($baseFreight + $codCharge) * 0.10;
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
            ")->execute([$orderId, $orderNum, $auth['userId'], $pickupAddressId, $buyerAddressId, $itemDesc, $declaredValue, $weight, $length, $width, $height, $volWeight, $billableWeight, $paymentMode, $codAmount]);

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
                'order' => [
                    'id' => $orderId,
                    'orderNumber' => $orderNum,
                    'awbNumber' => $awb,
                    'status' => 'CONFIRMED',
                    'rateCharged' => $totalShippingCost
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create order: ' . $e->getMessage(), 500);
        }
    }

    public static function listOrders(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT o.*, s.awb_number, s.status as shipment_status, s.rate_charged, c.name as courier_name
            FROM orders o
            LEFT JOIN shipments s ON o.id = s.order_id
            LEFT JOIN couriers c ON s.courier_id = c.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
            LIMIT 100
        ");
        $stmt->execute([$auth['userId']]);
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
                    'weight' => (float)$o['weight'],
                    'awbNumber' => $o['awb_number'],
                    'shipmentStatus' => $o['shipment_status'],
                    'courierName' => $o['courier_name'],
                    'rateCharged' => (float)($o['rate_charged'] ?? 0),
                    'createdAt' => $o['created_at']
                ];
            }, $orders)
        ]);
    }

    public static function trackShipment(): void {
        $data = $_GET;
        $awb = trim($data['awb'] ?? '');

        if (empty($awb)) Response::error('AWB number is required', 400);

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT s.*, o.order_number, o.item_description, c.name as courier_name
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            JOIN couriers c ON s.courier_id = c.id
            WHERE s.awb_number = ?
        ");
        $stmt->execute([$awb]);
        $shipment = $stmt->fetch();

        if (!$shipment) Response::error('Shipment not found for AWB: ' . $awb, 404);

        $eventsStmt = $db->prepare("SELECT * FROM tracking_events WHERE shipment_id = ? ORDER BY timestamp DESC");
        $eventsStmt->execute([$shipment['id']]);
        $events = $eventsStmt->fetchAll();

        Response::json([
            'awbNumber' => $shipment['awb_number'],
            'orderNumber' => $shipment['order_number'],
            'courier' => $shipment['courier_name'],
            'status' => $shipment['status'],
            'currentLocation' => $shipment['current_location'],
            'events' => array_map(function($e) {
                return [
                    'status' => $e['status'],
                    'description' => $e['description'],
                    'location' => $e['location'],
                    'timestamp' => $e['timestamp']
                ];
            }, $events)
        ]);
    }
}
