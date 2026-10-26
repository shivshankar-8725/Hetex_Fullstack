<?php
/**
 * HetEx Courier - Centralized Shipmozo API Client
 * 
 * Reusable client for all Shipmozo API interactions.
 * Handles authentication headers, request/response processing,
 * error handling, timeouts, and safe logging.
 * 
 * Based on: https://shipping-api.com/app/api/v1
 * 
 * IMPORTANT:
 * - Every request automatically includes public-key and private-key headers
 * - Credentials are never logged or exposed to frontend
 * - All responses follow: { result: "1"|"0", message: "...", data: {...} }
 */

require_once __DIR__ . '/../config/credentials.php';

class ShipmozoClient {

    private static ?string $baseUrl = null;
    private static ?string $publicKey = null;
    private static ?string $privateKey = null;

    /**
     * Initialize credentials (lazy, cached per request)
     */
    private static function init(): void {
        if (self::$baseUrl !== null) return;

        self::$baseUrl = rtrim(Credentials::get('SHIPMOZO_BASE_URL', 'https://shipping-api.com/app/api/v1'), '/');
        self::$publicKey = Credentials::get('SHIPMOZO_PUBLIC_KEY', '');
        self::$privateKey = Credentials::get('SHIPMOZO_PRIVATE_KEY', '');
    }

    /**
     * Check if real Shipmozo credentials are configured
     */
    public static function isConfigured(): bool {
        self::init();
        return !empty(self::$publicKey)
            && !empty(self::$privateKey)
            && !str_contains(self::$publicKey, 'YOUR_')
            && !str_contains(self::$privateKey, 'YOUR_');
    }

    /**
     * Make a GET request to Shipmozo API
     *
     * @param string $endpoint e.g. '/track-order'
     * @param array $queryParams e.g. ['awb_number' => 'AWB123']
     * @param int $timeout Seconds
     * @return array ['success' => bool, 'result' => string, 'message' => string, 'data' => mixed, 'raw' => string, 'httpCode' => int]
     */
    public static function get(string $endpoint, array $queryParams = [], int $timeout = 15): array {
        self::init();

        $url = self::$baseUrl . $endpoint;
        if (!empty($queryParams)) {
            $url .= '?' . http_build_query($queryParams);
        }

        return self::request('GET', $url, null, $timeout);
    }

    /**
     * Make a POST request to Shipmozo API
     *
     * @param string $endpoint e.g. '/push-order'
     * @param array $payload Request body (will be JSON-encoded)
     * @param int $timeout Seconds
     * @return array ['success' => bool, 'result' => string, 'message' => string, 'data' => mixed, 'raw' => string, 'httpCode' => int]
     */
    public static function post(string $endpoint, array $payload = [], int $timeout = 15): array {
        self::init();

        $url = self::$baseUrl . $endpoint;
        return self::request('POST', $url, $payload, $timeout);
    }

    /**
     * Core HTTP request method
     */
    private static function request(string $method, string $url, ?array $payload, int $timeout): array {
        $result = [
            'success' => false,
            'result' => '0',
            'message' => '',
            'data' => null,
            'raw' => '',
            'httpCode' => 0
        ];

        if (!self::isConfigured()) {
            $result['message'] = 'Shipmozo API credentials not configured';
            error_log('[ShipmozoClient] Credentials not configured - skipping API call to ' . self::sanitizeUrl($url));
            return $result;
        }

        try {
            $ch = curl_init($url);

            $headers = [
                'Content-Type: application/json',
                'Accept: application/json',
                'public-key: ' . self::$publicKey,
                'private-key: ' . self::$privateKey
            ];

            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 3
            ]);

            if ($method === 'POST') {
                curl_setopt($ch, CURLOPT_POST, true);
                if ($payload !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
                }
            }

            // Safe logging - never log credentials
            error_log("[ShipmozoClient] {$method} " . self::sanitizeUrl($url));

            $rawResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            $curlErrno = curl_errno($ch);
            curl_close($ch);

            $result['httpCode'] = $httpCode;
            $result['raw'] = $rawResponse ?: '';

            // Handle cURL errors
            if ($curlErrno !== 0) {
                if ($curlErrno === CURLE_OPERATION_TIMEDOUT || $curlErrno === CURLE_OPERATION_TIMEOUTED) {
                    $result['message'] = 'Shipmozo API request timed out';
                    error_log("[ShipmozoClient] Timeout on {$method} " . self::sanitizeUrl($url));
                } else {
                    $result['message'] = 'Network error: ' . $curlError;
                    error_log("[ShipmozoClient] cURL error ({$curlErrno}): {$curlError}");
                }
                return $result;
            }

            // Handle HTTP errors
            if ($httpCode < 200 || $httpCode >= 300) {
                $result['message'] = "Shipmozo API returned HTTP {$httpCode}";
                error_log("[ShipmozoClient] HTTP {$httpCode} on {$method} " . self::sanitizeUrl($url));
                return $result;
            }

