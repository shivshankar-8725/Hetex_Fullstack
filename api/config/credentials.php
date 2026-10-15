<?php
/**
 * HetEx Courier - Centralized API Credentials & Environment Settings
 * 
 * ============================================================================
 * THIS IS THE ONLY FILE YOU NEED TO EDIT TO CONFIGURE REAL PRODUCTION KEYS!
 * ============================================================================
 * 
 * Simply replace the placeholder values below with your live production credentials.
 * Every controller (Delhivery, Shipmozo, Razorpay, SMS OTP, Email) automatically
 * reads from this file.
 */

class Credentials {

    // =========================================================================
    // 1. HOSTINGER MYSQL DATABASE
    // Found in: Hostinger hPanel -> Databases -> Management
    // =========================================================================
    public const DB_HOST = 'localhost';             // Usually 'localhost' on Hostinger
    public const DB_PORT = '3306';                  // MySQL default port
    public const DB_NAME = 'u969244453_hetex';      // Your Hostinger Database Name
    public const DB_USER = 'u969244453_hetexuser';  // Your Hostinger Database Username
    public const DB_PASS = 'Piyush@1197';           // Your Database User Password

    // =========================================================================
    // 2. DELHIVERY COURIER API
    // Found in: Delhivery One / Delhivery B2B Portal -> Settings -> API Keys
    // Portal: https://one.delhivery.com/
    // =========================================================================
    public const DELHIVERY_ENV = 'production';      // 'sandbox' (testing) or 'production' (live)
    public const DELHIVERY_API_KEY = 'YOUR_DELHIVERY_API_TOKEN_HERE';
    public const DELHIVERY_CLIENT_NAME = 'HETEX_LOGISTICS';
    public const DELHIVERY_BASE_URL = 'https://track.delhivery.com'; 
    // Testing URL: 'https://staging-express.delhivery.com'

    // =========================================================================
    // 3. SHIPMOZO SHIPPING API
    // Found in: https://app.shipmozo.com/ -> Settings -> API Credentials
    // =========================================================================
    public const SHIPMOZO_BASE_URL = 'https://shipping-api.com/app/api/v1';
    public const SHIPMOZO_PUBLIC_KEY = 'YOUR_SHIPMOZO_PUBLIC_KEY_HERE';
    public const SHIPMOZO_PRIVATE_KEY = 'YOUR_SHIPMOZO_PRIVATE_KEY_HERE';

    // =========================================================================
    // 4. RAZORPAY PAYMENT GATEWAY & WEBHOOK
    // Found in: https://dashboard.razorpay.com/ -> Settings -> API Keys & Webhooks
    // =========================================================================
    public const RAZORPAY_KEY_ID = 'rzp_live_YOUR_KEY_ID_HERE';
    public const RAZORPAY_KEY_SECRET = 'YOUR_RAZORPAY_KEY_SECRET_HERE';
    public const RAZORPAY_WEBHOOK_SECRET = 'YOUR_RAZORPAY_WEBHOOK_SECRET_HERE';

    // =========================================================================
    // 5. SMS / MOBILE OTP GATEWAY
    // Supported providers: 'FAST2SMS' (Recommended for India), 'MSG91', or 'TWILIO'
    // =========================================================================
    public const SMS_PROVIDER = 'FAST2SMS';         // 'FAST2SMS', 'MSG91', 'TWILIO', or 'MOCK'
    public const SMS_API_KEY = 'YOUR_SMS_API_KEY_HERE';
    public const SMS_SENDER_ID = 'HETEX';           // 6-character DLT registered header (e.g. 'HETEXX')
    public const SMS_DLT_TE_ID = '';                // DLT Template ID for OTP (mandatory for Indian telecom)

    // =========================================================================
    // 6. SMTP EMAIL SERVICE (Hostinger Webmail / Gmail / SendGrid)
    // Found in: Hostinger hPanel -> Emails -> Configuration Settings
    // =========================================================================
    public const SMTP_HOST = 'smtp.hostinger.com';  // Hostinger SMTP: smtp.hostinger.com
    public const SMTP_PORT = 465;                   // 465 (SSL) or 587 (TLS)
    public const SMTP_USER = 'support@hetex.in';     // Your Hostinger email account
    public const SMTP_PASS = 'YourEmailPasswordHere';
    public const SMTP_FROM_EMAIL = 'support@hetex.in';
    public const SMTP_FROM_NAME = 'HetEx Express Support';

    // =========================================================================
    // HELPER METHOD: Reads environment variable if set, otherwise uses constant
    // =========================================================================
    public static function get(string $key, $default = '') {
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }
        return defined(__CLASS__ . '::' . $key) ? constant(__CLASS__ . '::' . $key) : $default;
    }
}
