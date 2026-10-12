<?php
/**
 * Rate & Logistics Controller - Serviceability, Rate Quotes & Calculations
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

class RateController {

    public static function calculateRates(): void {
        $auth = AuthMiddleware::authenticate();
        $data = Response::getJsonInput();

        $pickupPincode = trim($data['pickupPincode'] ?? '');
        $deliveryPincode = trim($data['deliveryPincode'] ?? '');
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

        $db = Database::getConnection();

        // Fetch active couriers
        $couriers = $db->query("SELECT * FROM couriers WHERE active = 1")->fetchAll();

        // Fetch commission rule (fallback)
        $ruleStmt = $db->query("SELECT * FROM commission_rules WHERE courier_id IS NULL ORDER BY created_at DESC LIMIT 1");
        $fallbackRule = $ruleStmt->fetch();
        $marginPercent = $fallbackRule ? (float)$fallbackRule['margin_value'] : 10.0;

        $quotes = [];

        foreach ($couriers as $courier) {
            $baseRatePerKg = (float)$courier['base_rate_per_kg'];
            $baseFreight = ceil($billableWeight) * $baseRatePerKg;

            // COD Charge
            $codCharge = 0.0;
            if ($paymentMode === 'COD') {
                $flat = (float)$courier['cod_charge_flat'];
                $pct = ((float)$courier['cod_charge_percent'] / 100.0) * $codAmount;
                $codCharge = max($flat, $pct);
            }

            // Platform Commission
            $markup = ($baseFreight + $codCharge) * ($marginPercent / 100.0);
            $totalRate = round($baseFreight + $codCharge + $markup, 2);

            $quotes[] = [
                'courierId' => $courier['id'],
                'courierName' => $courier['name'],
                'courierCode' => $courier['code'],
                'logoColor' => $courier['logo_color'],
                'baseFreight' => round($baseFreight, 2),
                'codCharge' => round($codCharge, 2),
                'totalRate' => $totalRate,
                'rating' => (float)$courier['rating'],
                'etaMinDays' => (int)$courier['eta_min_days'],
                'etaMaxDays' => (int)$courier['eta_max_days'],
                'rtoRiskPercent' => (float)$courier['rto_risk_percent'],
                'billableWeight' => round($billableWeight, 2)
            ];
        }

        // Sort by total rate ascending
        usort($quotes, fn($a, $b) => $a['totalRate'] <=> $b['totalRate']);

        Response::json([
            'quotes' => $quotes,
            'volumetricWeight' => round($volumetricWeight, 2),
            'billableWeight' => round($billableWeight, 2)
        ]);
    }
}