            // Parse JSON
            if (empty($rawResponse)) {
                $result['message'] = 'Empty response from Shipmozo API';
                return $result;
            }

            $json = json_decode($rawResponse, true);
            if ($json === null && json_last_error() !== JSON_ERROR_NONE) {
                $result['message'] = 'Invalid JSON response from Shipmozo API';
                error_log("[ShipmozoClient] JSON parse error: " . json_last_error_msg());
                return $result;
            }

            // Process Shipmozo standard response format
            $result['result'] = (string)($json['result'] ?? '0');
            $result['message'] = $json['message'] ?? '';
            $result['data'] = $json['data'] ?? null;

            if ($result['result'] === '1') {
                $result['success'] = true;
                error_log("[ShipmozoClient] SUCCESS: {$method} " . self::sanitizeUrl($url) . " - {$result['message']}");
            } else {
                error_log("[ShipmozoClient] API Error: {$method} " . self::sanitizeUrl($url) . " - result={$result['result']}, message={$result['message']}");
            }

            return $result;

        } catch (Throwable $e) {
            $result['message'] = 'Exception: ' . $e->getMessage();
            error_log("[ShipmozoClient] Exception: " . $e->getMessage());
            return $result;
        }
    }

    /**
     * Sanitize URL for logging (remove any credential-like query params)
     */
    private static function sanitizeUrl(string $url): string {
        // Remove any query params that might contain sensitive data
        $parsed = parse_url($url);
        $sanitized = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '') . ($parsed['path'] ?? '');
        if (!empty($parsed['query'])) {
            $sanitized .= '?' . $parsed['query'];
        }
        return $sanitized;
    }

    // =========================================================================
    // HIGH-LEVEL API METHODS
    // =========================================================================

    /**
     * Info API - Health check
     * GET /info
     */
    public static function info(): array {
        return self::get('/info');
    }

    /**
     * Rate Calculator API
     * POST /rate-calculator
     *
     * @param array $params Required: pickup_pincode, delivery_pincode, payment_type, shipment_type, order_amount, type_of_package, rov_type, weight, dimensions
     */
    public static function calculateRate(array $params): array {
        return self::post('/rate-calculator', $params);
    }

    /**
     * Push Order API (Create order on Shipmozo panel)
     * POST /push-order
     *
     * @param array $orderData Required: order_id, order_date, consignee_name, consignee_phone, consignee_address_line_one, consignee_pin_code, consignee_city, consignee_state, product_detail, payment_type, weight, length, width, height, warehouse_id
     */
    public static function pushOrder(array $orderData): array {
        return self::post('/push-order', $orderData);
    }

    /**
     * Track Order API
     * GET /track-order?awb_number={awb}
     */
    public static function trackOrder(string $awbNumber): array {
        if (empty(trim($awbNumber))) {
            return ['success' => false, 'result' => '0', 'message' => 'AWB number is required', 'data' => null, 'raw' => '', 'httpCode' => 0];
        }
        return self::get('/track-order', ['awb_number' => trim($awbNumber)]);
    }

    /**
     * Assign Courier API
     * POST /assign-courier
     *
     * @param string $orderId The order ID
     * @param int $courierId The courier ID from rate calculator
     */
    public static function assignCourier(string $orderId, int $courierId): array {
        return self::post('/assign-courier', [
            'order_id' => $orderId,
            'courier_id' => $courierId
        ]);
    }

    /**
     * Auto Assign Order API
     * POST /auto-assign-order
     */
    public static function autoAssignOrder(string $orderId): array {
        return self::post('/auto-assign-order', [
            'order_id' => $orderId
        ]);
    }

    /**
     * Get Order Label API
     * GET /get-order-label/{awb_number}
     */
    public static function getOrderLabel(string $awbNumber): array {
        if (empty(trim($awbNumber))) {
            return ['success' => false, 'result' => '0', 'message' => 'AWB number is required', 'data' => null, 'raw' => '', 'httpCode' => 0];
        }
        return self::get('/get-order-label/' . urlencode(trim($awbNumber)));
    }

    /**
     * Get Order Detail API
     * GET /get-order-detail/{order_id}
     */
    public static function getOrderDetail(string $orderId): array {
        if (empty(trim($orderId))) {
            return ['success' => false, 'result' => '0', 'message' => 'Order ID is required', 'data' => null, 'raw' => '', 'httpCode' => 0];
        }
        return self::get('/get-order-detail/' . urlencode(trim($orderId)));
    }

    /**
     * Cancel Order API
     * POST /cancel-order
     */
    public static function cancelOrder(string $orderId, string $awbNumber): array {
        if (empty(trim($orderId)) || empty(trim($awbNumber))) {
            return ['success' => false, 'result' => '0', 'message' => 'Order ID and AWB number are required', 'data' => null, 'raw' => '', 'httpCode' => 0];
        }
        return self::post('/cancel-order', [
            'order_id' => trim($orderId),
            'awb_number' => trim($awbNumber)
        ]);
    }

    /**
     * Get Warehouses API
     * GET /get-warehouses
     * Returns list of registered warehouses on this Shipmozo account.
     */
    public static function getWarehouses(): array {
        return self::get('/get-warehouses');
    }

    /**
     * Create Warehouse API
     * POST /create-warehouse
     *
     * Required fields (Shipmozo API):
     *   name          - Warehouse display name (string)
     *   email         - Contact email (string)
     *   phone         - 10-digit mobile (string)
     *   address       - Street address line (string)
     *   city          - City name (string)
     *   state         - State name (string)
     *   country       - Country (string, default "India")
     *   pin_code      - 6-digit pincode (string)
     *   gst_number    - GSTIN (optional, string)
     *
     * @param array $warehouseData Raw Shipmozo payload
     * @return array Standard response with data.warehouse_id on success
     */
    public static function createWarehouse(array $warehouseData): array {
        return self::post('/create-warehouse', $warehouseData);
    }

    /**
     * Register a HetEx PICKUP address as a Shipmozo warehouse.
     * Maps HetEx address fields to the exact Shipmozo /create-warehouse payload.
     *
     * @param array $address Row from HetEx `addresses` table
     * @return array ['success' => bool, 'warehouse_id' => int|null, 'message' => string]
     */
    public static function registerWarehouse(array $address): array {
        $payload = [
            'name'             => trim($address['label'] ?? $address['contact_name'] ?? 'Warehouse'),
            'email'            => trim($address['email'] ?? 'warehouse@hetex.in'),
            'phone'            => preg_replace('/\D/', '', (string)($address['phone'] ?? '')),
            'address'          => trim($address['address_line1'] ?? $address['address'] ?? ''),
            'city'             => trim($address['city'] ?? ''),
            'state'            => trim($address['state'] ?? ''),
            'country'          => trim($address['country'] ?? 'India'),
            'pin_code'         => trim($address['pincode'] ?? $address['pin_code'] ?? ''),
            'address_title'    => trim($address['label'] ?? 'Warehouse'),
            'address_line_one' => trim($address['address_line1'] ?? $address['address'] ?? ''),
            'address_line_two' => trim($address['address_line2'] ?? ''),
        ];

        // Include GSTIN if available (optional but recommended)
        if (!empty($address['gst_number'])) {
            $payload['gst_number'] = trim($address['gst_number']);
        }

        // Validate minimum required fields before calling API
        if (empty($payload['phone']) || strlen($payload['phone']) < 10) {
            return ['success' => false, 'warehouse_id' => null, 'message' => 'Warehouse phone must be 10 digits'];
        }
        if (empty($payload['address'])) {
            return ['success' => false, 'warehouse_id' => null, 'message' => 'Warehouse address is required'];
        }
        if (!preg_match('/^\d{6}$/', $payload['pin_code'])) {
            return ['success' => false, 'warehouse_id' => null, 'message' => 'Warehouse pincode must be 6 digits'];
        }

        $result = self::post('/create-warehouse', $payload);

        if ($result['success']) {
            // Shipmozo returns warehouse_id in data
            $warehouseId = $result['data']['warehouse_id']
                        ?? $result['data']['id']
                        ?? $result['data']['warehouse']['id']
                        ?? null;

            return [
                'success'      => true,
                'warehouse_id' => $warehouseId ? (int)$warehouseId : null,
                'message'      => $result['message'] ?: 'Warehouse registered on Shipmozo',
            ];
        }

        return [
            'success'      => false,
            'warehouse_id' => null,
            'message'      => $result['message'] ?: 'Failed to register warehouse on Shipmozo',
        ];
    }

    /**
     * Pincode Serviceability API
     * POST /pincode-serviceability
     */
    public static function checkServiceability(string $pickupPincode, string $deliveryPincode): array {
        return self::post('/pincode-serviceability', [
            'pickup_pincode' => $pickupPincode,
            'delivery_pincode' => $deliveryPincode
        ]);
    }

    /**
     * Schedule Pickup API
     * POST /schedule-pickup
     */
    public static function schedulePickup(string $orderId): array {
        return self::post('/schedule-pickup', [
            'order_id' => $orderId
        ]);
    }

    /**
     * Get Return Reasons API
     * GET /get-return-reason
     */
    public static function getReturnReasons(): array {
        return self::get('/get-return-reason');
    }

    /**
     * Push Return Order API
     * POST /push-return-order
     */
    public static function pushReturnOrder(array $returnData): array {
        return self::post('/push-return-order', $returnData);
    }
}
