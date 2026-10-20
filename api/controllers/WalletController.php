<?php
/**
 * Wallet Controller - Balance, Transactions, Razorpay Order, QR Code & Webhooks
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/credentials.php';
require_once __DIR__ . '/../utils/response.php';

class WalletController {

    private static function ensureRechargeTable(): void {
        try {
            $db = Database::getConnection();
            $db->exec("
                CREATE TABLE IF NOT EXISTS `wallets` (
                  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                  `user_id` VARCHAR(36) NOT NULL UNIQUE,
                  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  INDEX `idx_wallet_user` (`user_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `wallet_transactions` (
                  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                  `wallet_id` VARCHAR(36) NOT NULL,
                  `user_id` VARCHAR(36) NULL,
                  `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT') NOT NULL,
                  `amount` DECIMAL(12,2) NOT NULL,
                  `balance_before` DECIMAL(12,2) NOT NULL,
                  `balance_after` DECIMAL(12,2) NOT NULL,
                  `reason` VARCHAR(255) NOT NULL,
                  `order_id` VARCHAR(36) NULL,
                  `payment_provider` VARCHAR(64) NULL,
                  `payment_reference` VARCHAR(191) NULL,
                  `payment_status` ENUM('PENDING', 'SUCCESS', 'FAILED') NULL DEFAULT 'SUCCESS',
                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  INDEX `idx_tx_wallet` (`wallet_id`),
                  INDEX `idx_tx_user` (`user_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS `wallet_recharges` (
                  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                  `user_id` VARCHAR(36) NOT NULL,
                  `amount` DECIMAL(10,2) NOT NULL,
                  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'UPI',
                  `upi_id` VARCHAR(128) NULL,
                  `utr_number` VARCHAR(64) NULL,
                  `status` ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'UNDER_REVIEW',
                  `admin_notes` TEXT NULL,
                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `reviewed_at` DATETIME NULL,
                  INDEX `idx_recharge_user` (`user_id`),
                  INDEX `idx_recharge_status` (`status`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (Throwable $ignore) {}
    }

    public static function getWallet(): void {
        self::ensureRechargeTable();
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT id, balance FROM wallets WHERE user_id = ?");
        $stmt->execute([$auth['userId']]);
        $row = $stmt->fetch();

        if (!$row) {
            // Auto create wallet for user if missing
            $walletId = Response::generateUuid();
            $db->prepare("INSERT INTO wallets (id, user_id, balance, updated_at) VALUES (?, ?, 0.00, NOW())")
               ->execute([$walletId, $auth['userId']]);
            $balance = 0.00;
            $walletDbId = $walletId;
        } else {
            $balance = (float)($row['balance'] ?? 0.00);
            $walletDbId = $row['id'];
        }

        $txStmt = $db->prepare("
            SELECT t.* 
            FROM wallet_transactions t
            WHERE t.wallet_id = ? OR t.user_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        ");
        $txStmt->execute([$walletDbId, $auth['userId']]);
        $txs = $txStmt->fetchAll() ?: [];

        $transactions = array_map(function($t) {
            return [
                'id' => $t['id'],
                'type' => $t['type'],
                'amount' => (float)$t['amount'],
                'balanceBefore' => (float)$t['balance_before'],
                'balanceAfter' => (float)$t['balance_after'],
                'reason' => $t['reason'],
                'paymentProvider' => $t['payment_provider'],
                'paymentReference' => $t['payment_reference'],
                'paymentStatus' => $t['payment_status'],
                'createdAt' => $t['created_at']
            ];
        }, $txs);

        Response::json([
            'balance' => $balance,
            'wallet' => [
                'balance' => $balance,
                'transactions' => $transactions
            ],
            'transactions' => $transactions
        ]);
    }

    public static function createRechargeOrder(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 0);

        if ($amount < 1) {
            Response::error('Enter a valid positive amount', 400);
        }

        $razorpayKeyId = Credentials::get('RAZORPAY_KEY_ID', 'rzp_test_simulated_key');
        $razorpaySecret = Credentials::get('RAZORPAY_KEY_SECRET', 'rzp_test_simulated_secret');

        $orderId = 'order_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 14);

        if (!empty($razorpayKeyId) && !str_contains($razorpayKeyId, 'YOUR_') && !str_contains($razorpayKeyId, 'simulated')) {
            $ch = curl_init('https://api.razorpay.com/v1/orders');
            $payload = json_encode([
                'amount' => (int)($amount * 100),
                'currency' => 'INR',
                'receipt' => 'rcpt_' . time(),
                'notes' => ['userId' => $auth['userId']]
            ]);
            curl_setopt($ch, CURLOPT_USERPWD, $razorpayKeyId . ':' . $razorpaySecret);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $rzpOrder = json_decode($res, true);
                $orderId = $rzpOrder['id'] ?? $orderId;
            }
        }

        Response::json([
            'razorpayOrderId' => $orderId,
            'orderId' => $orderId,
            'amount' => $amount,
            'currency' => 'INR',
            'razorpayKeyId' => $razorpayKeyId,
            'keyId' => $razorpayKeyId
        ]);
    }

    public static function createQrPayment(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 1000);

        $orderId = 'order_qr_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 10);
        $qrId = 'qr_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 12);

        $upiId = 'hetex@icici';
        $payeeName = 'HetEx Logistics';
        try {
            $db = Database::getConnection();
            $s = $db->query("SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('upi_id', 'payee_name')")->fetchAll(PDO::FETCH_KEY_PAIR);
            if (!empty($s['upi_id'])) $upiId = $s['upi_id'];
            if (!empty($s['payee_name'])) $payeeName = $s['payee_name'];
        } catch (Throwable $e) {}

        $upiUrl = "upi://pay?pa={$upiId}&pn=" . urlencode($payeeName) . "&am=" . number_format($amount, 2, '.', '') . "&cu=INR&tn=" . urlencode("Recharge {$orderId}");
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode($upiUrl);

        Response::json([
            'qrCodeId' => $qrId,
            'imageUrl' => $qrImageUrl,
            'razorpayOrderId' => $orderId,
            'amount' => $amount,
            'currency' => 'INR'
        ]);
    }

    public static function createUpiRecharge(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 1000);

        if ($amount < 1) {
            Response::error('Enter a valid positive recharge amount', 400);
        }

        $requestId = 'HTX-UPIR-' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 8));

        $upiId = 'hetex@icici';
        $payeeName = 'HetEx Logistics';
        try {
            $db = Database::getConnection();
            $s = $db->query("SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('upi_id', 'payee_name')")->fetchAll(PDO::FETCH_KEY_PAIR);
            if (!empty($s['upi_id'])) $upiId = $s['upi_id'];
            if (!empty($s['payee_name'])) $payeeName = $s['payee_name'];
        } catch (Throwable $e) {}

        $upiUrl = "upi://pay?pa={$upiId}&pn=" . urlencode($payeeName) . "&am=" . number_format($amount, 2, '.', '') . "&cu=INR&tn=" . urlencode("Recharge {$requestId}");
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode($upiUrl);

        Response::json([
            'success' => true,
            'requestId' => $requestId,
            'amount' => $amount,
            'upiId' => $upiId,
            'payeeName' => $payeeName,
            'upiUrl' => $upiUrl,
            'qrImageUrl' => $qrImageUrl,
            'qrCodeUrl' => $qrImageUrl,
            'qrDataUrl' => $qrImageUrl,
            'imageUrl' => $qrImageUrl,
            'message' => 'Scan QR to pay via any UPI app'
        ]);
    }

    public static function submitUpiPayment(): void {
        self::ensureRechargeTable();
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 0);
        $requestId = trim($data['requestId'] ?? ('HTX-UPIR-' . time()));
        $utrNumber = trim($data['utrNumber'] ?? '');

        if ($amount < 1) {
            Response::error('Invalid recharge amount', 400);
        }

        $db = Database::getConnection();

        $upiId = 'hetex@icici';
        try {
            $s = $db->query("SELECT setting_value FROM platform_settings WHERE setting_key = 'upi_id' LIMIT 1")->fetchColumn();
            if ($s) $upiId = $s;
        } catch (Throwable $e) {}

        $userCode = null;
        try {
            $userCode = $db->query("SELECT user_code FROM users WHERE id = " . $db->quote($auth['userId']))->fetchColumn() ?: null;
        } catch (Throwable $e) {}

        // Insert with status UNDER_REVIEW
        try {
            $db->prepare("
                INSERT INTO wallet_recharges (id, user_id, user_code, amount, payment_method, upi_id, utr_number, status, created_at)
                VALUES (?, ?, ?, ?, 'UPI', ?, ?, 'UNDER_REVIEW', NOW())
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), utr_number = VALUES(utr_number), status = 'UNDER_REVIEW'
            ")->execute([$requestId, $auth['userId'], $userCode, $amount, $upiId, $utrNumber ?: null]);
        } catch (Throwable $e) {
            $db->prepare("
                INSERT INTO wallet_recharges (id, user_id, amount, payment_method, upi_id, utr_number, status, created_at)
                VALUES (?, ?, ?, 'UPI', ?, ?, 'UNDER_REVIEW', NOW())
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), utr_number = VALUES(utr_number), status = 'UNDER_REVIEW'
            ")->execute([$requestId, $auth['userId'], $amount, $upiId, $utrNumber ?: null]);
        }

        Response::json([
            'success' => true,
            'status' => 'UNDER_REVIEW',
            'requestId' => $requestId,
            'amount' => $amount,
            'message' => 'Your UPI payment has been submitted and is currently UNDER REVIEW. Wallet will be credited upon admin approval.'
        ]);
    }

    public static function getUserRecharges(): void {
        self::ensureRechargeTable();
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM wallet_recharges WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$auth['userId']]);
        $rows = $stmt->fetchAll() ?: [];

        Response::json([
            'recharges' => array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'amount' => (float)$r['amount'],
                    'paymentMethod' => $r['payment_method'],
                    'upiId' => $r['upi_id'],
                    'utrNumber' => $r['utr_number'],
                    'status' => $r['status'],
                    'adminNotes' => $r['admin_notes'] ?? null,
                    'createdAt' => $r['created_at'],
                    'reviewedAt' => $r['reviewed_at']
                ];
            }, $rows)
        ]);
    }

    public static function verifyPayment(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 0);
        $orderId = $data['razorpayOrderId'] ?? ('order_' . time());
        $paymentId = $data['razorpayPaymentId'] ?? ('pay_' . time());

        if ($amount <= 0) Response::error('Invalid payment amount', 400);

        self::creditWallet($auth['userId'], $amount, 'Wallet Recharge: ' . $paymentId, $paymentId);

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
        $stmt->execute([$auth['userId']]);
        $newBal = (float)$stmt->fetchColumn();

        Response::json([
            'success' => true,
            'balance' => $newBal,
            'message' => 'Payment verified and wallet credited successfully'
        ]);
    }

    public static function handleRazorpayWebhook(): void {
        $body = file_get_contents('php://input');
        $headers = getallheaders();
        $signature = $headers['X-Razorpay-Signature'] ?? $headers['x-razorpay-signature'] ?? '';
        $secret = Credentials::get('RAZORPAY_WEBHOOK_SECRET', '');

        if (!empty($secret)) {
            $expected = hash_hmac('sha256', $body, $secret);
            if (!hash_equals($expected, $signature)) {
                Response::error('Invalid webhook signature', 400);
            }
        }

        $data = json_decode($body, true);
        if (($data['event'] ?? '') === 'payment.captured' || ($data['event'] ?? '') === 'order.paid') {
            $payment = $data['payload']['payment']['entity'] ?? [];
            $amount = ((float)($payment['amount'] ?? 0)) / 100.0;
            $paymentId = $payment['id'] ?? ('pay_' . time());
            $userId = $payment['notes']['userId'] ?? null;

            if ($amount > 0 && $userId) {
                self::creditWallet($userId, $amount, 'Razorpay Topup: ' . $paymentId, $paymentId);
            }
        }

        Response::json(['status' => 'ok']);
    }

    public static function creditWallet(string $userId, float $amount, string $reason, ?string $ref = null): bool {
        $db = Database::getConnection();
        $isNested = $db->inTransaction();
        if (!$isNested) {
            self::ensureRechargeTable();
            $db->beginTransaction();
        }
        try {
            $stmt = $db->prepare("SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $wallet = $stmt->fetch();

            if (!$wallet) {
                // Auto create wallet for user if missing
                $walletId = Response::generateUuid();
                $db->prepare("INSERT INTO wallets (id, user_id, balance, updated_at) VALUES (?, ?, 0.00, NOW())")
                   ->execute([$walletId, $userId]);
                $wallet = ['id' => $walletId, 'balance' => 0.00];
            }

            $balBefore = (float)$wallet['balance'];
            $balAfter = $balBefore + $amount;

            $db->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$balAfter, $wallet['id']]);

            $txId = Response::generateUuid();
            $cleanRef = !empty($ref) ? $ref : ('TX-' . time() . '-' . rand(100, 999));

            $db->prepare("
                INSERT INTO wallet_transactions 
                (id, wallet_id, user_id, type, amount, balance_before, balance_after, reason, payment_provider, payment_reference, payment_status, created_at)
                VALUES (?, ?, ?, 'CREDIT', ?, ?, ?, ?, 'UPI', ?, 'SUCCESS', NOW())
            ")->execute([$txId, $wallet['id'], $userId, $amount, $balBefore, $balAfter, $reason, $cleanRef]);

            if (!$isNested && $db->inTransaction()) {
                $db->commit();
            }
            return true;
        } catch (Throwable $e) {
            if (!$isNested && $db->inTransaction()) {
                try {
                    $db->rollBack();
                } catch (Throwable $t) {}
            }
            return false;
        }
    }
}
