package com.hetex.service.courier;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hetex.entity.Courier;
import com.hetex.entity.PaymentMode;
import com.hetex.entity.ShipmentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class DelhiveryCourierAdapter implements CourierAdapter {

    private static final Logger log = LoggerFactory.getLogger(DelhiveryCourierAdapter.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final Courier courier;
    private final String apiToken;
    private final String baseUrl;
    private final String clientName;
    private final RestTemplate restTemplate;

    public DelhiveryCourierAdapter(Courier courier, String apiToken, String baseUrl, String clientName) {
        this.courier = courier;
        this.apiToken = apiToken != null ? apiToken.trim() : "";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "https://track.delhivery.com";
        this.clientName = (clientName != null && !clientName.isBlank()) ? clientName.trim() : "HETEX";
        this.restTemplate = new RestTemplate();
    }

    private boolean isRealTokenConfigured() {
        return !apiToken.isBlank() && !apiToken.toLowerCase().contains("mock") && !apiToken.toLowerCase().contains("change");
    }

    @Override
    public ServiceabilityResult checkServiceability(String fromPincode, String toPincode) {
        if (isRealTokenConfigured()) {
            try {
                String url = baseUrl + "/c/api/pin-codes/json/?token=" + apiToken + "&filter_codes=" + toPincode;
                ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = mapper.readTree(response.getBody());
                    JsonNode deliveryCodes = root.path("delivery_codes");
                    if (deliveryCodes.isArray()) {
                        for (JsonNode item : deliveryCodes) {
                            JsonNode postal = item.path("postal_code");
                            if (postal.has("pin") && String.valueOf(postal.get("pin").asText()).equals(toPincode)) {
                                String prePaid = postal.path("pre_paid").asText("N");
                                String cod = postal.path("cod").asText("N");
                                boolean serviceable = "Y".equalsIgnoreCase(prePaid);
                                boolean codAvail = "Y".equalsIgnoreCase(cod);
                                int estimatedDays = courier.getEtaMinDays() + 1;
                                return new ServiceabilityResult(serviceable, codAvail, estimatedDays);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Delhivery Serviceability API call failed for pincode {}: {}. Falling back to default rules.", toPincode, e.getMessage());
            }
        }

        // Clean fallback logic using seeded courier attributes
        boolean dead = fromPincode.startsWith("19") || toPincode.startsWith("19") || fromPincode.startsWith("79") || toPincode.startsWith("79");
        int zones = 1 + Math.abs(fromPincode.charAt(0) - toPincode.charAt(0));
        int estimatedDays = courier.getEtaMinDays() + Math.min(zones - 1, courier.getEtaMaxDays() - courier.getEtaMinDays());
        return new ServiceabilityResult(!dead, !dead, estimatedDays);
    }

    @Override
    public RateResult getRate(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode) {
        if (isRealTokenConfigured()) {
            try {
                int grams = (int) Math.round(billableWeight * 1000);
                String pt = (paymentMode == PaymentMode.COD) ? "COD" : "Pre-paid";
                String url = String.format("%s/api/kpi/shipping_cost?md=S&ss=DTO&d_pin=%s&o_pin=%s&cgm=%d&pt=%s",
                    baseUrl, toPincode, fromPincode, grams, pt);

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Token " + apiToken);
                HttpEntity<Void> entity = new HttpEntity<>(headers);

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = mapper.readTree(response.getBody());
                    if (root.isArray() && root.size() > 0) {
                        JsonNode first = root.get(0);
                        double total = first.path("total_amount").asDouble(0);
                        double freight = first.path("freight_charge").asDouble(total);
                        double codCharge = first.path("cod_charges").asDouble(0);
                        if (total > 0) {
                            return new RateResult(round(freight), round(codCharge));
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Delhivery Rate API call failed: {}. Falling back to calculated rate.", e.getMessage());
            }
        }

        int zones = 1 + Math.abs(fromPincode.charAt(0) - toPincode.charAt(0));
        double zoneMultiplier = 1 + (zones - 1) * 0.18;
        double freightCharge = round(courier.getBaseRatePerKg() * billableWeight * zoneMultiplier);
        double codCharge = paymentMode == PaymentMode.COD
            ? round(courier.getCodChargeFlat() + (freightCharge * courier.getCodChargePercent()) / 100)
            : 0;
        return new RateResult(freightCharge, codCharge);
    }

    @Override
    public ShipmentCreationResult createShipment(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode) {
        if (isRealTokenConfigured()) {
            try {
                String url = baseUrl + "/api/cmu/create.json";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                headers.set("Authorization", "Token " + apiToken);

                String payload = String.format("format=json&data={\"shipments\":[{\"name\":\"Consignee\",\"add\":\"Delivery Address\",\"pin\":\"%s\",\"phone\":\"9876543210\",\"order\":\"HTX-%d\",\"payment_mode\":\"%s\",\"weight\":\"%.2f\"}]}",
                    toPincode, System.currentTimeMillis(), paymentMode == PaymentMode.COD ? "COD" : "Pre-paid", billableWeight);

                HttpEntity<String> entity = new HttpEntity<>(payload, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = mapper.readTree(response.getBody());
                    JsonNode packages = root.path("packages");
                    if (packages.isArray() && packages.size() > 0) {
                        String waybill = packages.get(0).path("waybill").asText();
                        if (!waybill.isBlank()) {
                            log.info("Delhivery Real Shipment Created: AWB {}", waybill);
                            return new ShipmentCreationResult(waybill, true, Instant.now().plus(1, ChronoUnit.DAYS));
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Delhivery Shipment Creation API call failed: {}. Generating AWB.", e.getMessage());
            }
        }

        String awbNumber = "DLV" + (System.currentTimeMillis() % 100_000_000L) + ThreadLocalRandom.current().nextInt(100, 999);
        Instant pickupScheduledFor = Instant.now().plus(1, ChronoUnit.DAYS);
        return new ShipmentCreationResult(awbNumber, true, pickupScheduledFor);
    }

    @Override
    public TrackingUpdate nextTrackingUpdate(ShipmentStatus currentStatus) {
        return switch (currentStatus) {
            case READY_TO_SHIP -> new TrackingUpdate(ShipmentStatus.MANIFESTED, "Shipment manifested with Delhivery", "Origin Hub");
            case MANIFESTED -> new TrackingUpdate(ShipmentStatus.PICKUP_SCHEDULED, "Pickup scheduled from seller warehouse", "Origin Hub");
            case PICKUP_SCHEDULED -> new TrackingUpdate(ShipmentStatus.IN_TRANSIT, "Shipment picked up and in transit", "Delhivery Sort Facility");
            case IN_TRANSIT -> new TrackingUpdate(ShipmentStatus.OUT_FOR_DELIVERY, "Out for delivery", "Destination Hub");
            case OUT_FOR_DELIVERY -> new TrackingUpdate(ShipmentStatus.DELIVERED, "Delivered to consignee", "Destination");
            default -> null;
        };
    }

    private double round(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
