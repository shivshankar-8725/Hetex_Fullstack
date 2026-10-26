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

require_once __DIR__ . '/config/credentials.php';
Credentials::loadEnv();

require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/WalletController.php';
require_once __DIR__ . '/controllers/RateController.php';
require_once __DIR__ . '/utils/rate_limit.php';
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

        // --- Auth (Registration temporarily closed) ---
        // case ($endpoint === '/auth/register' && $method === 'POST'):
        //     AuthController::register();
        //     break;
        case ($endpoint === '/auth/register' && $method === 'POST'):
            Response::error('New seller registrations are temporarily closed. Please contact sales or support.', 403);
            break;
        case ($endpoint === '/auth/verify-email' && $method === 'POST'):
            RateLimiter::check('verify-email', 5, 60);
            AuthController::verifyEmail();
            break;
        case ($endpoint === '/auth/resend-email-otp' && $method === 'POST'):
        case ($endpoint === '/auth/forgot-password' && $method === 'POST'):
            RateLimiter::check('forgot-password', 5, 60);
            AuthController::resendEmailOtp();
            break;
        case ($endpoint === '/auth/reset-password' && $method === 'POST'):
            RateLimiter::check('reset-password', 5, 60);
            AuthController::resetPassword();
            break;
        case ($endpoint === '/auth/login' && $method === 'POST'):
            RateLimiter::check('login', 5, 60);
            AuthController::login();
            break;
        case ($endpoint === '/auth/logout' && $method === 'POST'):
            AuthController::logout();
            break;
        // --- Profile (Supports /profile, /user/profile, /auth/me, /auth/update-profile) ---
        case (($endpoint === '/auth/me' || $endpoint === '/profile' || $endpoint === '/user/profile') && $method === 'GET'):
            AuthController::getProfile();
            break;
        case (($endpoint === '/auth/update-profile' || $endpoint === '/profile' || $endpoint === '/user/profile') && ($method === 'POST' || $method === 'PUT')):
            AuthController::updateProfile();
            break;
        case ($endpoint === '/profile/bank' && ($method === 'POST' || $method === 'PUT')):
            AuthController::updateBank();
            break;
        case ($endpoint === '/profile/send-otp' && $method === 'POST'):
            AuthController::sendProfileOtp();
            break;
        case ($endpoint === '/profile/change-password-otp' && $method === 'POST'):
            AuthController::changePasswordOtp();
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
        case ($endpoint === '/orders-cancel-bulk' && $method === 'POST'):
            OrderController::cancelBulkOrders();
            break;
        case (preg_match('#^/orders/([^/]+)/ship$#', $endpoint, $m) && $method === 'POST'):
            OrderController::shipSavedOrder($m[1]);
            break;
        case (preg_match('#^/orders/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getOrder($m[1]);
            break;
        case (preg_match('#^/orders/([^/]+)$#', $endpoint, $m) && ($method === 'PUT' || $method === 'POST')):
            OrderController::updateOrder($m[1]);
            break;
        case (preg_match('#^/order-cancel/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            OrderController::cancelOrder($m[1]);
            break;
        case ($endpoint === '/schedule-pickup' && $method === 'POST'):
            OrderController::schedulePickup();
            break;
        case (preg_match('#^/order-pickup/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            OrderController::schedulePickup($m[1]);
            break;
        case ($endpoint === '/push-return-order' && $method === 'POST'):
            OrderController::pushReturnOrder();
            break;
        case ($endpoint === '/orders/bulk' && $method === 'POST'):
            OrderController::bulkImport();
            break;
        case ($endpoint === '/manifest' && $method === 'GET'):
            OrderController::getManifestPdf();
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
        case ($endpoint === '/shipment-labels-bulk' && $method === 'GET'):
            OrderController::getBulkLabelsPdf();
            break;
        case ($endpoint === '/shipment-invoices-bulk' && $method === 'GET'):
            OrderController::getBulkInvoicesPdf();
            break;
        case (preg_match('#^/shipment-label/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getLabelPdf($m[1]);
            break;
        case (preg_match('#^/shipment-invoice/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            OrderController::getInvoicePdf($m[1]);
            break;
        case ($endpoint === '/billing/monthly-invoices' && $method === 'GET'):
            ExtraController::listMonthlyInvoices();
            break;
        case ($endpoint === '/billing/monthly-invoice' && $method === 'GET'):
            ExtraController::getMonthlyInvoiceHtml();
            break;
        case (preg_match('#^/billing/monthly-invoice/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            ExtraController::getMonthlyInvoiceHtml($m[1]);
            break;
        case (preg_match('#^/shipment-raise-dispute/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::raiseDispute($m[1]);
            break;
        case (preg_match('#^/shipment-simulate/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            Response::json(['shipment' => ['status' => 'IN_TRANSIT']]);
            break;

        // --- Addresses & Pincode ---
        case (preg_match('#^/pincode-lookup/([0-9]{6})$#', $endpoint, $m) && $method === 'GET'):
            ExtraController::pincodeLookup($m[1]);
            break;
        case ($endpoint === '/pincode-lookup' && $method === 'GET'):
            ExtraController::pincodeLookup($_GET['pincode'] ?? $_GET['pin'] ?? '');
            break;
        case ($endpoint === '/addresses/lookup' && $method === 'GET'):
        case ($endpoint === '/address-lookup' && $method === 'GET'):
            AddressController::lookupByPhone();
            break;
        case ($endpoint === '/addresses' && $method === 'GET'):
            AddressController::listAddresses();
            break;
        case ($endpoint === '/addresses' && $method === 'POST'):
            AddressController::createAddress();
            break;
        case (preg_match('#^/addresses/([^/]+)/sync-warehouse$#', $endpoint, $m) && $method === 'POST'):
            AddressController::syncWarehouse($m[1]);
            break;
        case (preg_match('#^/addresses/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            AddressController::deleteAddress($m[1]);
            break;
        case ($endpoint === '/warehouses' && $method === 'GET'):
            AddressController::listShipmozoWarehouses();
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
        case (($endpoint === '/tickets' || $endpoint === '/admin/tickets') && $method === 'GET'):
            TicketController::listTickets();
            break;
        case ($endpoint === '/tickets' && $method === 'POST'):
            TicketController::createTicket();
            break;
        case (preg_match('#^/tickets/([^/]+)/status$#', $endpoint, $m) && in_array($method, ['POST', 'PATCH', 'PUT'])):
            TicketController::updateTicketStatus($m[1]);
            break;
        case (preg_match('#^/tickets/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            TicketController::getTicket($m[1]);
            break;
        case (preg_match('#^/ticket-messages/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            TicketController::addTicketMessage($m[1]);
            break;
        case ((preg_match('#^/ticket-simulate-reply/([^/]+)$#', $endpoint, $m) || preg_match('#^/ticket-bot-reply/([^/]+)$#', $endpoint, $m)) && $method === 'POST'):
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

        // --- Pincode Lookup ---
        case (preg_match('#^/pincode-lookup(?:/([0-9]{6}))?$#', $endpoint, $m) && $method === 'GET'):
            $pin = !empty($m[1]) ? $m[1] : ($_GET['pincode'] ?? $_GET['pin'] ?? '');
            if (empty($pin) || strlen($pin) !== 6 || !ctype_digit($pin)) {
                Response::error('Valid 6-digit pincode is required', 400);
            }
            $ch = curl_init("https://api.postalpincode.in/pincode/" . $pin);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $resp = curl_exec($ch);
            curl_close($ch);
            $parsed = $resp ? json_decode($resp, true) : null;
            if ($parsed && !empty($parsed[0]['PostOffice'])) {
                $po = $parsed[0]['PostOffice'][0];
                Response::json([
                    'success' => true,
                    'found' => true,
                    'pincode' => $pin,
                    'city' => $po['District'] ?? $po['Name'] ?? 'City',
                    'state' => $po['State'] ?? 'State'
                ]);
            } else {
                Response::json([
                    'success' => true,
                    'found' => false,
                    'pincode' => $pin,
                    'city' => '',
                    'state' => ''
                ]);
            }
            break;

        // --- Support Tickets & Messaging ---
        case ($endpoint === '/tickets' && $method === 'GET'):
            TicketController::listTickets();
            break;
        case ($endpoint === '/tickets' && $method === 'POST'):
            TicketController::createTicket();
            break;
        case (preg_match('#^/tickets/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            TicketController::getTicket($m[1]);
            break;
        case (preg_match('#^/tickets/([^/]+)/status$#', $endpoint, $m) && ($method === 'PATCH' || $method === 'POST')):
            TicketController::updateTicketStatus($m[1]);
            break;
        case (preg_match('#^/tickets/([^/]+)/messages$#', $endpoint, $m) && $method === 'POST'):
        case (preg_match('#^/ticket-messages/([^/]+)$#', $endpoint, $m) && $method === 'POST'):
            TicketController::addTicketMessage($m[1]);
            break;

        // --- Disputes & Courier Measurement Reconciliation ---
        case (($endpoint === '/disputes' || $endpoint === '/weight-disputes') && $method === 'GET'):
            ExtraController::listDisputes();
            break;
        case (($endpoint === '/weight-disputes/raise' || $endpoint === '/weight-disputes') && $method === 'POST'):
            ExtraController::raiseDispute();
            break;
        case (($endpoint === '/weight-disputes/accept' || preg_match('#^/dispute-respond/([^/]+)$#', $endpoint, $m)) && $method === 'POST'):
            $dInput = Response::getJsonInput();
            $disputeId = $m[1] ?? ($dInput['disputeId'] ?? $dInput['id'] ?? '');
            ExtraController::respondDispute($disputeId);
            break;

        // --- COD Remittances ---
        case (($endpoint === '/cod' || $endpoint === '/cod-remittances') && $method === 'GET'):
            ExtraController::listRemittances();
            break;

        // --- Reports & Exports ---
        case (preg_match('#^/reports/download/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            ExtraController::downloadReport($m[1]);
            break;
        case ($endpoint === '/reports/download' && $method === 'GET'):
            ExtraController::downloadReport($_GET['type'] ?? 'orders');
            break;
        case (preg_match('#^/reports/([^/]+)$#', $endpoint, $m) && $method === 'GET'):
            ExtraController::downloadReport($m[1]);
            break;

        // --- NDR ---
        case ($endpoint === '/ndr' && $method === 'GET'):
            ExtraController::listNdr();
            break;
        case (($endpoint === '/ndr/action' || preg_match('#^/ndr-action/([^/]+)$#', $endpoint, $m)) && $method === 'POST'):
            $nInput = Response::getJsonInput();
            $shipmentId = $m[1] ?? ($nInput['shipmentId'] ?? $nInput['id'] ?? '');
            ExtraController::actOnNdr($shipmentId);
            break;

        // --- Notifications ---
        case ($endpoint === '/notifications' && $method === 'GET'):
            ExtraController::listNotifications();
            break;
        case ($endpoint === '/notification-settings' && $method === 'GET'):
            ExtraController::getNotificationSettings();
            break;
        case ($endpoint === '/notification-settings' && ($method === 'PATCH' || $method === 'POST')):
            ExtraController::updateNotificationSettings();
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
        case (($endpoint === '/upload-logo' || $endpoint === '/settings/tracking-page/logo') && $method === 'POST'):
            ExtraController::uploadLogo();
            break;

        // --- Bank Accounts (TASK-P2-05) ---
        case ($endpoint === '/bank-accounts' && $method === 'GET'):
            ExtraController::listBankAccounts();
            break;
        case ($endpoint === '/bank-accounts' && $method === 'POST'):
            ExtraController::createBankAccount();
            break;
        case (preg_match('#^/bank-accounts/([^/]+)/default$#', $endpoint, $m) && $method === 'POST'):
            ExtraController::setDefaultBankAccount($m[1]);
            break;
        case (preg_match('#^/bank-accounts/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            ExtraController::deleteBankAccount($m[1]);
            break;

        // --- API Keys (TASK-P2-07) ---
        case ($endpoint === '/api-keys' && $method === 'GET'):
            ExtraController::listApiKeys();
            break;
        case ($endpoint === '/api-keys' && $method === 'POST'):
            ExtraController::createApiKey();
            break;
        case (preg_match('#^/api-keys/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            ExtraController::deleteApiKey($m[1]);
            break;

        // --- Outbound Webhooks (TASK-P2-07) ---
        case ($endpoint === '/webhooks' && $method === 'GET'):
            ExtraController::listWebhooks();
            break;
        case ($endpoint === '/webhooks' && $method === 'POST'):
            ExtraController::createWebhook();
            break;
        case (preg_match('#^/webhooks/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            ExtraController::deleteWebhook($m[1]);
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
        case (($endpoint === '/admin/users/margin' || $endpoint === '/admin/user-margin') && ($method === 'POST' || $method === 'PATCH' || $method === 'PUT')):
            AdminController::updateUserMargin();
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
        case (($endpoint === '/admin/commission' || $endpoint === '/admin-commission') && $method === 'GET'):
        case (preg_match('#^/admin-commission(?:/([^/]+))?$#', $endpoint, $m) && $method === 'GET'):
            AdminController::getCommissionRules($m[1] ?? null);
            break;
        case ($endpoint === '/admin/commission' && $method === 'POST'):
            AdminController::setCommissionRule();
            break;
        case (preg_match('#^/admin-commission/([^/]+)$#', $endpoint, $m) && $method === 'DELETE'):
            AdminController::deleteCommissionRule($m[1]);
            break;
        case (preg_match('#^/admin-commission/([^/]+)$#', $endpoint, $m) && $method === 'PATCH'):
            AdminController::updateCommissionRule($m[1]);
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
        case ($endpoint === '/admin/audit-logs' && $method === 'GET'):
            AdminController::listAuditLogs();
            break;

        default:
            Response::error("Endpoint '{$endpoint}' [{$method}] not found", 404);
            break;
    }
} catch (Throwable $e) {
    Response::error("Server Error: " . $e->getMessage(), 500);
}
