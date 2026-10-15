<?php
/**
 * HetEx Courier - Notification Sender (SMS OTP & Email Dispatcher)
 * Powered by centralized api/config/credentials.php
 */

require_once __DIR__ . '/../config/credentials.php';

class Sender {

    /**
     * Send OTP via SMS
     */
    public static function sendOtpSms(string $phone, string $otp): bool {
        $apiKey = Credentials::get('SMS_API_KEY');
        $provider = strtoupper(Credentials::get('SMS_PROVIDER', 'FAST2SMS'));

        // If mock/placeholder, skip external call
        if (empty($apiKey) || str_contains($apiKey, 'YOUR_') || $provider === 'MOCK') {
            error_log("[MOCK SMS] Sent OTP {$otp} to {$phone}");
            return true;
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $phone);
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10); // 10-digit Indian mobile
        }

        try {
            if ($provider === 'FAST2SMS') {
                $payload = [
                    'route' => 'otp',
                    'variables_values' => $otp,
                    'numbers' => $cleanPhone
                ];

                $ch = curl_init('https://www.fast2sms.com/dev/bulkV2');
                curl_setopt_array($ch, [
                    CURLOPT_HTTPHEADER => [
                        "authorization: {$apiKey}",
                        "Content-Type: application/json"
                    ],
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($payload),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 8
                ]);
                $response = curl_exec($ch);
                curl_close($ch);
                return !empty($response);
            }

            if ($provider === 'MSG91') {
                $ch = curl_init("https://api.msg91.com/api/v5/otp?template_id=" . Credentials::get('SMS_DLT_TE_ID') . "&mobile=91{$cleanPhone}&authkey={$apiKey}&otp={$otp}");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 8);
                $res = curl_exec($ch);
                curl_close($ch);
                return !empty($res);
            }
        } catch (Throwable $e) {
            error_log("[SMS Dispatch Error] " . $e->getMessage());
        }

        return false;
    }

    /**
     * Send Email (Verification, Reset Password, Alerts)
     */
    public static function sendEmail(string $toEmail, string $subject, string $htmlContent): bool {
        $fromEmail = Credentials::get('SMTP_FROM_EMAIL', 'support@hetex.in');
        $fromName = Credentials::get('SMTP_FROM_NAME', 'HetEx Support');
        $smtpHost = Credentials::get('SMTP_HOST');

        // Check if real credentials set
        if (empty($smtpHost) || str_contains($smtpHost, 'YOUR_')) {
            error_log("[MOCK EMAIL] Sent to {$toEmail}: {$subject}");
            return true;
        }

        $headers = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: {$fromName} <{$fromEmail}>",
            "Reply-To: {$fromEmail}",
            "X-Mailer: PHP/" . phpversion()
        ];

        try {
            return @mail($toEmail, $subject, $htmlContent, implode("\r\n", $headers));
        } catch (Throwable $e) {
            error_log("[Email Dispatch Error] " . $e->getMessage());
            return false;
        }
    }
}
