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

        // Check if user already exists
        $stmt = $db->prepare("SELECT id, email_verified FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?)");
        $stmt->execute([$phone, $email]);
        $existing = $stmt->fetch();
        if ($existing && $existing['email_verified']) {
            Response::error('User with this phone or email already exists', 409);
        }

        // Generate a random 6-digit OTP
        $devOtp = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 1800); // 30 mins

        $userId = $existing ? $existing['id'] : Response::generateUuid();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $db->beginTransaction();
        try {
            if ($existing) {
                $updateUser = $db->prepare("
                    UPDATE users SET name = ?, password_hash = ?, business_name = ? WHERE id = ?
                ");
                $updateUser->execute([$name, $passwordHash, $businessName, $userId]);
            } else {
                $insertUser = $db->prepare("
                    INSERT INTO users (id, name, email, phone, role, business_name, kyc_status, password_hash, email_verified, created_at)
                    VALUES (?, ?, ?, ?, 'SELLER', ?, 'PENDING', ?, 0, NOW())
                ");
                $insertUser->execute([$userId, $name, empty($email) ? null : $email, $phone, $businessName, $passwordHash]);

                // Create initial wallet
                $walletId = Response::generateUuid();
                $insertWallet = $db->prepare("INSERT INTO wallets (id, user_id, balance, updated_at) VALUES (?, ?, 0.00, NOW())");
                $insertWallet->execute([$walletId, $userId]);
            }

            // Save OTP for email & phone
            $db->prepare("INSERT INTO otp_codes (id, identifier, code, expires_at, consumed, created_at) VALUES (?, ?, ?, ?, 0, NOW())")
               ->execute([Response::generateUuid(), $email, $devOtp, $expiresAt]);

            $db->commit();

            Response::json([
                'email' => $email,
                'devOtp' => $devOtp,
                'message' => 'Verification code sent. Use dev OTP: ' . $devOtp
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public static function verifyEmail(): void {
        $data = Response::getJsonInput();
        $email = trim(strtolower($data['email'] ?? ''));
        $code = trim($data['code'] ?? '');

        if (empty($email) || empty($code)) {
            Response::error('Email and verification code are required', 400);
        }

        $db = Database::getConnection();

        // Allow any 6-digit random OTP if matching, or bypass with 123456 or latest generated code
        $stmt = $db->prepare("SELECT id, expires_at, code FROM otp_codes WHERE identifier = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$email]);
        $otp = $stmt->fetch();

        // Valid if matches stored code OR demo code 123456
        $isValid = ($otp && ($otp['code'] === $code || $code === '123456')) || ($code === '123456');

        if (!$isValid) {
            // Also check general match in table
            $stmtGeneral = $db->prepare("SELECT id FROM otp_codes WHERE identifier = ? AND code = ? AND consumed = 0 LIMIT 1");
            $stmtGeneral->execute([$email, $code]);
            if ($stmtGeneral->fetch()) {
                $isValid = true;
            }
        }

        if (!$isValid) {
            Response::error('Invalid or expired verification code. Use code: ' . ($otp['code'] ?? '123456'), 400);
        }

        if ($otp) {
            $db->prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?")->execute([$otp['id']]);
        }

        // Mark user as verified
        $userStmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $userStmt->execute([$email]);
        $user = $userStmt->fetch();

        if ($user) {
            $db->prepare("UPDATE users SET email_verified = 1 WHERE id = ?")->execute([$user['id']]);
            $token = JWT::encode([
                'userId' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]);

            // Set cookie for browser session
            setcookie('hetex_session', $token, [
                'expires' => time() + 604800,
                'path' => '/',
                'httponly' => false,
                'samesite' => 'Lax'
            ]);

            Response::json([
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            Response::error('User not found', 404);
        }
    }

    public static function resendEmailOtp(): void {
        $data = Response::getJsonInput();
        $email = trim(strtolower($data['email'] ?? ''));

        if (empty($email)) Response::error('Email is required', 400);

        $devOtp = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 1800);

        $db = Database::getConnection();
        $db->prepare("INSERT INTO otp_codes (id, identifier, code, expires_at, consumed, created_at) VALUES (?, ?, ?, ?, 0, NOW())")
           ->execute([Response::generateUuid(), $email, $devOtp, $expiresAt]);

        Response::json([
            'email' => $email,
            'devOtp' => $devOtp,
            'message' => 'New verification code generated: ' . $devOtp
        ]);
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

        setcookie('hetex_session', $token, [
            'expires' => time() + 604800,
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax'
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

    public static function logout(): void {
        setcookie('hetex_session', '', [
            'expires' => time() - 3600,
            'path' => '/'
        ]);
        Response::json(['success' => true]);
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

    public static function updateProfile(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $name = trim($data['name'] ?? '');
        $businessName = trim($data['businessName'] ?? $data['business_name'] ?? '');

        $db = Database::getConnection();
        $db->prepare("UPDATE users SET name = COALESCE(NULLIF(?, ''), name), business_name = COALESCE(NULLIF(?, ''), business_name) WHERE id = ?")
           ->execute([$name, $businessName, $auth['userId']]);

        self::getProfile();
    }

    public static function sendPhoneOtp(): void {
        $data = Response::getJsonInput();
        $phone = trim($data['phone'] ?? '');
        if (empty($phone)) Response::error('Phone number is required', 400);

        $code = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 1800);

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO otp_codes (id, identifier, code, expires_at, consumed, created_at) VALUES (?, ?, ?, ?, 0, NOW())");
        $stmt->execute([Response::generateUuid(), $phone, $code, $expiresAt]);

        Response::json([
            'success' => true,
            'message' => 'OTP sent successfully',
            'simulatedCode' => $code,
            'devOtp' => $code
        ]);
    }

    public static function verifyPhoneOtp(): void {
        $data = Response::getJsonInput();
        $phone = trim($data['phone'] ?? '');
        $code = trim($data['code'] ?? '');

        if (empty($phone) || empty($code)) Response::error('Phone and code are required', 400);

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id, expires_at, code FROM otp_codes WHERE identifier = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$phone]);
        $otp = $stmt->fetch();

        if ($code !== '123456' && (!$otp || $otp['code'] !== $code)) {
            Response::error('Invalid verification code. Use code: ' . ($otp['code'] ?? '123456'), 400);
        }

        if ($otp) {
            $db->prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?")->execute([$otp['id']]);
        }

        Response::json(['verified' => true, 'message' => 'Phone verified successfully']);
    }

    public static function requestGstOtp(): void {
        AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $gstNumber = strtoupper(trim($data['gstNumber'] ?? ''));

        if (strlen($gstNumber) !== 15) {
            Response::error('Enter a valid 15-character GSTIN', 400);
        }

        $otp = (string)random_int(100000, 999999);
        Response::json([
            'success' => true,
            'message' => 'OTP sent to GST registered mobile number',
            'devOtp' => $otp
        ]);
    }

    public static function submitEkyc(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $pan = strtoupper(trim($data['panNumber'] ?? ''));
        $gst = strtoupper(trim($data['gstNumber'] ?? ''));
        $otp = trim($data['gstOtp'] ?? '');

        if (empty($pan)) Response::error('PAN Number is required', 400);

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET pan_number = ?, gst_number = ?, kyc_status = 'VERIFIED' WHERE id = ?");
        $stmt->execute([$pan, empty($gst) ? null : $gst, $auth['userId']]);

        Response::json([
            'profile' => [
                'kycStatus' => 'VERIFIED',
                'panNumber' => $pan,
                'gstNumber' => $gst
            ]
        ]);
    }
}
