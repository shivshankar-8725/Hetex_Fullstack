<?php
/**
 * Address Controller - Manage Pickup and Delivery Addresses
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class AddressController {

    public static function listAddresses(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        Response::json([
            'addresses' => array_map(function($a) {
                return [
                    'id' => $a['id'],
                    'type' => $a['type'],
                    'label' => $a['label'],
                    'contactName' => $a['contact_name'],
                    'phone' => $a['phone'],
                    'addressLine1' => $a['address_line1'],
                    'addressLine2' => $a['address_line2'],
                    'city' => $a['city'],
                    'state' => $a['state'],
                    'pincode' => $a['pincode'],
                    'country' => $a['country'],
                    'isDefault' => (bool)$a['is_default']
                ];
            }, $rows)
        ]);
    }

    public static function createAddress(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $type = strtoupper($data['type'] ?? 'PICKUP');
        $label = trim($data['label'] ?? 'Warehouse');
        $contactName = trim($data['contactName'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $addressLine1 = trim($data['addressLine1'] ?? '');
        $addressLine2 = trim($data['addressLine2'] ?? '');
        $city = trim($data['city'] ?? '');
        $state = trim($data['state'] ?? '');
        $pincode = trim($data['pincode'] ?? '');
        $isDefault = !empty($data['isDefault']) ? 1 : 0;

        if (empty($contactName) || empty($phone) || empty($addressLine1) || empty($pincode)) {
            Response::error('Contact name, phone, address and pincode are required', 400);
        }

        $db = Database::getConnection();
        $id = Response::generateUuid();

        if ($isDefault) {
            $db->prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ? AND type = ?")->execute([$auth['userId'], $type]);
        }

        $stmt = $db->prepare("
            INSERT INTO addresses (id, user_id, type, label, contact_name, phone, address_line1, address_line2, city, state, pincode, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$id, $auth['userId'], $type, $label, $contactName, $phone, $addressLine1, $addressLine2, $city, $state, $pincode, $isDefault]);

        Response::json(['id' => $id, 'success' => true], 201);
    }
}
