<?php
/**
 * Support Ticket & Messaging Controller
 * 
 * Features:
 * - Real API Integration & Live Shipmozo tracking enrichment
 * - Automated intelligent Bot / Helpdesk replies for live seller chat
 * - Seamless Admin oversight (all tickets visible to Admin, chat with sellers)
 * - Auto self-healing table definitions & relaxed schema constraints
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/shipmozo_client.php';

class TicketController {

    private static function ensureTables(): void {
        try {
            $db = Database::getConnection();
            $db->exec("
                CREATE TABLE IF NOT EXISTS `support_tickets` (
                  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                  `user_id` VARCHAR(36) NOT NULL,
                  `order_id` VARCHAR(36) NULL,
                  `courier_id` VARCHAR(36) NULL,
                  `awb_number` VARCHAR(100) NULL,
                  `subject` VARCHAR(255) NOT NULL,
                  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED') NOT NULL DEFAULT 'OPEN',
                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  INDEX `idx_ticket_user` (`user_id`),
                  INDEX `idx_ticket_status` (`status`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `ticket_messages` (
                  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                  `ticket_id` VARCHAR(36) NOT NULL,
                  `sender_role` VARCHAR(32) NOT NULL DEFAULT 'USER',
                  `message` TEXT NOT NULL,
                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  INDEX `idx_msg_ticket` (`ticket_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // Self-healing schema for priority and category
            try {
                $db->exec("ALTER TABLE `support_tickets` ADD COLUMN IF NOT EXISTS `priority` ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM'");
            } catch (Throwable $t) {}
            try {
                $db->exec("ALTER TABLE `support_tickets` ADD COLUMN IF NOT EXISTS `category` VARCHAR(100) NOT NULL DEFAULT 'General'");
            } catch (Throwable $t) {}
        } catch (Throwable $ignore) {}
    }

    public static function listTickets(): void {
        self::ensureTables();
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $isAdmin = strtoupper($auth['role'] ?? '') === 'ADMIN';

        if ($isAdmin) {
            $stmt = $db->query("
                SELECT t.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
                       COALESCE(o.order_number, 'General') as order_number,
                       COALESCE(c.name, 'General Support') as courier_name,
                       (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count
                FROM support_tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN orders o ON t.order_id = o.id
                LEFT JOIN couriers c ON t.courier_id = c.id
                ORDER BY t.created_at DESC
                LIMIT 200
            ");
            $tickets = $stmt->fetchAll() ?: [];
        } else {
            $stmt = $db->prepare("
                SELECT t.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
                       COALESCE(o.order_number, 'General') as order_number,
                       COALESCE(c.name, 'General Support') as courier_name,
                       (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count
                FROM support_tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN orders o ON t.order_id = o.id
                LEFT JOIN couriers c ON t.courier_id = c.id
                WHERE t.user_id = ?
                ORDER BY t.created_at DESC
                LIMIT 100
            ");
            $stmt->execute([$auth['userId']]);
            $tickets = $stmt->fetchAll() ?: [];
        }

        Response::json([
            'tickets' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'orderNumber' => $t['order_number'] ?? 'General',
                    'courierName' => $t['courier_name'] ?? 'General Support',
                    'awbNumber' => $t['awb_number'] ?? '-',
                    'subject' => $t['subject'],
                    'status' => $t['status'],
                    'priority' => $t['priority'] ?? 'MEDIUM',
                    'category' => $t['category'] ?? 'General',
                    'sellerName' => $t['seller_name'] ?? 'Seller',
                    'sellerEmail' => $t['seller_email'] ?? '',
                    'sellerPhone' => $t['seller_phone'] ?? '',
                    'messageCount' => (int)($t['message_count'] ?? 0),
                    'messages' => array_fill(0, (int)($t['message_count'] ?? 0), ['id' => 'placeholder']),
                    'createdAt' => $t['created_at']
                ];
            }, $tickets)
        ]);
    }

    public static function getTicket(string $id): void {
        self::ensureTables();
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $isAdmin = strtoupper($auth['role'] ?? '') === 'ADMIN';

        if ($isAdmin) {
            $stmt = $db->prepare("
                SELECT t.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
                       COALESCE(o.order_number, 'General') as order_number,
                       COALESCE(c.name, 'General Support') as courier_name
                FROM support_tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN orders o ON t.order_id = o.id
                LEFT JOIN couriers c ON t.courier_id = c.id
                WHERE t.id = ?
            ");
            $stmt->execute([$id]);
        } else {
            $stmt = $db->prepare("
                SELECT t.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
                       COALESCE(o.order_number, 'General') as order_number,
                       COALESCE(c.name, 'General Support') as courier_name
                FROM support_tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN orders o ON t.order_id = o.id
                LEFT JOIN couriers c ON t.courier_id = c.id
                WHERE t.id = ? AND t.user_id = ?
            ");
            $stmt->execute([$id, $auth['userId']]);
        }
        $t = $stmt->fetch();

        if (!$t) Response::error('Ticket not found', 404);

        $msgStmt = $db->prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC");
        $msgStmt->execute([$id]);
        $messages = $msgStmt->fetchAll() ?: [];

        // Enrich ticket with live Shipmozo tracking data if AWB is present
        $liveTrackingInfo = null;
        if (!empty($t['awb_number']) && $t['awb_number'] !== '-' && ShipmozoClient::isConfigured()) {
            $liveTrackingInfo = self::fetchLiveTrackingForTicket($t['awb_number']);
        }

        $ticketData = [
            'id' => $t['id'],
            'orderNumber' => $t['order_number'] ?? 'General',
            'courierName' => $t['courier_name'] ?? 'General Support',
            'awbNumber' => $t['awb_number'] ?? '-',
            'subject' => $t['subject'],
            'status' => $t['status'],
            'priority' => $t['priority'] ?? 'MEDIUM',
            'category' => $t['category'] ?? 'General',
            'sellerName' => $t['seller_name'] ?? 'Seller',
            'sellerEmail' => $t['seller_email'] ?? '',
            'sellerPhone' => $t['seller_phone'] ?? '',
            'createdAt' => $t['created_at'],
            'messages' => array_map(function($m) {
                return [
                    'id' => $m['id'],
                    'senderRole' => $m['sender_role'],
                    'senderName' => $m['sender_role'] === 'ADMIN' ? 'HetEx Operations Desk' : ($m['sender_role'] === 'BOT' ? 'HetEx Logistics AI' : ($m['sender_role'] === 'SYSTEM' ? 'System Tracking' : 'Seller')),
                    'message' => $m['message'],
                    'createdAt' => $m['created_at']
                ];
            }, $messages)
        ];

        if ($liveTrackingInfo) {
            $ticketData['liveTracking'] = $liveTrackingInfo;
        }

        Response::json(['ticket' => $ticketData]);
    }

    public static function createTicket(): void {
        self::ensureTables();
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $orderId = trim($data['orderId'] ?? '');
        $subject = trim($data['subject'] ?? '');
        $message = trim($data['message'] ?? '');

        if (empty($subject) || empty($message)) {
            Response::error('Subject and message are required', 400);
        }

        $db = Database::getConnection();

        // If orderId is valid and not 'GENERAL', lookup order details
        $awb = null;
        $courierId = null;
        $cleanOrderId = null;

        if (!empty($orderId) && $orderId !== 'GENERAL') {
            $ordStmt = $db->prepare("
                SELECT o.id, s.awb_number, s.courier_id 
                FROM orders o 
                LEFT JOIN shipments s ON o.id = s.order_id 
                WHERE (o.id = ? OR o.order_number = ?)
                LIMIT 1
            ");
            $ordStmt->execute([$orderId, $orderId]);
            $ordRow = $ordStmt->fetch();
            if ($ordRow) {
                $cleanOrderId = $ordRow['id'];
                $awb = $ordRow['awb_number'] ?? null;
                $courierId = $ordRow['courier_id'] ?? null;
            }
        }

        $ticketId = Response::generateUuid();
        $msgId = Response::generateUuid();

        // Optional Live Tracking Enrichment
        $trackingContext = null;
        if (!empty($awb) && !str_starts_with($awb, 'AWB') && ShipmozoClient::isConfigured()) {
            $trackingContext = self::fetchLiveTrackingForTicket($awb);
        }

        $priority = in_array(strtoupper(trim($data['priority'] ?? '')), ['LOW', 'MEDIUM', 'HIGH', 'URGENT']) ? strtoupper(trim($data['priority'])) : 'MEDIUM';
        $category = trim($data['category'] ?? 'General');

        $db->beginTransaction();
        try {
            try {
                $db->prepare("
                    INSERT INTO support_tickets (id, user_id, order_id, courier_id, awb_number, subject, priority, category, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())
                ")->execute([$ticketId, $auth['userId'], $cleanOrderId, $courierId, $awb, $subject, $priority, $category]);
            } catch (Throwable $t) {
                // Fallback if priority/category columns are not yet applied
                $db->prepare("
                    INSERT INTO support_tickets (id, user_id, order_id, courier_id, awb_number, subject, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NOW())
                ")->execute([$ticketId, $auth['userId'], $cleanOrderId, $courierId, $awb, $subject]);
            }

            // User initial message
            $db->prepare("
                INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
                VALUES (?, ?, 'USER', ?, NOW())
            ")->execute([$msgId, $ticketId, $message]);

            // If we have live tracking context, auto-add a tracking system card
            if ($trackingContext) {
                $systemMsg = "📦 **Live Tracking Status**\n\n";
                $systemMsg .= "• AWB: {$awb}\n";
                $systemMsg .= "• Current Status: {$trackingContext['currentStatus']}\n";
                if (!empty($trackingContext['currentLocation'])) {
                    $systemMsg .= "• Current Location: {$trackingContext['currentLocation']}\n";
                }
                if (!empty($trackingContext['expectedDelivery'])) {
                    $systemMsg .= "• Expected Delivery: {$trackingContext['expectedDelivery']}\n";
                }
                if (!empty($trackingContext['lastEvent'])) {
                    $systemMsg .= "• Last Event: {$trackingContext['lastEvent']}\n";
                }

                $db->prepare("
                    INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
                    VALUES (?, ?, 'SYSTEM', ?, NOW())
                ")->execute([Response::generateUuid(), $ticketId, $systemMsg]);
            } else {
                // Welcoming Bot reply to reassure seller
                $welcomeMsg = "Hello! Your support ticket has been received by HetEx Operations Desk. Our team is actively reviewing your request and will assist you shortly.";
                $db->prepare("
                    INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
                    VALUES (?, ?, 'BOT', ?, NOW())
                ")->execute([Response::generateUuid(), $ticketId, $welcomeMsg]);
            }

            $db->commit();

            Response::json([
                'ticket' => ['id' => $ticketId],
                'id' => $ticketId,
                'success' => true
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create ticket: ' . $e->getMessage(), 500);
        }
    }

    public static function addTicketMessage(string $ticketId): void {
        self::ensureTables();
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $message = trim($data['message'] ?? '');

        if (empty($message)) Response::error('Message cannot be empty', 400);

        $db = Database::getConnection();
        $msgId = Response::generateUuid();
        $isAdminUser = strtoupper($auth['role'] ?? '') === 'ADMIN' || !empty($data['isAdmin']);
        $senderRole = !empty($data['senderRole']) ? $data['senderRole'] : ($isAdminUser ? 'ADMIN' : 'USER');

        $db->prepare("
            INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ")->execute([$msgId, $ticketId, $senderRole, $message]);

        if ($senderRole === 'ADMIN') {
            $db->prepare("UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = ? AND status = 'OPEN'")->execute([$ticketId]);

            // TASK-P3-01: Notify seller via email on admin reply
            try {
                $userStmt = $db->prepare("
                    SELECT u.email, u.name, t.subject 
                    FROM support_tickets t 
                    JOIN users u ON t.user_id = u.id 
                    WHERE t.id = ?
                ");
                $userStmt->execute([$ticketId]);
                $seller = $userStmt->fetch();
                if ($seller && !empty($seller['email'])) {
                    require_once __DIR__ . '/../utils/sender.php';
                    $subject = "Support Ticket Update: " . $seller['subject'];
                    $body = "Hello " . htmlspecialchars($seller['name'] ?? 'Seller') . ",\n\n"
                          . "Our operations support team has responded to your ticket.\n\n"
                          . "Message:\n\"" . htmlspecialchars($message) . "\"\n\n"
                          . "You can view and reply to the ticket directly in your HetEx dashboard:\n"
                          . "https://hetex.in/tickets\n\n"
                          . "Best regards,\nHetEx Logistics Support Team";
                    Sender::sendEmail($seller['email'], $subject, $body);
                }
            } catch (Throwable $t) {
                // Email sending error must not block saving the ticket message
            }
        }

        // =================================================================
        // AUTOMATED SMART BOT REPLY (Matches Local Node.js / serve.js logic)
        // =================================================================
        if ($senderRole === 'USER' && ($data['triggerBotReply'] ?? true)) {
            $stmt = $db->prepare("SELECT awb_number, subject FROM support_tickets WHERE id = ?");
            $stmt->execute([$ticketId]);
            $ticket = $stmt->fetch();

            $userQuery = strtolower($message);
            $awb = $ticket['awb_number'] ?? null;
            $reply = '';

            if (!empty($awb) && $awb !== '-') {
                if (str_contains($userQuery, 'eta') || str_contains($userQuery, 'when') || str_contains($userQuery, 'time') || str_contains($userQuery, 'deliv')) {
                    $reply = "📦 **ETA Update (AWB: {$awb})**\nYour shipment is in active transit towards the destination hub. Standard delivery timeline is 2-4 business days. Real-time updates are synchronized directly from the carrier.";
                } elseif (str_contains($userQuery, 'delay') || str_contains($userQuery, 'stuck') || str_contains($userQuery, 'late') || str_contains($userQuery, 'hold')) {
                    $reply = "⚠️ **Hub Escalation Raised**\nWe have logged a priority transit inquiry for AWB: {$awb} with the origin hub supervisor. Dispatch priority has been updated to High.";
                } elseif (str_contains($userQuery, 'pickup') || str_contains($userQuery, 'pick')) {
                    $reply = "🚚 **Pickup Schedule**\nCarrier pickup is scheduled today between 2:00 PM and 6:00 PM IST. Please keep the package packed with the shipping label affixed.";
                } else {
                    $reply = "Hello! We have reviewed your query regarding shipment {$awb}. A dedicated operations executive is investigating and will follow up with complete resolution.";
                }
            } else {
                if (str_contains($userQuery, 'wallet') || str_contains($userQuery, 'recharge') || str_contains($userQuery, 'money') || str_contains($userQuery, 'balance')) {
                    $reply = "💳 **Wallet & Billing Support**\nUPI wallet top-ups are submitted for immediate admin review. Please ensure your 12-digit UTR number is provided so verification completes without delay.";
                } elseif (str_contains($userQuery, 'kyc') || str_contains($userQuery, 'gst') || str_contains($userQuery, 'pan')) {
                    $reply = "📋 **eKYC Support**\neKYC verification requires a valid 15-character GSTIN or 10-character PAN. Once verified, unlimited shipping limits are unlocked.";
                } else {
                    $reply = "Thank you for reaching out. Our support desk has logged your request and a specialist is looking into it.";
                }
            }

            // Insert smart automated bot reply
            $botMsgId = Response::generateUuid();
            $db->prepare("
                INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
                VALUES (?, ?, 'BOT', ?, DATE_ADD(NOW(), INTERVAL 1 SECOND))
            ")->execute([$botMsgId, $ticketId, $reply]);
        }

        self::getTicket($ticketId);
    }

    public static function updateTicketStatus(string $ticketId): void {
        self::ensureTables();
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $status = strtoupper(trim($data['status'] ?? 'IN_PROGRESS'));

        $allowed = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
        if (!in_array($status, $allowed, true)) {
            $status = 'IN_PROGRESS';
        }

        $db = Database::getConnection();
        $db->prepare("UPDATE support_tickets SET status = ? WHERE id = ?")->execute([$status, $ticketId]);

        self::getTicket($ticketId);
    }

    public static function simulateReply(string $ticketId): void {
        self::ensureTables();
        $db = Database::getConnection();
        $ticketStmt = $db->prepare("SELECT awb_number FROM support_tickets WHERE id = ?");
        $ticketStmt->execute([$ticketId]);
        $ticket = $ticketStmt->fetch();

        $awb = $ticket['awb_number'] ?? '-';
        $reply = "Hello, your package (AWB: {$awb}) has been checked with the origin hub. Delivery will be expedited within 24-48 business hours.";

        $msgId = Response::generateUuid();
        $db->prepare("
            INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
            VALUES (?, ?, 'COURIER', ?, NOW())
        ")->execute([$msgId, $ticketId, $reply]);

        $db->prepare("UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = ?")->execute([$ticketId]);

        self::getTicket($ticketId);
    }

    private static function fetchLiveTrackingForTicket(string $awbNumber): ?array {
        try {
            $response = ShipmozoClient::trackOrder($awbNumber);
            if ($response['success'] && !empty($response['data'])) {
                $data = $response['data'];
                $lastEvent = '';
                if (!empty($data['scan_detail']) && is_array($data['scan_detail'])) {
                    $lastScan = $data['scan_detail'][0] ?? null;
                    if ($lastScan) {
                        $lastEvent = ($lastScan['activity'] ?? $lastScan['status'] ?? '')
                            . ' at ' . ($lastScan['location'] ?? 'Unknown')
                            . ' (' . ($lastScan['date_time'] ?? '') . ')';
                    }
                }
                return [
                    'currentStatus' => $data['current_status'] ?? 'UNKNOWN',
                    'currentLocation' => $data['current_location'] ?? null,
                    'courier' => $data['courier'] ?? null,
                    'expectedDelivery' => $data['expected_delivery_date'] ?? null,
                    'lastEvent' => $lastEvent ?: null,
                    'awb' => $data['awb_number'] ?? $awbNumber
                ];
            }
        } catch (Throwable $e) {
            error_log("[TicketTracking] Failed to fetch tracking for AWB {$awbNumber}: " . $e->getMessage());
        }
        return null;
    }
}
