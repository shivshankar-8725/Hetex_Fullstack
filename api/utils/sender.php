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
     * Send General / Transactional SMS Alert
     */
    public static function sendSms(string $phone, string $message): bool {
        $apiKey = Credentials::get('SMS_API_KEY');
        $provider = strtoupper(Credentials::get('SMS_PROVIDER', 'FAST2SMS'));

        if (empty($apiKey) || str_contains($apiKey, 'YOUR_') || $provider === 'MOCK') {
            error_log("[MOCK SMS] Sent to {$phone}: {$message}");
            return true;
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $phone);
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10);
        }

        try {
            if ($provider === 'FAST2SMS') {
                $payload = [
                    'route' => 'q',
                    'message' => $message,
                    'language' => 'english',
                    'flash' => 0,
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
        } catch (Throwable $e) {
            error_log("[SMS Send Error] " . $e->getMessage());
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

    /**
     * Send OTP via EmailJS
     */
    public static function sendOtpViaEmailJs(string $toEmail, string $toName, string $otp): bool {
        $serviceId = Credentials::get('EMAILJS_SERVICE_ID');
        $templateId = Credentials::get('EMAILJS_TEMPLATE_ID');
        $publicKey = Credentials::get('EMAILJS_PUBLIC_KEY');
        $privateKey = Credentials::get('EMAILJS_PRIVATE_KEY');

        if (empty($serviceId) || empty($templateId) || empty($publicKey)) {
            error_log("[EmailJS] Missing credentials. Simulating OTP {$otp} to {$toEmail}");
            return true;
        }

        $payload = [
            'service_id' => $serviceId,
            'template_id' => $templateId,
            'user_id' => $publicKey,
            'accessToken' => $privateKey,
            'template_params' => [
                'to_name' => $toName,
                'to_email' => $toEmail,
                'recipient' => $toEmail,
                'email' => $toEmail,
                'otp_code' => $otp,
                'otp' => $otp,
                'code' => $otp,
                'message' => "Your HetEx verification code is: {$otp}. It will expire in 10 minutes."
            ]
        ];

        try {
            $ch = curl_init('https://api.emailjs.com/api/v1.0/email/send');
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Origin: https://hetex.in',
                    'Referer: https://hetex.in/register'
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            error_log("[EmailJS] Dispatch to {$toEmail}: HTTP {$httpCode} - {$response}");
            return ($httpCode === 200);
        } catch (Throwable $e) {
            error_log("[EmailJS Error] " . $e->getMessage());
            return false;
        }
    }
}

