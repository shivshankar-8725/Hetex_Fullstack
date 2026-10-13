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

        $volWeight = ($length * $width * $height) / 5000.0;
        $billableWeight = max($weight, $volWeight);

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
            WHERE o.id = ? AND o.user_id = ?
        ");
        $stmt->execute([$id, $auth['userId']]);
        $o = $stmt->fetch();

        if (!$o) Response::error('Order not found', 404);

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
            SELECT s.*, o.order_number, o.payment_mode, o.cod_amount, o.declared_value, o.billable_weight, o.item_description,
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

        $mode = $data['payment_mode'] ?? 'PREPAID';
        $cod = (float)($data['cod_amount'] ?? 0);
        $weight = (float)($data['billable_weight'] ?? 0.5);
        $desc = htmlspecialchars($data['item_description'] ?? 'Merchandise Goods');

        header("Content-Type: text/html; charset=UTF-8");
        echo <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Shipping Label - {$awb}</title>
    <style>
        @page { size: 100mm 150mm; margin: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 12px; background: #fff; color: #000; width: 100mm; box-sizing: border-box; }
        .label-box { border: 2px solid #000; padding: 8px; font-size: 11px; line-height: 1.3; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
        .brand { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
        .courier { font-size: 14px; font-weight: 800; text-align: right; }
        .awb-sec { text-align: center; border-bottom: 2px solid #000; padding: 6px 0; }
        .awb-num { font-size: 18px; font-weight: 900; letter-spacing: 2px; font-family: monospace; }
        .barcode { height: 42px; display: flex; justify-content: center; align-items: flex-end; gap: 2px; margin: 4px 0; }
        .bar { background: #000; width: 2px; height: 38px; }
        .bar.w { width: 4px; }
        .bar.s { width: 1px; }
        .bar.g { width: 3px; }
        .routing { display: flex; justify-content: space-between; font-weight: 700; border-bottom: 1px solid #000; padding: 4px 0; font-size: 12px; }
        .section { border-bottom: 1px solid #000; padding: 6px 0; }
        .sec-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #555; }
        .bold { font-weight: 700; }
        .footer { font-size: 9px; margin-top: 6px; display: flex; justify-content: space-between; }
        @media print { .no-print { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 12px; text-align: center;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-weight: 700; cursor: pointer;">🖨️ Print Thermal Label (4x6)</button>
    </div>
    <div class="label-box">
        <div class="header">
            <div class="brand">HetEx Logistics</div>
            <div class="courier">{$courier}</div>
        </div>
        <div class="awb-sec">
            <div style="font-size: 10px; font-weight: 700;">TRACKING / AWB NUMBER</div>
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
            <div>Order: {$orderNum}</div>
            <div>{$mode} {($mode === 'COD' ? "— Collect ₹{$cod}" : "")}</div>
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
        </div>
        <div class="section" style="border-bottom: none;">
            <div><strong>Item:</strong> {$desc}</div>
            <div><strong>Billable Weight:</strong> {$weight} kg</div>
        </div>
        <div class="footer">
            <div>Generated by hetex.in</div>
            <div>Powered by HetEx Courier Cloud</div>
        </div>
    </div>
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
