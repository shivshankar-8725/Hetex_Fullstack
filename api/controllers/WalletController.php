<?php
/**
 * Wallet Controller - Balance, Transactions, Razorpay Order & Webhooks
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class WalletController {

    public static function getBalance(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
        $stmt->execute([$auth['userId']]);
        $row = $stmt->fetch();

        Response::json([
            'balance' => (float)($row['balance'] ?? 0.00),
            'currency' => 'INR'
        ]);
    }

    public static function getTransactions(): void {
        $auth = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT t.* 
            FROM wallet_transactions t
            JOIN wallets w ON t.wallet_id = w.id
            WHERE w.user_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        ");
        $stmt->execute([$auth['userId']]);
        $txs = $stmt->fetchAll();

        Response::json([
            'transactions' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'type' => $t['type'],
                    'amount' => (float)$t['amount'],
                    'balanceBefore' => (float)$t['balance_before'],
                    'balanceAfter' => (float)$t['balance_after'],
                    'reason' => $t['reason'],
                    'paymentReference' => $t['payment_reference'],
                    'paymentStatus' => $t['payment_status'],
                    'createdAt' => $t['created_at']
                ];
            }, $txs)
        ]);
    }

    public static function createRechargeOrder(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();
        $amount = (float)($data['amount'] ?? 0);

        if ($amount < 10) {
            Response::error('Minimum recharge amount is ₹10', 400);
        }

        $razorpayKeyId = getenv('RAZORPAY_KEY_ID') ?: 'rzp_test_simulated_key';
        $razorpaySecret = getenv('RAZORPAY_KEY_SECRET') ?: 'rzp_test_simulated_secret';

        // Check if real credentials exist or simulate order
        $orderId = 'order_' . substr(md5(uniqid((string)mt_rand(), true)), 0, 14);

        if (!empty(getenv('RAZORPAY_KEY_ID'))) {
            // Real Razorpay API call via cURL
            $ch = curl_init('https://api.razorpay.com/v1/orders');
            $payload = json_encode([
                'amount' => (int)($amount * 100), // in paise
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
            'orderId' => $orderId,
            'amount' => $amount,
            'keyId' => $razorpayKeyId,
            'currency' => 'INR'
        ]);
    }

    public static function handleRazorpayWebhook(): void {
        $body = file_get_contents('php://input');
        $headers = getallheaders();
        $signature = $headers['X-Razorpay-Signature'] ?? $headers['x-razorpay-signature'] ?? '';
        $secret = getenv('RAZORPAY_WEBHOOK_SECRET') ?: '';

        // If webhook secret configured, verify HMAC
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

    public static function creditWallet(string $userId, double $amount, string $reason, ?string $ref = null): bool {
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
