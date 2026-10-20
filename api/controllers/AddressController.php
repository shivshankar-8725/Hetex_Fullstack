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

        // Address book strictly contains registered pickup warehouse locations
        $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? AND type IN ('PICKUP', 'WAREHOUSE') ORDER BY is_default DESC, created_at DESC");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll();

        // If no addresses saved yet for this seller, auto-seed a primary pickup warehouse
        if (empty($rows)) {
            $whId = 'wh_' . substr(md5($auth['userId']), 0, 12);
            try {
                $db->prepare("
                    INSERT INTO addresses (id, user_id, type, label, contact_name, phone, address_line1, city, state, pincode, is_default, created_at)
                    VALUES (?, ?, 'PICKUP', 'Primary Warehouse', 'Warehouse Dispatch', '9876543210', 'Plot 42, Sector 18, Udyog Vihar', 'Gurugram', 'Haryana', '122015', 1, NOW())
                    ON DUPLICATE KEY UPDATE is_default = 1
                ")->execute([$whId, $auth['userId']]);

                $stmt->execute([$auth['userId']]);
                $rows = $stmt->fetchAll();
            } catch (Throwable $t) {}
        }

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
                    'country' => $a['country'] ?? 'India',
                    'isDefault' => (bool)$a['is_default']
                ];
            }, $rows)
        ]);
    }

    public static function createAddress(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $rawType = strtoupper($data['type'] ?? 'PICKUP');
        $type = 'PICKUP';
        if ($rawType === 'DELIVERY' || $rawType === 'BUYER') {
            $type = 'DELIVERY';
        } elseif ($rawType === 'RTO') {
            $type = 'RTO';
        } else {
            $type = 'PICKUP';
        }
        $label = trim($data['label'] ?? ($type === 'PICKUP' ? 'Warehouse' : 'Delivery'));
        $contactName = trim($data['contactName'] ?? $data['contact_name'] ?? $data['buyerName'] ?? $data['name'] ?? '');
        $phone = preg_replace('/\D/', '', (string)($data['phone'] ?? $data['buyerPhone'] ?? $data['mobile'] ?? ''));
        $addressLine1 = trim($data['addressLine1'] ?? $data['address_line1'] ?? $data['buyerAddress'] ?? $data['address'] ?? '');
        $addressLine2 = trim($data['addressLine2'] ?? $data['address_line2'] ?? '');
        $city = trim($data['city'] ?? $data['buyerCity'] ?? 'India');
        $state = trim($data['state'] ?? $data['buyerState'] ?? 'Delhi');
        $pincode = trim($data['pincode'] ?? $data['buyerPincode'] ?? '');
        $isDefault = !empty($data['isDefault']) ? 1 : 0;

        if ($type === 'DELIVERY') {
            if (empty($contactName)) $contactName = 'Customer Recipient';
            if (empty($phone)) $phone = '9876543210';
            if (empty($addressLine1)) $addressLine1 = 'Delivery Address';
            if (empty($pincode)) $pincode = '110001';
        } else {
            if (empty($contactName) || empty($phone) || empty($addressLine1) || empty($pincode)) {
                Response::error('Contact name, phone, address and pincode are required', 400);
            }
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

        Response::json([
            'id' => $id,
            'success' => true,
            'address' => [
                'id' => $id,
                'type' => $type,
                'label' => $label,
                'contactName' => $contactName,
                'phone' => $phone,
                'addressLine1' => $addressLine1,
                'city' => $city,
                'state' => $state,
                'pincode' => $pincode
            ]
        ], 201);
    }

    public static function lookupByPhone(): void {
        $phone = trim($_GET['phone'] ?? '');
        $cleanPhone = preg_replace('/\D/', '', $phone);
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10);
        }

        if (strlen($cleanPhone) < 10) {
            Response::json(['found' => false]);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT contact_name, phone, address_line1, address_line2, city, state, pincode 
            FROM addresses 
            WHERE phone LIKE ? 
               OR RIGHT(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), 10) = ?
            ORDER BY (CASE WHEN type IN ('DELIVERY', 'BUYER') THEN 0 ELSE 1 END), created_at DESC 
            LIMIT 1
        ");
        $stmt->execute(['%' . $cleanPhone, $cleanPhone]);
        $row = $stmt->fetch();

        if ($row) {
            Response::json([
                'found' => true,
                'address' => [
                    'contactName' => $row['contact_name'],
                    'phone' => $row['phone'],
                    'addressLine1' => $row['address_line1'],
                    'addressLine2' => $row['address_line2'] ?? '',
                    'city' => $row['city'],
                    'state' => $row['state'],
                    'pincode' => $row['pincode']
                ]
            ]);
        } else {
            Response::json(['found' => false]);
        }
    }
}
