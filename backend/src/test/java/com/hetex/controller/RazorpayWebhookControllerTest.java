package com.hetex.controller;

import com.hetex.entity.PaymentTxnStatus;
import com.hetex.entity.WalletTransaction;
import com.hetex.grpc.WalletServiceImpl;
import com.hetex.service.RazorpayPaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RazorpayWebhookControllerTest {

    private RazorpayPaymentService razorpayPaymentService;
    private WalletServiceImpl walletService;
    private RazorpayWebhookController controller;

    @BeforeEach
    void setUp() {
        razorpayPaymentService = mock(RazorpayPaymentService.class);
        walletService = mock(WalletServiceImpl.class);
        controller = new RazorpayWebhookController(razorpayPaymentService, walletService);
    }

    @Test
    @DisplayName("Invalid webhook signature returns HTTP 400 Bad Request")
    void testInvalidSignatureReturnsBadRequest() {
        String payload = "{\"event\":\"payment.captured\"}";
        String badSig = "invalid_sig_123";

        when(razorpayPaymentService.verifyWebhookSignature(payload, badSig)).thenReturn(false);

        ResponseEntity<?> response = controller.handleWebhook(badSig, payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(walletService, never()).processWebhookCredit(any(), any(), any(), anyDouble());
    }

    @Test
    @DisplayName("Valid payment.captured event processes credit and returns HTTP 200")
    void testValidPaymentCapturedWebhook() {
        String payload = """
            {
              "event": "payment.captured",
              "payload": {
                "payment": {
                  "entity": {
                    "id": "pay_test_999",
                    "order_id": "order_test_999",
                    "amount": 50000,
                    "currency": "INR",
                    "notes": {
                      "userId": "usr_test_1"
                    }
                  }
                }
              }
            }
            """;
        String validSig = "valid_signature_abc";

        when(razorpayPaymentService.verifyWebhookSignature(payload, validSig)).thenReturn(true);

        WalletTransaction txn = new WalletTransaction();
        txn.setId("tx_999");
        txn.setAmount(500.0);
        txn.setBalanceAfter(1500.0);
        txn.setPaymentStatus(PaymentTxnStatus.SUCCESS);

        when(walletService.processWebhookCredit("usr_test_1", "pay_test_999", "order_test_999", 500.0))
            .thenReturn(txn);

        ResponseEntity<?> response = controller.handleWebhook(validSig, payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        assertTrue(response.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("success", body.get("status"));
        assertEquals("tx_999", body.get("transactionId"));
    }

    @Test
    @DisplayName("Unhandled event is ignored with HTTP 200")
    void testIgnoredEventReturns200() {
        String payload = "{\"event\":\"refund.speed_changed\",\"payload\":{}}";
        when(razorpayPaymentService.verifyWebhookSignature(anyString(), any())).thenReturn(true);

        ResponseEntity<?> response = controller.handleWebhook("dummy_sig", payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("ignored", body.get("status"));
    }
}
