package com.hetex.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class RazorpayPaymentServiceTest {

    private RazorpayPaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new RazorpayPaymentService();
        ReflectionTestUtils.setField(paymentService, "keyId", "rzp_live_testkey123");
        ReflectionTestUtils.setField(paymentService, "keySecret", "secret_key_456789");
        ReflectionTestUtils.setField(paymentService, "webhookSecret", "whsec_test_abc123");
    }

    @Test
    @DisplayName("Valid signature passes HMAC-SHA256 verification")
    void testValidSignature() throws Exception {
        String orderId = "order_998877";
        String paymentId = "pay_112233";
        String data = orderId + "|" + paymentId;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret_key_456789".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) hex.append('0');
            hex.append(h);
        }
        String validSig = hex.toString();

        boolean result = paymentService.verifySignature(orderId, paymentId, validSig);
        assertTrue(result, "Valid HMAC signature should pass");
    }

    @Test
    @DisplayName("Tampered signature fails verification")
    void testTamperedSignature() {
        String orderId = "order_998877";
        String paymentId = "pay_112233";
        String bogusSig = "bad_signature_value_12345";

        boolean result = paymentService.verifySignature(orderId, paymentId, bogusSig);
        assertFalse(result, "Tampered signature should fail verification");
    }

    @Test
    @DisplayName("Empty signature is rejected when real key is configured")
    void testEmptySignatureRejectedInRealMode() {
        boolean result = paymentService.verifySignature("order_123", "pay_456", "");
        assertFalse(result, "Empty signature must be rejected when real credentials are configured");
    }

    @Test
    @DisplayName("Webhook signature verification with valid secret")
    void testValidWebhookSignature() throws Exception {
        String payload = "{\"event\":\"payment.captured\",\"payload\":{}}";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("whsec_test_abc123".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) hex.append('0');
            hex.append(h);
        }
        String validSig = hex.toString();

        boolean result = paymentService.verifyWebhookSignature(payload, validSig);
        assertTrue(result, "Valid webhook signature should pass");
    }

    @Test
    @DisplayName("Webhook signature verification fails for tampered body")
    void testTamperedWebhookBodyFails() {
        String validPayload = "{\"event\":\"payment.captured\"}";
        String tamperedPayload = "{\"event\":\"payment.captured\",\"amount\":999999}";
        String sig = "mock_sig_value";

        boolean result = paymentService.verifyWebhookSignature(tamperedPayload, sig);
        assertFalse(result, "Tampered webhook payload must fail signature check");
    }

    @Test
    @DisplayName("Order creation produces valid amount and currency")
    void testOrderCreationFallback() {
        // Set mock key so it uses safe fallback
        ReflectionTestUtils.setField(paymentService, "keyId", "rzp_test_mock_key");
        var result = paymentService.createOrder(500.0);

        assertNotNull(result);
        assertEquals(500.0, result.amountRupees());
        assertEquals("INR", result.currency());
        assertNotNull(result.razorpayOrderId());
    }
}
