<?php
/**
 * Hetex Courier - Main API Front Controller & Router
 * Routes all incoming /api/* requests to corresponding controllers
 */

// Handle CORS preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/WalletController.php';
require_once __DIR__ . '/controllers/RateController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/AddressController.php';
require_once __DIR__ . '/controllers/TicketController.php';
require_once __DIR__ . '/controllers/AdminController.php';

// Parse URI
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Strip leading script directories if hosted under a subdirectory
$prefix = '/api';
$pos = strpos($requestUri, $prefix);
$endpoint = ($pos !== false) ? substr($requestUri, $pos + strlen($prefix)) : $requestUri;
$endpoint = rtrim($endpoint, '/');
if (empty($endpoint)) $endpoint = '/';

try {
    // ROUTING TABLE
    switch (true) {
        // --- Health Check ---
        case ($endpoint === '/' || $endpoint === '/health'):
            Response::json(['status' => 'online', 'service' => 'Hetex Courier API', 'version' => '2.0-PHP-MySQL']);
            break;

        // --- Authentication ---
        case ($endpoint === '/auth/register' && $method === 'POST'):
            AuthController::register();
            break;
        case ($endpoint === '/auth/login' && $method === 'POST'):
            AuthController::login();
            break;
        case ($endpoint === '/auth/me' && $method === 'GET'):
            AuthController::getProfile();
            break;
        case ($endpoint === '/auth/send-phone-otp' && $method === 'POST'):
            AuthController::sendPhoneOtp();
            break;
        case ($endpoint === '/auth/verify-phone-otp' && $method === 'POST'):
            AuthController::verifyPhoneOtp();
            break;
        case ($endpoint === '/auth/kyc/submit' && $method === 'POST'):
            AuthController::submitKyc();
            break;

        // --- Rates & Calculation ---
        case ($endpoint === '/rates' && $method === 'POST'):
            RateController::calculateRates();
            break;

        // --- Orders & Tracking ---
        case ($endpoint === '/orders' && $method === 'GET'):
            OrderController::listOrders();
            break;
        case ($endpoint === '/orders' && $method === 'POST'):
            OrderController::createOrder();
            break;
        case ($endpoint === '/track' && $method === 'GET'):
            OrderController::trackShipment();
            break;

        // --- Addresses ---
        case ($endpoint === '/addresses' && $method === 'GET'):
            AddressController::listAddresses();
            break;
        case ($endpoint === '/addresses' && $method === 'POST'):
            AddressController::createAddress();
            break;

        // --- Wallet & Payments ---
        case ($endpoint === '/wallet/balance' && $method === 'GET'):
            WalletController::getBalance();
            break;
        case ($endpoint === '/wallet/transactions' && $method === 'GET'):
            WalletController::getTransactions();
            break;
        case ($endpoint === '/wallet/recharge/create-order' && $method === 'POST'):
            WalletController::createRechargeOrder();
            break;
        case ($endpoint === '/webhooks/razorpay' && $method === 'POST'):
            WalletController::handleRazorpayWebhook();
            break;

        // --- Support Tickets ---
        case ($endpoint === '/tickets' && $method === 'GET'):
            TicketController::listTickets();
            break;
        case ($endpoint === '/tickets' && $method === 'POST'):
            TicketController::createTicket();
            break;

        // --- Admin ---
        case ($endpoint === '/admin/stats' && $method === 'GET'):
            AdminController::getStats();
            break;
        case ($endpoint === '/admin/users' && $method === 'GET'):
            AdminController::listUsers();
            break;
        case ($endpoint === '/admin/commission' && $method === 'GET'):
            AdminController::getCommissionRules();
            break;
        case ($endpoint === '/admin/commission' && $method === 'POST'):
            AdminController::setCommissionRule();
            break;

        default:
            Response::error("Endpoint '{$endpoint}' [{$method}] not found", 404);
            break;
    }
} catch (Throwable $e) {
    Response::error("Server Error: " . $e->getMessage(), 500);
}
