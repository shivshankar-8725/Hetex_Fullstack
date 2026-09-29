package com.hetex.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hetex.entity.WalletTransaction;
import com.hetex.grpc.WalletServiceImpl;
import com.hetex.service.RazorpayPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller handling inbound Razorpay webhooks (Requirement 10).
 * Validates HMAC-SHA256 signature, processes payments idempotently,
 * credits user wallet atomically, and creates admin notifications.
 */
@RestController
@RequestMapping({"/api/webhooks/razorpay", "/api/wallet/webhook"})
public class RazorpayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final RazorpayPaymentService razorpayPaymentService;
    private final WalletServiceImpl walletService;

    public RazorpayWebhookController(
        RazorpayPaymentService razorpayPaymentService,
        WalletServiceImpl walletService
    ) {
        this.razorpayPaymentService = razorpayPaymentService;
        this.walletService = walletService;
    }

    @PostMapping
    public ResponseEntity<?> handleWebhook(
        @RequestHeader(value = "X-Razorpay-Signature", required = false) String signatureHeader,
        @RequestBody String rawPayload
    ) {
        log.info("Incoming Razorpay webhook received");

        // 1. Webhook Signature Verification
        boolean isValid = razorpayPaymentService.verifyWebhookSignature(rawPayload, signatureHeader);
        if (!isValid) {
            log.error("Invalid Razorpay webhook signature. Header: {}", signatureHeader);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Invalid webhook signature"));
        }

        // 2. Parse Event JSON
        try {
            JsonNode root = mapper.readTree(rawPayload);
            String event = root.path("event").asText();
            log.info("Processing Razorpay webhook event: {}", event);

            // Handle successful payment events
            if ("payment.captured".equals(event) || "order.paid".equals(event) ||
                "qr_code.credited".equals(event) || "payment_link.paid".equals(event)) {

                JsonNode payloadNode = root.path("payload");
                JsonNode paymentEntity = payloadNode.path("payment").path("entity");
                
                String paymentId = paymentEntity.path("id").asText(null);
                String orderId = paymentEntity.path("order_id").asText(null);
                long amountPaise = paymentEntity.path("amount").asLong(0);
                double amountRupees = amountPaise / 100.0;
                String userId = paymentEntity.path("notes").path("userId").asText(null);

                // Fallback for QR code event
                if ((paymentId == null || paymentId.isBlank()) && "qr_code.credited".equals(event)) {
                    JsonNode qrEntity = payloadNode.path("qr_code").path("entity");
                    paymentId = qrEntity.path("id").asText(null);
                }

                if ((orderId == null || orderId.isBlank()) && payloadNode.has("order")) {
                    orderId = payloadNode.path("order").path("entity").path("id").asText(null);
                }

                if (paymentId == null && orderId == null) {
                    log.warn("Webhook received without payment_id or order_id. Skipping.");
                    return ResponseEntity.ok(Map.of("status", "skipped", "reason", "no_identifier"));
                }

                log.info("Processing webhook credit: paymentId={}, orderId={}, amount=₹{}, userId={}",
                    paymentId, orderId, amountRupees, userId);

                WalletTransaction txn = walletService.processWebhookCredit(userId, paymentId, orderId, amountRupees);
                if (txn != null) {
                    log.info("Webhook successfully processed transaction {}", txn.getId());
                    return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "transactionId", txn.getId(),
                        "amount", txn.getAmount(),
                        "balanceAfter", txn.getBalanceAfter()
                    ));
                } else {
                    log.warn("Webhook credit returned null (could not find wallet or resolve user)");
                    return ResponseEntity.ok(Map.of("status", "ignored", "reason", "unresolved_wallet"));
                }
            } else if ("payment.failed".equals(event)) {
                log.warn("Received payment.failed webhook event from Razorpay");
                return ResponseEntity.ok(Map.of("status", "recorded_failure"));
            } else {
                log.info("Ignoring unhandled Razorpay event: {}", event);
                return ResponseEntity.ok(Map.of("status", "ignored", "event", event));
            }
        } catch (Exception e) {
            log.error("Error processing Razorpay webhook payload: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error processing webhook: " + e.getMessage()));
        }
    }
}
