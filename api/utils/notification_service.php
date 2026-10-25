<?php
/**
 * HetEx Courier - Notification Service (TASK-P1-04 & TASK-P2-07)
 * Handles transactional email, SMS, and outbound webhooks on order events:
 * ORDER_CREATED, SHIPPED, DELIVERED, NDR, RTO
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/sender.php';

class NotificationService {

    /**
     * Dispatches notifications for an order event
     *
     * @param string $orderId Order UUID
     * @param string $event ORDER_CREATED | SHIPPED | DELIVERED | NDR | RTO
     * @param PDO|null $db Optional database instance
     */
    public static function sendOrderEvent(string $orderId, string $event, ?PDO $db = null): void {
        try {
            $db = $db ?? Database::getConnection();

            // Load order, buyer address, seller/user, and shipment details
            $stmt = $db->prepare("
                SELECT o.*,
                       u.id as user_id, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
                       u.business_name,
                       b.contact_name as buyer_name, b.phone as buyer_phone, b.city as buyer_city, b.state as buyer_state,
                       b.pincode as buyer_pincode, b.address_line1 as buyer_address,
                       s.awb_number, s.status as shipment_status, c.name as courier_name, s.tracking_url
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN addresses b ON o.buyer_address_id = b.id
                LEFT JOIN shipments s ON o.id = s.order_id
                LEFT JOIN couriers c ON s.courier_id = c.id
                WHERE o.id = ? OR o.order_number = ?
                LIMIT 1
            ");
            $stmt->execute([$orderId, $orderId]);
            $order = $stmt->fetch();

            if (!$order) {
                return;
            }

            $userId = $order['user_id'];
            $settings = self::getSettings($userId, $db);

            $awb = $order['awb_number'] ?? 'Pending';
            $orderNum = $order['order_number'];
            $courier = $order['courier_name'] ?? 'HetEx Courier Partner';
            $trackUrl = "https://hetex.in/track/" . ($order['awb_number'] ?? $orderNum);

            $eventUpper = strtoupper($event);

            switch ($eventUpper) {
                case 'ORDER_CREATED':
                    // Seller Email
                    if (!empty($settings['order_created_email']) && !empty($order['seller_email'])) {
                        $subject = "Order Confirmed: #{$orderNum} | HetEx Express";
                        $body = "
                            <h2>Order Confirmed</h2>
                            <p>Dear <strong>{$order['seller_name']}</strong>,</p>
                            <p>Your shipping order <strong>#{$orderNum}</strong> has been created and confirmed.</p>
                            <ul>
                                <li><strong>Consignee:</strong> {$order['buyer_name']} ({$order['buyer_city']}, {$order['buyer_pincode']})</li>
                                <li><strong>Package:</strong> {$order['item_description']}</li>
                                <li><strong>Mode:</strong> {$order['payment_mode']} (COD: ₹{$order['cod_amount']})</li>
                                <li><strong>AWB:</strong> {$awb}</li>
                            </ul>
                            <p><a href='{$trackUrl}'>Track Order Details</a></p>
                        ";
                        Sender::sendEmail($order['seller_email'], $subject, $body);
                        self::recordNotification($db, $userId, 'EMAIL', 'ORDER_CREATED', "Order #{$orderNum} confirmed");
                    }
                    // Seller SMS
                    if (!empty($settings['order_created_sms']) && !empty($order['seller_phone'])) {
                        $msg = "HetEx: Order #{$orderNum} confirmed with AWB {$awb}. View details at {$trackUrl}";
                        Sender::sendSms($order['seller_phone'], $msg);
                        self::recordNotification($db, $userId, 'SMS', 'ORDER_CREATED', "Order #{$orderNum} SMS sent");
                    }
                    break;

                case 'SHIPPED':
                    // Seller Email
                    if (!empty($settings['shipped_email']) && !empty($order['seller_email'])) {
                        $subject = "Shipment Dispatched: #{$orderNum} (AWB: {$awb})";
                        $body = "
                            <h2>Shipment Dispatched</h2>
                            <p>Order <strong>#{$orderNum}</strong> has been handed over to <strong>{$courier}</strong>.</p>
                            <p><strong>AWB Number:</strong> {$awb}</p>
                            <p><a href='{$trackUrl}'>Track Shipment Live</a></p>
                        ";
                        Sender::sendEmail($order['seller_email'], $subject, $body);
                    }
                    // Buyer SMS
                    if (!empty($settings['shipped_sms']) && !empty($order['buyer_phone'])) {
                        $msg = "Hi {$order['buyer_name']}, your order #{$orderNum} has been shipped via {$courier}. Track live at {$trackUrl} - HetEx";
                        Sender::sendSms($order['buyer_phone'], $msg);
                    }
                    self::recordNotification($db, $userId, 'ALERT', 'SHIPPED', "Shipment #{$orderNum} (AWB: {$awb}) dispatched");
                    break;

                case 'DELIVERED':
                    // Seller Email
                    if (!empty($settings['delivered_email']) && !empty($order['seller_email'])) {
                        $subject = "Shipment Delivered: #{$orderNum} (AWB: {$awb})";
                        $body = "
                            <h2>Shipment Successfully Delivered</h2>
                            <p>Order <strong>#{$orderNum}</strong> (AWB: {$awb}) was successfully delivered to {$order['buyer_name']} at {$order['buyer_city']}.</p>
                            <p>Thank you for shipping with HetEx Express!</p>
                        ";
                        Sender::sendEmail($order['seller_email'], $subject, $body);
                    }
                    // Buyer SMS
                    if (!empty($settings['delivered_sms']) && !empty($order['buyer_phone'])) {
                        $msg = "Hi {$order['buyer_name']}, your shipment from {$order['business_name']} has been delivered. Thank you! - HetEx";
                        Sender::sendSms($order['buyer_phone'], $msg);
                    }
                    self::recordNotification($db, $userId, 'ALERT', 'DELIVERED', "Shipment #{$orderNum} delivered");
                    break;

                case 'NDR':
                    if (!empty($settings['ndr_email']) && !empty($order['seller_email'])) {
                        $subject = "ACTION REQUIRED: Non-Delivery Report for Order #{$orderNum}";
                        $body = "
                            <h2 style='color: #dc2626;'>Delivery Attempt Failed (NDR)</h2>
                            <p>Courier attempt failed for shipment <strong>{$awb}</strong> (Order #{$orderNum}).</p>
                            <p>Please log in to your HetEx seller dashboard to update instructions (re-attempt or return to origin) to prevent RTO.</p>
                            <p><a href='https://hetex.in/dashboard'>Go to NDR Management</a></p>
                        ";
                        Sender::sendEmail($order['seller_email'], $subject, $body);
                    }
                    if (!empty($settings['ndr_sms']) && !empty($order['seller_phone'])) {
                        $msg = "HetEx Alert: NDR on order #{$orderNum} (AWB: {$awb}). Take action on dashboard to prevent RTO.";
                        Sender::sendSms($order['seller_phone'], $msg);
                    }
                    self::recordNotification($db, $userId, 'ALERT', 'NDR', "NDR flagged on order #{$orderNum}");
                    break;

                case 'RTO':
                    if (!empty($settings['rto_email']) && !empty($order['seller_email'])) {
                        $subject = "RTO Initiated: Order #{$orderNum} (AWB: {$awb})";
                        $body = "
                            <h2>Return to Origin Initiated</h2>
                            <p>Shipment <strong>{$awb}</strong> (Order #{$orderNum}) is being returned to your warehouse.</p>
                            <p><a href='{$trackUrl}'>Track Return Shipment</a></p>
                        ";
                        Sender::sendEmail($order['seller_email'], $subject, $body);
                    }
                    if (!empty($settings['rto_sms']) && !empty($order['seller_phone'])) {
                        $msg = "HetEx: RTO initiated for order #{$orderNum} (AWB: {$awb}).";
                        Sender::sendSms($order['seller_phone'], $msg);
                    }
                    self::recordNotification($db, $userId, 'ALERT', 'RTO', "RTO initiated on order #{$orderNum}");
                    break;
            }

            // Outbound Webhooks (TASK-P2-07)
            self::dispatchOutboundWebhooks($db, $userId, $eventUpper, [
                'event' => $eventUpper,
                'orderId' => $order['id'],
                'orderNumber' => $order['order_number'],
                'awbNumber' => $order['awb_number'],
                'status' => $order['status'] ?? $eventUpper,
                'courier' => $courier,
                'trackingUrl' => $trackUrl,
                'timestamp' => date('c')
            ]);

        } catch (Throwable $t) {
            error_log("[NotificationService] Error sending order event {$event}: " . $t->getMessage());
        }
    }

    /**
     * Dispatches HTTP POST webhooks to subscribed endpoints with HMAC-SHA256 signature
     */
    public static function dispatchOutboundWebhooks(PDO $db, string $userId, string $event, array $payload): void {
        try {
            $stmt = $db->prepare("SELECT * FROM webhooks WHERE user_id = ? AND active = 1");
            $stmt->execute([$userId]);
            $webhooks = $stmt->fetchAll();

            if (empty($webhooks)) {
                return;
            }

            $jsonPayload = json_encode($payload, JSON_UNESCAPED_SLASHES);

            foreach ($webhooks as $wh) {
                $subscribedEvents = is_string($wh['events']) ? json_decode($wh['events'], true) : $wh['events'];
                if (is_array($subscribedEvents) && !in_array('*', $subscribedEvents) && !in_array($event, $subscribedEvents)) {
                    continue;
                }

                $signature = hash_hmac('sha256', $jsonPayload, $wh['secret']);
                $url = $wh['url'];

                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $jsonPayload,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 4,
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                        'X-HetEx-Signature: ' . $signature,
                        'X-HetEx-Event: ' . $event,
                        'User-Agent: HetEx-Webhook-Dispatcher/1.0'
                    ]
                ]);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    $db->prepare("UPDATE webhooks SET failure_count = 0 WHERE id = ?")->execute([$wh['id']]);
                } else {
                    $db->prepare("UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = ?")->execute([$wh['id']]);
                }
            }
        } catch (Throwable $t) {
            error_log("[NotificationService] Webhook dispatch error: " . $t->getMessage());
        }
    }

    private static function getSettings(string $userId, PDO $db): array {
        try {
            $stmt = $db->prepare("SELECT * FROM notification_settings WHERE user_id = ?");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if ($row) {
                return $row;
            }
        } catch (Throwable $t) {}

        return [
            'order_created_email' => 1, 'order_created_sms' => 0,
            'shipped_email' => 1,       'shipped_sms' => 1,
            'delivered_email' => 1,     'delivered_sms' => 1,
            'ndr_email' => 1,           'ndr_sms' => 1,
            'rto_email' => 1,           'rto_sms' => 0
        ];
    }

    private static function recordNotification(PDO $db, string $userId, string $type, string $title, string $message): void {
        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS `notifications` (
                    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                    `user_id` VARCHAR(36) NOT NULL,
                    `type` VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
                    `title` VARCHAR(255) NOT NULL,
                    `message` TEXT NOT NULL,
                    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_notif_user` (`user_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            $db->prepare("
                INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, NOW())
            ")->execute([Response::generateUuid(), $userId, $type, $title, $message]);
        } catch (Throwable $t) {}
    }
}
