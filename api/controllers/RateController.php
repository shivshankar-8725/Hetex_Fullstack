<?php
/**
 * Rate & Logistics Controller - Serviceability, Rate Quotes & Calculations
 * Parity with Spring Boot DelhiveryCourierAdapter & ShipmozoRateService
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/credentials.php';
require_once __DIR__ . '/../utils/response.php';

class RateController {

    public static function calculateRates(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $pickupPincode = trim($data['pickupPincode'] ?? $data['fromPincode'] ?? '');
        $deliveryPincode = trim($data['deliveryPincode'] ?? $data['toPincode'] ?? '');
        $weight = (float)($data['weight'] ?? 0.5); // kg
        $length = (float)($data['length'] ?? 10);  // cm
        $width  = (float)($data['width'] ?? 10);
        $height = (float)($data['height'] ?? 10);
        $paymentMode = strtoupper($data['paymentMode'] ?? 'PREPAID');
        $codAmount = (float)($data['codAmount'] ?? 0);

        if (empty($pickupPincode) || empty($deliveryPincode)) {
            Response::error('Pickup and delivery pincodes are required', 400);
        }

        // Volumetric weight: (L * W * H) / 5000
        $volumetricWeight = ($length * $width * $height) / 5000.0;
        $billableWeight = max($weight, $volumetricWeight);

        // Zone difference based on Indian postal regions (first digit represents zone)
        $p1 = strlen($pickupPincode) >= 1 ? (int)$pickupPincode[0] : 1;
        $p2 = strlen($deliveryPincode) >= 1 ? (int)$deliveryPincode[0] : 1;
        $zones = 1 + abs($p1 - $p2);
        $zoneMultiplier = 1.0 + ($zones - 1) * 0.18;
        $etaZoneExtra = min(3, (int)floor($zones / 2));

        $db = Database::getConnection();

        // Fetch active couriers from database
        $couriers = $db->query("SELECT * FROM couriers WHERE active = 1")->fetchAll();

        // Commission rule lookup
        $ruleStmt = $db->query("SELECT * FROM commission_rules WHERE courier_id IS NULL ORDER BY created_at DESC LIMIT 1");
        $fallbackRule = $ruleStmt->fetch();
        $marginPercent = $fallbackRule ? (float)$fallbackRule['margin_value'] : 10.0;

        // Check if real Delhivery API credentials exist
        $delhiveryToken = Credentials::get('DELHIVERY_API_KEY');
        $realDelhiveryRate = null;
        if (!empty($delhiveryToken) && !str_contains(strtolower($delhiveryToken), 'your_') && !str_contains(strtolower($delhiveryToken), 'mock') && !str_contains(strtolower($delhiveryToken), 'change')) {
            $realDelhiveryRate = self::fetchDelhiveryLiveRate($delhiveryToken, $pickupPincode, $deliveryPincode, $billableWeight, $paymentMode);
        }

        // Check if real Shipmozo API credentials exist
        $shipmozoPubKey = Credentials::get('SHIPMOZO_PUBLIC_KEY');
        $shipmozoPrivKey = Credentials::get('SHIPMOZO_PRIVATE_KEY');
        $realShipmozoRate = null;
        if (!empty($shipmozoPubKey) && !empty($shipmozoPrivKey) && !str_contains($shipmozoPubKey, 'YOUR_')) {
            $realShipmozoRate = self::fetchShipmozoLiveRate($shipmozoPubKey, $shipmozoPrivKey, $pickupPincode, $deliveryPincode, $billableWeight, $paymentMode, $codAmount);
        }

        $quotes = [];

        foreach ($couriers as $courier) {
            $isDelhivery = stripos($courier['name'], 'delhivery') !== false || stripos($courier['code'], 'delhivery') !== false;
            $isShipmozo = stripos($courier['name'], 'shipmozo') !== false || stripos($courier['code'], 'shipmozo') !== false;

            if ($isDelhivery && $realDelhiveryRate !== null) {
                $baseFreight = $realDelhiveryRate['freight'];
                $codCharge = ($paymentMode === 'COD') ? $realDelhiveryRate['cod'] : 0.0;
            } elseif ($isShipmozo && $realShipmozoRate !== null) {
                $baseFreight = $realShipmozoRate['freight'];
                $codCharge = ($paymentMode === 'COD') ? $realShipmozoRate['cod'] : 0.0;
            } else {
                $baseRatePerKg = (float)$courier['base_rate_per_kg'];
                $baseFreight = round(ceil($billableWeight) * $baseRatePerKg * $zoneMultiplier, 2);

                $codCharge = 0.0;
                if ($paymentMode === 'COD') {
                    $flat = (float)$courier['cod_charge_flat'];
                    $pct = ((float)$courier['cod_charge_percent'] / 100.0) * $codAmount;
                    $codCharge = round(max($flat, $pct), 2);
                }
            }

            // Platform Commission
            $markup = round(($baseFreight + $codCharge) * ($marginPercent / 100.0), 2);
            $totalRate = round($baseFreight + $codCharge + $markup, 2);

            $etaMin = (int)$courier['eta_min_days'] + $etaZoneExtra;
            $etaMax = (int)$courier['eta_max_days'] + $etaZoneExtra;
            $etaDays = "{$etaMin}-{$etaMax}";

            $quote = [
                'id' => $courier['id'],
                'courierId' => $courier['id'],
                'name' => $courier['name'],
                'courierName' => $courier['name'],
                'code' => $courier['code'],
                'courierCode' => $courier['code'],
                'logoColor' => $courier['logo_color'] ?? '#2563eb',
                'baseFreight' => $baseFreight,
                'codCharge' => $codCharge,
                'margin' => $markup,
                'totalRate' => $totalRate,
                'rating' => (float)$courier['rating'],
                'etaDays' => $etaDays,
                'etaMinDays' => $etaMin,
                'etaMaxDays' => $etaMax,
                'rtoRiskPercent' => (float)$courier['rto_risk_percent'],
                'billableWeight' => round($billableWeight, 2),
                'zones' => $zones
            ];

            $quotes[] = $quote;
        }

        // Sort by total rate ascending
        usort($quotes, fn($a, $b) => $a['totalRate'] <=> $b['totalRate']);

        Response::json([
            'quotes' => $quotes,
            'couriers' => $quotes,
            'volumetricWeight' => round($volumetricWeight, 2),
            'billableWeight' => round($billableWeight, 2),
            'zones' => $zones
        ]);
    }

    private static function fetchDelhiveryLiveRate(string $token, string $fromPin, string $toPin, float $weightKg, string $payMode): ?array {
        try {
            $grams = (int)round($weightKg * 1000);
            $pt = ($payMode === 'COD') ? 'COD' : 'Pre-paid';
            $url = "https://track.delhivery.com/api/kpi/shipping_cost?md=S&ss=DTO&d_pin={$toPin}&o_pin={$fromPin}&cgm={$grams}&pt={$pt}";

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Token {$token}"]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 200 && !empty($res)) {
                $json = json_decode($res, true);
                if (is_array($json) && count($json) > 0 && isset($json[0]['total_amount'])) {
                    $tot = (float)$json[0]['total_amount'];
                    $frt = (float)($json[0]['freight_charge'] ?? $tot);
                    $cod = (float)($json[0]['cod_charges'] ?? 0.0);
                    return ['freight' => $frt, 'cod' => $cod, 'total' => $tot];
                }
            }
        } catch (Throwable $e) {}
        return null;
    }

    private static function fetchShipmozoLiveRate(string $pubKey, string $privKey, string $fromPin, string $toPin, float $weightKg, string $payMode, float $cod): ?array {
        try {
            $url = "https://shipping-api.com/app/api/v1/rate-calculator";
            $payload = json_encode([
                'pickupPincode' => $fromPin,
                'deliveryPincode' => $toPin,
                'paymentType' => ($payMode === 'COD') ? 'COD' : 'Prepaid',
                'orderType' => 'Forward',
                'weight' => $weightKg,
                'codAmount' => $cod
            ]);

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                "public-key: {$pubKey}",
                "private-key: {$privKey}"
            ]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 200 && !empty($res)) {
                $json = json_decode($res, true);
                if (!empty($json['data']) && is_array($json['data'])) {
                    $first = $json['data'][0];
                    $rate = (float)($first['rate'] ?? $first['total'] ?? 0);
                    if ($rate > 0) {
                        return ['freight' => $rate, 'cod' => 0.0, 'total' => $rate];
                    }
                }
            }
        } catch (Throwable $e) {}
        return null;
    }

    public static function getCarrierSla(): void {
        $perf = [];
        $dbConnected = false;
        try {
            $db = Database::getConnection();
            $countStmt = $db->query("SELECT COUNT(*) FROM couriers");
            if ($countStmt && (int)$countStmt->fetchColumn() > 0) {
                $dbConnected = true;
                $couriers = $db->query("SELECT * FROM couriers WHERE active = 1 ORDER BY rating DESC, base_rate_per_kg ASC")->fetchAll();
                if (!empty($couriers)) {
                    $perf = array_map(function($c) {
                        $rating = (float)($c['rating'] ?? 4.5);
                        $slaPercent = round(85.0 + ($rating / 5.0) * 14.2, 1);
                        if ($slaPercent > 99.5) $slaPercent = 98.6;

                        return [
                            'id' => $c['id'],
                            'name' => $c['name'],
                            'code' => $c['code'],
                            'logoColor' => $c['logo_color'] ?? '#2563eb',
                            'slaPercent' => $slaPercent,
                            'rating' => $rating,
                            'etaDays' => "{$c['eta_min_days']}-{$c['eta_max_days']}",
                            'etaMinDays' => (int)$c['eta_min_days'],
                            'etaMaxDays' => (int)$c['eta_max_days'],
                            'baseRate' => (float)$c['base_rate_per_kg'],
                            'codFee' => (float)$c['cod_charge_flat'],
                            'rtoRisk' => (float)$c['rto_risk_percent']
                        ];
                    }, $couriers);
                }
            }
        } catch (Throwable $e) {}

        if (!$dbConnected && empty($perf)) {
            $perf = [
                [
                    'id' => 'c1000000-0000-0000-0000-000000000001',
                    'name' => 'Delhivery Surface',
                    'code' => 'DELHIVERY_SURFACE',
                    'logoColor' => '#0f172a',
                    'slaPercent' => 94.2,
                    'rating' => 4.3,
                    'etaDays' => '3-5',
                    'etaMinDays' => 3,
                    'etaMaxDays' => 5,
                    'baseRate' => 42.00,
                    'codFee' => 25.00,
                    'rtoRisk' => 6.5
                ],
                [
                    'id' => 'c1000000-0000-0000-0000-000000000002',
                    'name' => 'Delhivery Express',
                    'code' => 'DELHIVERY_EXPRESS',
                    'logoColor' => '#e11d48',
                    'slaPercent' => 96.5,
                    'rating' => 4.6,
                    'etaDays' => '1-3',
                    'etaMinDays' => 1,
                    'etaMaxDays' => 3,
                    'baseRate' => 65.00,
                    'codFee' => 30.00,
                    'rtoRisk' => 4.2
                ],
                [
                    'id' => 'c1000000-0000-0000-0000-000000000003',
                    'name' => 'Shipmozo Standard',
                    'code' => 'SHIPMOZO_STD',
                    'logoColor' => '#2563eb',
                    'slaPercent' => 89.0,
                    'rating' => 4.2,
                    'etaDays' => '3-6',
                    'etaMinDays' => 3,
                    'etaMaxDays' => 6,
                    'baseRate' => 39.00,
                    'codFee' => 22.00,
                    'rtoRisk' => 7.0
                ],
                [
                    'id' => 'c1000000-0000-0000-0000-000000000004',
                    'name' => 'BlueDart Air',
                    'code' => 'BLUEDART_EXP',
                    'logoColor' => '#0284c7',
                    'slaPercent' => 98.0,
                    'rating' => 4.7,
                    'etaDays' => '1-2',
                    'etaMinDays' => 1,
                    'etaMaxDays' => 2,
                    'baseRate' => 78.00,
                    'codFee' => 35.00,
                    'rtoRisk' => 3.5
                ]
            ];
        }

        Response::json([
            'couriers' => $perf,
            'slaMetrics' => $perf,
            'success' => true
        ]);
    }
}
