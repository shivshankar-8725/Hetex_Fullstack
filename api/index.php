<?php
/**
 * Hetex Courier - Complete Master API Router
 * Comprehensive routing covering 100% of Node.js & Spring Boot endpoints
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

// Ensure any uncaught exception returns a valid JSON payload instead of an empty 500 response
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode([
        'error' => 'Server Error: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
});

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
require_once __DIR__ . '/controllers/ExtraController.php';

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

$prefix = '/api';
$pos = strpos($requestUri, $prefix);
$endpoint = ($pos !== false) ? substr($requestUri, $pos + strlen($prefix)) : $requestUri;
$endpoint = rtrim($endpoint, '/');
if (empty($endpoint)) $endpoint = '/';

try {
    switch (true) {
        // --- Health ---
        case ($endpoint === '/' || $endpoint === '/health'):
            Response::json(['status' => 'online', 'service' => 'Hetex Courier Fullstack API', 'version' => '3.0-Production']);
            break;

        // --- Auth ---
        case ($endpoint === '/auth/register' && $method === 'POST'):
            AuthController::register();
            break;
        case ($endpoint === '/auth/verify-email' && $method === 'POST'):
            AuthController::verifyEmail();
            break;
        case ($endpoint === '/auth/resend-email-otp' && $method === 'POST'):
            AuthController::resendEmailOtp();
            break;
        case ($endpoint === '/auth/login' && $method === 'POST'):
            AuthController::login();
            break;
        case ($endpoint === '/auth/logout' && $method === 'POST'):
            AuthController::logout();
            break;
        case ($endpoint === '/auth/me' && $method === 'GET'):
            AuthController::getProfile();
            break;
        case ($endpoint === '/auth/update-profile' && $method === 'POST'):
            AuthController::updateProfile();
            break;
        case ($endpoint === '/auth/send-phone-otp' && $method === 'POST'):
            AuthController::sendPhoneOtp();
            break;
        case ($endpoint === '/auth/verify-phone-otp' && $method === 'POST'):
            AuthController::verifyPhoneOtp();
            break;
        case ($endpoint === '/auth/request-gst-otp' && $method === 'POST'):
            AuthController::requestGstOtp();
            break;
        case ($endpoint === '/auth/request-kyc-otp' && $method === 'POST'):
            AuthController::requestKycOtp();
            break;
        case ($endpoint === '/auth/verify-kyc-otp' && $method === 'POST'):
            AuthController::verifyKycOtp();
            break;
        case ($endpoint === '/auth/submit-ekyc' && $method === 'POST'):
        case ($endpoint === '/auth/kyc/submit' && $method === 'POST'):
            AuthController::verifyKycOtp();
            break;

        // --- Rates & Serviceability & Carrier SLA ---
        case ($endpoint === '/rates' && $method === 'POST'):
        case ($endpoint === '/serviceability' && $method === 'POST'):
            RateController::calculateRates();
            break;
        case ($endpoint === '/carrier-sla' && $method === 'GET'):
        case ($endpoint === '/couriers' && $method === 'GET'):
            RateController::getCarrierSla();
            break;

        // --- Orders ---
        case ($endpoint === '/orders' && $method === 'GET'):
            OrderController::listOrders();
            break;
        case ($endpoint === '/orders' && $method === 'POST'):
            OrderController::createOrder();
            break;
        case (preg_match('#^/orders/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getOrder($m[1]);
            break;
        case (preg_match('#^/order-cancel/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            OrderController::cancelOrder($m[1]);
            break;

        // --- Tracking ---
        case ($endpoint === '/track' && $method === 'GET'):
            OrderController::trackShipment();
            break;
        case (preg_match('#^/track/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::trackShipment($m[1]);
            break;
        case ($endpoint === '/shipments/live-track' && $method === 'POST'):
            $data = Response::getJsonInput();
            OrderController::trackShipment($data['shipmentId'] ?? '');
            break;

        // --- Invoices & Labels ---
        case (preg_match('#^/shipment-label/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getLabelPdf($m[1]);
            break;
        case (preg_match('#^/shipment-invoice/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getInvoicePdf($m[1]);
            break;
        case (preg_match('#^/shipment-raise-dispute/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::raiseDispute($m[1]);
            break;
        case (preg_match('#^/shipment-simulate/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            Response::json(['shipment' => ['status' => 'IN_TRANSIT']]);
            break;

        // --- Addresses ---
        case ($endpoint === '/addresses/lookup' && $method === 'GET'):
            AddressController::lookupByPhone();
            break;
        case ($endpoint === '/addresses' && $method === 'GET'):
            AddressController::listAddresses();
            break;
        case ($endpoint === '/addresses' && $method === 'POST'):
            AddressController::createAddress();
            break;
        case (preg_match('#^/addresses/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            $auth = AuthMiddleware::authenticate();
            Database::getConnection()->prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?")->execute([$m[1], $auth['userId']]);
            Response::json(['ok' => true]);
            break;

        // --- Wallet ---
        case ($endpoint === '/wallet' && $method === 'GET'):
        case ($endpoint === '/wallet/balance' && $method === 'GET'):
            WalletController::getWallet();
            break;
        case ($endpoint === '/wallet/transactions' && $method === 'GET'):
            WalletController::getWallet();
            break;
        case ($endpoint === '/wallet/recharges' && $method === 'GET'):
            WalletController::getUserRecharges();
            break;
        case ($endpoint === '/wallet/upi-create' && $method === 'POST'):
            WalletController::createUpiRecharge();
            break;
        case ($endpoint === '/wallet/upi-paid' && $method === 'POST'):
            WalletController::submitUpiPayment();
            break;
        case ($endpoint === '/wallet/create-order' && $method === 'POST'):
        case ($endpoint === '/wallet/recharge/create-order' && $method === 'POST'):
        case ($endpoint === '/wallet/recharge' && $method === 'POST'):
            WalletController::createRechargeOrder();
            break;
        case ($endpoint === '/wallet/create-qr' && $method === 'POST'):
            WalletController::createQrPayment();
            break;
        case ($endpoint === '/wallet/verify-payment' && $method === 'POST'):
            WalletController::verifyPayment();
            break;
        case ($endpoint === '/webhooks/razorpay' && $method === 'POST'):
            WalletController::handleRazorpayWebhook();
            break;
        case ($endpoint === '/webhooks/tracking' && $method === 'POST'):
            Response::json(['ok' => true]);
            break;

        // --- Tickets ---
        case ($endpoint === '/tickets' && $method === 'GET'):
            TicketController::listTickets();
            break;
        case ($endpoint === '/tickets' && $method === 'POST'):
            TicketController::createTicket();
            break;
        case (preg_match('#^/tickets/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            TicketController::getTicket($m[1]);
            break;
        case (preg_match('#^/ticket-messages/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            TicketController::addTicketMessage($m[1]);
            break;
        case (preg_match('#^/ticket-simulate-reply/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            TicketController::simulateReply($m[1]);
            break;

        // --- Channels ---
        case ($endpoint === '/channels' && $method === 'GET'):
            ExtraController::listChannels();
            break;
        case ($endpoint === '/channels' && $method === 'POST'):
            ExtraController::connectChannel();
            break;
        case (preg_match('#^/channels/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            ExtraController::disconnectChannel($m[1]);
            break;
        case (preg_match('#^/channel-sync/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::syncChannel($m[1]);
            break;

        // --- Disputes ---
        case ($endpoint === '/disputes' && $method === 'GET'):
            ExtraController::listDisputes();
            break;
        case (preg_match('#^/dispute-respond/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::respondDispute($m[1]);
            break;

        // --- COD ---
        case ($endpoint === '/cod' && $method === 'GET'):
            ExtraController::listRemittances();
            break;

        // --- NDR ---
        case ($endpoint === '/ndr' && $method === 'GET'):
            ExtraController::listNdr();
            break;
        case (preg_match('#^/ndr-action/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::actOnNdr($m[1]);
            break;

        // --- Notifications ---
        case ($endpoint === '/notifications' && $method === 'GET'):
            ExtraController::listNotifications();
            break;

        // --- Analytics ---
        case ($endpoint === '/analytics' && $method === 'GET'):
            ExtraController::getAnalytics();
            break;

        // --- Settings Tracking Page & Platform Settings ---
        case ($endpoint === '/settings/tracking-page' && $method === 'GET'):
            ExtraController::getTrackingPageConfig();
            break;
        case ($endpoint === '/settings/tracking-page' && $method === 'PATCH'):
            ExtraController::updateTrackingPageConfig();
            break;
        case ($endpoint === '/settings' && $method === 'GET'):
            AdminController::getSettings();
            break;
        case ($endpoint === '/admin/settings' && ($method === 'GET' || $method === 'POST')):
            if ($method === 'POST') {
                AdminController::updateSettings();
            } else {
                AdminController::getSettings();
            }
            break;

        // --- Admin ---
        case ($endpoint === '/admin' && $method === 'GET'):
        case ($endpoint === '/admin/stats' && $method === 'GET'):
            AdminController::getOverview();
            break;
        case ($endpoint === '/admin/users' && $method === 'GET'):
            AdminController::listSellers();
            break;
        case (preg_match('#^/admin/users/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            AdminController::getSellerDetail($m[1]);
            break;
        case ($endpoint === '/admin/users' && ($method === 'PATCH' || $method === 'POST')):
            AdminController::adjustWallet();
            break;
        case ($endpoint === '/admin/couriers' && $method === 'GET'):
            AdminController::listCouriers();
            break;
        case ($endpoint === '/admin/couriers' && ($method === 'PATCH' || $method === 'POST' || $method === 'PUT')):
            AdminController::updateCourier();
            break;
        case ($endpoint === '/admin/shipments' && $method === 'GET'):
            AdminController::listAllShipments();
            break;
        case ($endpoint === '/admin/ndr-rto' && $method === 'GET'):
            AdminController::listNdrRtoOversight();
            break;
        case ($endpoint === '/admin/commission' && $method === 'GET'):
            AdminController::getCommissionRules();
            break;
        case ($endpoint === '/admin/commission' && $method === 'POST'):
            AdminController::setCommissionRule();
            break;
        case (preg_match('#^/admin-commission/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            AdminController::deleteCommissionRule($m[1]);
            break;
        case ($endpoint === '/admin/recharges' && $method === 'GET'):
            AdminController::listRechargeRequests();
            break;
        case ($endpoint === '/admin/recharges/approve' && $method === 'POST'):
            AdminController::approveRechargeRequest();
            break;
        case ($endpoint === '/admin/recharges/reject' && $method === 'POST'):
            AdminController::rejectRechargeRequest();
            break;

        default:
            Response::error("Endpoint '{$endpoint}' [{$method}] not found", 404);
            break;
    }
} catch (Throwable $e) {
    Response::error("Server Error: " . $e->getMessage(), 500);
}
