package com.hetex.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayPaymentService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayPaymentService.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    @Value("${hetex.razorpay.key-id:rzp_test_mock_key}")
    private String keyId;

    @Value("${hetex.razorpay.key-secret:mock_secret_key}")
    private String keySecret;

    @Value("${hetex.razorpay.webhook-secret:mock_webhook_secret}")
    private String webhookSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    // -----------------------------------------------------------------------
    // Public records
    // -----------------------------------------------------------------------

    public record PaymentOrderResult(String razorpayOrderId, double amountRupees, String currency, String keyId) {}

    public record QrPaymentResult(
        String qrCodeId,
        String imageUrl,
        String razorpayOrderId,
        double amountRupees,
        String currency,
        boolean isReal
    ) {}

    // -----------------------------------------------------------------------
    // Configuration helpers
    // -----------------------------------------------------------------------

    private boolean isRealKeyConfigured() {
        return keyId != null && !keyId.isBlank()
            && !keyId.toLowerCase().contains("mock")
            && !keyId.toLowerCase().contains("change");
    }

    private boolean isRealWebhookSecretConfigured() {
        return webhookSecret != null && !webhookSecret.isBlank()
            && !webhookSecret.toLowerCase().contains("mock")
            && !webhookSecret.toLowerCase().contains("change");
    }

    // -----------------------------------------------------------------------
    // Order creation (Checkout flow)
    // -----------------------------------------------------------------------

    /**
     * Creates a Razorpay order via the real API (POST /v1/orders).
     * Falls back to a local placeholder ID when real keys are not configured.
     */
    public PaymentOrderResult createOrder(double amountRupees) {
        long amountPaise = Math.round(amountRupees * 100);
        String receipt = "rcpt_" + System.currentTimeMillis();

        if (isRealKeyConfigured()) {
            try {
                String url = "https://api.razorpay.com/v1/orders";
                HttpHeaders headers = createAuthHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> body = new HashMap<>();
                body.put("amount", amountPaise);
                body.put("currency", "INR");
                body.put("receipt", receipt);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String orderId = (String) response.getBody().get("id");
                    log.info("Created real Razorpay order: {} for amount ₹{}", orderId, amountRupees);
                    return new PaymentOrderResult(orderId, amountRupees, "INR", keyId);
                }
            } catch (Exception e) {
                log.warn("Failed to create real Razorpay order via API: {}. Using local placeholder.", e.getMessage());
            }
        }

        String fallbackOrderId = "order_" + System.currentTimeMillis();
        return new PaymentOrderResult(fallbackOrderId, amountRupees, "INR", keyId);
    }

    // -----------------------------------------------------------------------
    // QR code payment flow (POST /v1/payments/qr-codes)
    // -----------------------------------------------------------------------

    /**
     * Creates a Razorpay QR code payment for the given amount.
     * The QR image_url can be displayed directly in the browser — the user scans
     * it with any UPI app and completes payment.  Razorpay fires a webhook once
     * payment is received, which the /api/wallet/webhook endpoint processes.
     *
     * Falls back to a descriptive placeholder when real keys are not configured.
     */
    public QrPaymentResult createQrPayment(double amountRupees, String description) {
        long amountPaise = Math.round(amountRupees * 100);

        if (isRealKeyConfigured()) {
            try {
                String url = "https://api.razorpay.com/v1/payments/qr-codes";
                HttpHeaders headers = createAuthHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                // Create a backing order first so the amount is fixed
                PaymentOrderResult order = createOrder(amountRupees);

                Map<String, Object> body = new HashMap<>();
                body.put("type", "upi_qr");
                body.put("name", "Hetex Wallet Recharge");
                body.put("description", description != null ? description : "Add money to Hetex wallet");
                body.put("usage", "single_use");
                body.put("fixed_amount", true);
                body.put("payment_amount", amountPaise);
                body.put("close_by", System.currentTimeMillis() / 1000 + 3600); // 1-hour expiry

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = mapper.readTree(response.getBody());
                    String qrId = root.path("id").asText();
                    String imageUrl = root.path("image_url").asText();

                    if (!qrId.isBlank() && !imageUrl.isBlank()) {
                        log.info("Created Razorpay QR code: {} for ₹{}", qrId, amountRupees);
                        return new QrPaymentResult(qrId, imageUrl, order.razorpayOrderId(), amountRupees, "INR", true);
                    }
                }
            } catch (Exception e) {
                log.warn("Razorpay QR creation API failed: {}. Using demo placeholder.", e.getMessage());
            }
        }

        // Development / unconfigured fallback — shows UPI instructions
        String placeholderImage = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=hetex@upi%26pn=Hetex%26am=" + amountRupees + "%26tn=WalletRecharge";
        return new QrPaymentResult(
            "qr_demo_" + System.currentTimeMillis(),
            placeholderImage,
            "order_demo_" + System.currentTimeMillis(),
            amountRupees,
            "INR",
            false
        );
    }

    // -----------------------------------------------------------------------
    // Signature verification (Checkout callback)
    // -----------------------------------------------------------------------

    /**
     * Verifies the Razorpay payment signature using HMAC-SHA256.
     * The data string is: razorpay_order_id + "|" + razorpay_payment_id
     * This is Razorpay's documented verification algorithm.
     */
    public boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        if (razorpaySignature == null || razorpaySignature.isBlank()) {
            // No signature — only acceptable in unconfigured / demo mode
            log.warn("Empty Razorpay signature received for order {}. Accepting in demo mode only.", razorpayOrderId);
            return !isRealKeyConfigured(); // reject empty sigs when real keys are set
        }

        try {
            String data = razorpayOrderId + "|" + razorpayPaymentId;
            Mac sha256HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256HMAC.init(secretKey);
            byte[] hash = sha256HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            boolean match = MessageDigest.isEqual(
                hexString.toString().getBytes(StandardCharsets.UTF_8),
                razorpaySignature.getBytes(StandardCharsets.UTF_8)
            );
            if (!match) {
                log.error("Razorpay checkout signature verification FAILED for order {}. Possible fraud attempt.", razorpayOrderId);
            }
            return match;
        } catch (Exception e) {
            log.error("Error during Razorpay signature verification: {}", e.getMessage());
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Webhook signature verification
    // -----------------------------------------------------------------------

    /**
     * Verifies the X-Razorpay-Signature header on incoming webhooks.
     * Razorpay signs the raw body with the webhook secret using HMAC-SHA256.
     */
    public boolean verifyWebhookSignature(String rawBody, String razorpaySignatureHeader) {
        if (!isRealWebhookSecretConfigured()) {
            // No webhook secret configured — accept in demo/dev mode
            log.warn("Webhook secret not configured. Accepting webhook without signature check (dev mode).");
            return true;
        }
        if (razorpaySignatureHeader == null || razorpaySignatureHeader.isBlank()) {
            log.error("Missing X-Razorpay-Signature on webhook request");
            return false;
        }
        try {
            Mac sha256HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256HMAC.init(secretKey);
            byte[] hash = sha256HMAC.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            boolean match = MessageDigest.isEqual(
                hexString.toString().getBytes(StandardCharsets.UTF_8),
                razorpaySignatureHeader.getBytes(StandardCharsets.UTF_8)
            );
            if (!match) {
                log.error("Razorpay webhook signature FAILED. Possible replay attack.");
            }
            return match;
        } catch (Exception e) {
            log.error("Error verifying Razorpay webhook signature: {}", e.getMessage());
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Fetch real payment amount from Razorpay (for webhook verification)
    // -----------------------------------------------------------------------

    /**
     * Fetches the authoritative payment amount from Razorpay (in paise).
     * We use this to credit the EXACT amount Razorpay received, not what the
     * frontend claimed — preventing over-crediting.
     *
     * @return amount in rupees, or -1 if fetch failed
     */
    public double fetchPaymentAmount(String razorpayPaymentId) {
        if (!isRealKeyConfigured()) return -1;
        try {
            String url = "https://api.razorpay.com/v1/payments/" + razorpayPaymentId;
            HttpHeaders headers = createAuthHeaders();
            ResponseEntity<Map> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object amountObj = response.getBody().get("amount");
                if (amountObj instanceof Number) {
                    long amountPaise = ((Number) amountObj).longValue();
                    return amountPaise / 100.0;
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch payment amount for {}: {}", razorpayPaymentId, e.getMessage());
        }
        return -1;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String auth = keyId + ":" + keySecret;
        byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + new String(encodedAuth, StandardCharsets.UTF_8));
        return headers;
    }

    public String getKeyId() {
        return keyId;
    }
}
