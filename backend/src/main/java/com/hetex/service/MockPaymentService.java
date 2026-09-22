package com.hetex.service;

import org.springframework.stereotype.Service;

/**
 * Stands in for Razorpay's order-create + verify flow. Always succeeds instantly instead
 * of redirecting to a real checkout — swap for a LiveRazorpayService that calls the real
 * SDK when keys are available.
 */
@Service
public class MockPaymentService {

    public record PaymentOrder(String paymentOrderId) {}
    public record PaymentVerification(boolean success, String paymentId) {}

    public PaymentOrder createOrder(double amountRupees) {
        return new PaymentOrder("mock_pay_" + System.currentTimeMillis());
    }

    public PaymentVerification verifyPayment(String paymentOrderId) {
        return new PaymentVerification(true, "mock_txn_" + paymentOrderId);
    }
}
