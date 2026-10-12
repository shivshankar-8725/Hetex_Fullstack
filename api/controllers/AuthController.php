<?php
/**
 * Auth Controller - Registration, Login, OTPs & KYC
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/jwt.php';

class AuthController {

    public static function register(): void {
        $data = Response::getJsonInput();
        $name = trim($data['name'] ?? '');
        $email = trim(strtolower($data['email'] ?? ''));
        $phone = trim($data['phone'] ?? '');
        $password = $data['password'] ?? '';
        $businessName = trim($data['businessName'] ?? '');

        if (empty($name) || empty($phone) || empty($password)) {
            Response::error('Name, phone and password are required', 400);
        }

        $db = Database::getConnection();

        // Check unique phone / email
        $stmt = $db->prepare("SELECT id FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?)");
        $stmt->execute([$phone, $email]);
        if ($stmt->fetch()) {
            Response::error('User with this phone or email already exists', 409);
        }

        $userId = Response::generateUuid();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $db->beginTransaction();
        try {
            $insertUser = $db->prepare("
                INSERT INTO users (id, name, email, phone, role, business_name, kyc_status, password_hash, email_verified, created_at)
                VALUES (?, ?, ?, ?, 'SELLER', ?, 'PENDING', ?, 0, NOW())
            ");
            $insertUser->execute([$userId, $name, empty($email) ? null : $email, $phone, $businessName, $passwordHash]);

            // Create initial wallet
            $walletId = Response::generateUuid();
            $insertWallet = $db->prepare("INSERT INTO wallets (id, user_id, balance, updated_at) VALUES (?, ?, 0.00, NOW())");
            $insertWallet->execute([$walletId, $userId]);

            $db->commit();

            $token = JWT::encode([
                'userId' => $userId,
                'name' => $name,
                'email' => $email,
                'role' => 'SELLER'
            ]);

            Response::json([
                'token' => $token,
                'user' => [
                    'id' => $userId,
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'role' => 'SELLER',
                    'businessName' => $businessName,
                    'kycStatus' => 'PENDING',
                    'walletBalance' => 0.00
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public static function login(): void {
        $data = Response::getJsonInput();
        $identifier = trim($data['email'] ?? $data['phone'] ?? $data['identifier'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            Response::error('Identifier and password are required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT u.*, w.balance as wallet_balance FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.email = ? OR u.phone = ?");
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'] ?? '')) {
            Response::error('Invalid email/phone or password', 401);
        }

        $token = JWT::encode([
            'userId' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ]);

        Response::json([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'businessName' => $user['business_name'],
                'kycStatus' => $user['kyc_status'],
                'walletBalance' => (float)($user['wallet_balance'] ?? 0)
            ]
        ]);
    }

    public static function getProfile(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT u.*, w.balance as wallet_balance FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.id = ?");
        $stmt->execute([$auth['userId']]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('User not found', 404);
        }

        Response::json([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'businessName' => $user['business_name'],
                'kycStatus' => $user['kyc_status'],
                'panNumber' => $user['pan_number'],
                'gstNumber' => $user['gst_number'],
                'walletBalance' => (float)($user['wallet_balance'] ?? 0)
            ]
        ]);
    }

    public static function sendPhoneOtp(): void {
        $data = Response::getJsonInput();
        $phone = trim($data['phone'] ?? '');
        if (empty($phone)) Response::error('Phone number is required', 400);

        $code = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 mins

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO otp_codes (id, identifier, code, expires_at, consumed, created_at) VALUES (?, ?, ?, ?, 0, NOW())");
        $stmt->execute([Response::generateUuid(), $phone, $code, $expiresAt]);

        // Integrate with SMS Gateway (Fast2SMS / MSG91) or return simulation in dev
        Response::json([
            'success' => true,
            'message' => 'OTP sent successfully',
            'simulatedCode' => (getenv('ENVIRONMENT') === 'production') ? null : $code
        ]);
    }

    public static function verifyPhoneOtp(): void {
        $data = Response::getJsonInput();
        $phone = trim($data['phone'] ?? '');
        $code = trim($data['code'] ?? '');

        if (empty($phone) || empty($code)) Response::error('Phone and code are required', 400);

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id, expires_at FROM otp_codes WHERE identifier = ? AND code = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$phone, $code]);
        $otp = $stmt->fetch();

        if (!$otp || strtotime($otp['expires_at']) < time()) {
            Response::error('Invalid or expired OTP code', 400);
        }

        // Mark consumed
        $db->prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?")->execute([$otp['id']]);

        Response::json(['verified' => true, 'message' => 'Phone verified successfully']);
    }

    public static function submitKyc(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $pan = strtoupper(trim($data['panNumber'] ?? ''));
        $gst = strtoupper(trim($data['gstNumber'] ?? ''));

        if (empty($pan)) Response::error('PAN Number is required for KYC', 400);

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET pan_number = ?, gst_number = ?, kyc_status = 'VERIFIED' WHERE id = ?");
        $stmt->execute([$pan, empty($gst) ? null : $gst, $auth['userId']]);

        Response::json(['success' => true, 'kycStatus' => 'VERIFIED']);
    }
}
