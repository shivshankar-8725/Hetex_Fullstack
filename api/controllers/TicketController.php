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

        $stmt = $db->prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$auth['userId']]);
        $tickets = $stmt->fetchAll();

        Response::json([
            'tickets' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'orderId' => $t['order_id'],
                    'awbNumber' => $t['awb_number'],
                    'subject' => $t['subject'],
                    'status' => $t['status'],
                    'createdAt' => $t['created_at']
                ];
            }, $tickets)
        ]);
    }

    public static function createTicket(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $orderId = $data['orderId'] ?? '';
        $subject = trim($data['subject'] ?? '');
        $message = trim($data['message'] ?? '');

        if (empty($orderId) || empty($subject) || empty($message)) {
            Response::error('Order ID, subject and message are required', 400);
        }

        $db = Database::getConnection();

        // Find shipment details
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
            Response::json(['id' => $ticketId, 'success' => true], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create ticket: ' . $e->getMessage(), 500);
        }
    }
}
