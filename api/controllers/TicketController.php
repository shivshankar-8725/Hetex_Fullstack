<?php
/**
 * Support Ticket & Messaging Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class TicketController {

    public static function listTickets(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT t.*, o.order_number, COALESCE(c.name, 'General Support') as courier_name,
                   (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count
            FROM support_tickets t
            LEFT JOIN orders o ON t.order_id = o.id
            LEFT JOIN couriers c ON t.courier_id = c.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$auth['userId']]);
        $tickets = $stmt->fetchAll();

        Response::json([
            'tickets' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'orderNumber' => $t['order_number'] ?? 'General',
                    'courierName' => $t['courier_name'] ?? 'General Support',
                    'awbNumber' => $t['awb_number'] ?? '-',
                    'subject' => $t['subject'],
                    'status' => $t['status'],
                    'messageCount' => (int)$t['message_count'],
                    'createdAt' => $t['created_at']
                ];
            }, $tickets)
        ]);
    }

    public static function getTicket(string $id): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT t.*, o.order_number, COALESCE(c.name, 'General Support') as courier_name
            FROM support_tickets t
            LEFT JOIN orders o ON t.order_id = o.id
            LEFT JOIN couriers c ON t.courier_id = c.id
            WHERE t.id = ? AND (t.user_id = ? OR 'ADMIN' = ?)
        ");
        $stmt->execute([$id, $auth['userId'], $auth['role']]);
        $t = $stmt->fetch();

        if (!$t) Response::error('Ticket not found', 404);

        $msgStmt = $db->prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC");
        $msgStmt->execute([$id]);
        $messages = $msgStmt->fetchAll();

        Response::json([
            'ticket' => [
                'id' => $t['id'],
                'orderNumber' => $t['order_number'] ?? 'General',
                'courierName' => $t['courier_name'] ?? 'General Support',
                'awbNumber' => $t['awb_number'] ?? '-',
                'subject' => $t['subject'],
                'status' => $t['status'],
                'createdAt' => $t['created_at'],
                'messages' => array_map(function($m) {
                    return [
                        'id' => $m['id'],
                        'senderRole' => $m['sender_role'],
                        'message' => $m['message'],
                        'createdAt' => $m['created_at']
                    ];
                }, $messages)
            ]
        ]);
    }

    public static function createTicket(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $orderId = trim($data['orderId'] ?? '');
        $subject = trim($data['subject'] ?? '');
        $message = trim($data['message'] ?? '');

        if (empty($subject) || empty($message)) {
            Response::error('Subject and message are required', 400);
        }

        $db = Database::getConnection();

        // If orderId is not provided or 'GENERAL', find any user order or create dummy
        if (empty($orderId) || $orderId === 'GENERAL') {
            $userOrderStmt = $db->prepare("SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
            $userOrderStmt->execute([$auth['userId']]);
            $existing = $userOrderStmt->fetch();
            if ($existing) {
                $orderId = $existing['id'];
            } else {
                // Find any order in system or create a system reference
                $anyOrder = $db->query("SELECT id FROM orders LIMIT 1")->fetch();
                if ($anyOrder) {
                    $orderId = $anyOrder['id'];
                } else {
                    $orderId = Response::generateUuid();
                    // Seed a placeholder order for foreign key integrity
                    $defaultAddr = $db->query("SELECT id FROM addresses LIMIT 1")->fetchColumn() ?: Response::generateUuid();
                    $db->prepare("INSERT INTO orders (id, order_number, user_id, pickup_address_id, buyer_address_id, item_description, declared_value, weight, length, width, height, volumetric_weight, billable_weight, payment_mode, status, created_at) VALUES (?, 'GEN-SUPPORT', ?, ?, ?, 'General Inquiry', 0, 0.5, 10, 10, 10, 0.2, 0.5, 'PREPAID', 'DRAFT', NOW())")->execute([$orderId, $auth['userId'], $defaultAddr, $defaultAddr]);
                }
            }
        }

        $stmt = $db->prepare("SELECT s.awb_number, s.courier_id FROM shipments s WHERE s.order_id = ?");
        $stmt->execute([$orderId]);
        $shipment = $stmt->fetch();

        $awb = $shipment['awb_number'] ?? null;
        $courierId = $shipment['courier_id'] ?? 'c1000000-0000-0000-0000-000000000001';

        $ticketId = Response::generateUuid();
        $msgId = Response::generateUuid();

        $db->beginTransaction();
        try {
            $db->prepare("
                INSERT INTO support_tickets (id, user_id, order_id, courier_id, awb_number, subject, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NOW())
            ")->execute([$ticketId, $auth['userId'], $orderId, $courierId, $awb, $subject]);

            $db->prepare("
                INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
                VALUES (?, ?, 'USER', ?, NOW())
            ")->execute([$msgId, $ticketId, $message]);

            $db->commit();
            Response::json(['ticket' => ['id' => $ticketId], 'id' => $ticketId, 'success' => true], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create ticket: ' . $e->getMessage(), 500);
        }
    }

    public static function addTicketMessage(string $ticketId): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $message = trim($data['message'] ?? '');

        if (empty($message)) Response::error('Message cannot be empty', 400);

        $db = Database::getConnection();
        $msgId = Response::generateUuid();
        $senderRole = ($auth['role'] === 'ADMIN') ? 'ADMIN' : 'USER';

        $db->prepare("
            INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ")->execute([$msgId, $ticketId, $senderRole, $message]);

        self::getTicket($ticketId);
    }

    public static function simulateReply(string $ticketId): void {
        $db = Database::getConnection();
        $msgId = Response::generateUuid();
        $reply = "Hello, your package status has been checked with the origin hub. Delivery will be expedited within 24-48 business hours.";

        $db->prepare("
            INSERT INTO ticket_messages (id, ticket_id, sender_role, message, created_at)
            VALUES (?, ?, 'COURIER', ?, NOW())
        ")->execute([$msgId, $ticketId, $reply]);

        $db->prepare("UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = ?")->execute([$ticketId]);

        self::getTicket($ticketId);
    }
}
