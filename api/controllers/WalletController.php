<?php
/**
 * Wallet Controller - Balance, Transactions, Razorpay Order, QR Code & Webhooks
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class WalletController {

    public static function getWallet(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
        $stmt->execute([$auth['userId']]);
        $row = $stmt->fetch();
        $balance = (float)($row['balance'] ?? 0.00);

        $txStmt = $db->prepare("
            SELECT t.* 
            FROM wallet_transactions t
            JOIN wallets w ON t.wallet_id = w.id
            WHERE w.user_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        ");
        $txStmt->execute([$auth['userId']]);
        $txs = $txStmt->fetchAll();

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

        $razorpayKeyId = getenv('RAZORPAY_KEY_ID') ?: 'rzp_test_simulated_key';
        $razorpaySecret = getenv('RAZORPAY_KEY_SECRET') ?: 'rzp_test_simulated_secret';

        $orderId = 'order_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 14);

        if (!empty(getenv('RAZORPAY_KEY_ID'))) {
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

        // Standard UPI QR format for India: upi://pay?pa=...
        $upiUrl = "upi://pay?pa=hetex@icici&pn=HetEx%20Logistics&am={$amount}&cu=INR&tn=Recharge%20{$orderId}";
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode($upiUrl);

        Response::json([
            'qrCodeId' => $qrId,
            'imageUrl' => $qrImageUrl,
            'razorpayOrderId' => $orderId,
            'amount' => $amount,
            'currency' => 'INR',
            'isReal' => false,
            'message' => 'Scan QR to pay using any UPI app (GPay, PhonePe, Paytm)'
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
        $secret = getenv('RAZORPAY_WEBHOOK_SECRET') ?: '';

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
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $wallet = $stmt->fetch();
            if (!$wallet) {
                $db->rollBack();
                return false;
            }

            $balBefore = (float)$wallet['balance'];
            $balAfter = $balBefore + $amount;

            $db->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?")->execute([$balAfter, $wallet['id']]);

            $txId = Response::generateUuid();
            $db->prepare("
                INSERT INTO wallet_transactions 
                (id, wallet_id, user_id, type, amount, balance_before, balance_after, reason, payment_provider, payment_reference, payment_status, created_at)
                VALUES (?, ?, ?, 'CREDIT', ?, ?, ?, ?, 'RAZORPAY', ?, 'SUCCESS', NOW())
            ")->execute([$txId, $wallet['id'], $userId, $amount, $balBefore, $balAfter, $reason, $ref]);

            $db->commit();
            return true;
        } catch (Exception $e) {
            $db->rollBack();
            return false;
        }
    }
}
