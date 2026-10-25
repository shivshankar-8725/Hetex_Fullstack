<?php
/**
 * HetEx Courier - Centralized API Credentials & Environment Settings
 * 
 * ============================================================================
 * Credentials are loaded securely from environment variables or api/.env file.
 * ============================================================================
 */

class Credentials {
    private static bool $envLoaded = false;

    /**
     * Loads .env configuration file if present
     */
    public static function loadEnv(): void {
        if (self::$envLoaded) {
            return;
        }
        self::$envLoaded = true;

        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines !== false) {
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || str_starts_with($line, '#')) {
                        continue;
                    }
                    $parts = explode('=', $line, 2);
                    if (count($parts) === 2) {
                        $key = trim($parts[0]);
                        $val = trim($parts[1]);
                        if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                            (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                            $val = substr($val, 1, -1);
                        }
                        if (getenv($key) === false) {
                            putenv("{$key}={$val}");
                            $_ENV[$key] = $val;
                            $_SERVER[$key] = $val;
                        }
                    }
                }
            }
        }
    }

    // Default constants (overridden by env variables)
    public const DB_HOST = 'localhost';
    public const DB_PORT = '3306';
    public const DB_NAME = 'u969244453_hetex';
    public const DB_USER = 'u969244453_hetexuser';
    public const DB_PASS = 'Piyush@1197';

    public const DELHIVERY_ENV = 'production';
    public const DELHIVERY_API_KEY = '';
    public const DELHIVERY_CLIENT_NAME = 'HETEX_LOGISTICS';
    public const DELHIVERY_BASE_URL = 'https://track.delhivery.com'; 

    public const SHIPMOZO_BASE_URL = 'https://shipping-api.com/app/api/v1';
    public const SHIPMOZO_PUBLIC_KEY = 'flGJQHjkPTpIZq7AwL2h';
    public const SHIPMOZO_PRIVATE_KEY = 'sZ4u1x2ESph5DUfT8L7l';

    public const RAZORPAY_KEY_ID = '';
    public const RAZORPAY_KEY_SECRET = '';
    public const RAZORPAY_WEBHOOK_SECRET = '';

    public const SMS_PROVIDER = 'FAST2SMS';
    public const SMS_API_KEY = '';
    public const SMS_SENDER_ID = 'HETEX';
    public const SMS_DLT_TE_ID = '';

    public const SMTP_HOST = 'smtp.hostinger.com';
    public const SMTP_PORT = 465;
    public const SMTP_USER = 'support@hetex.in';
    public const SMTP_PASS = '';
    public const SMTP_FROM_EMAIL = 'support@hetex.in';
    public const SMTP_FROM_NAME = 'HetEx Express Support';

    public const EMAILJS_PUBLIC_KEY = 'tPp2P8788nOc1d6UT';
    public const EMAILJS_PRIVATE_KEY = 'qZZrt4o-94wYzB2LI956M';
    public const EMAILJS_SERVICE_ID = 'service_dlndjrd';
    public const EMAILJS_TEMPLATE_ID = 'template_7gomg2f';

    public const JWT_SECRET = 'hetex_jwt_super_secret_key_2026_hostinger_secure';

    /**
     * Reads environment variable or fallback from .env or constants
     */
    public static function get(string $key, $default = '') {
        self::loadEnv();
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }
        $val = defined(__CLASS__ . '::' . $key) ? constant(__CLASS__ . '::' . $key) : '';
        return ($val !== '') ? $val : $default;
    }
}
