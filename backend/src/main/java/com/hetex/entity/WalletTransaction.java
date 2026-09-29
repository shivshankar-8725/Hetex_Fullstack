package com.hetex.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction extends BaseEntity {

    @Column(nullable = false)
    private String walletId;

    /** Direct owner reference for fast multi-user admin queries. */
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WalletTxnType type;

    /** Amount in rupees (kept as double to match existing numeric columns). */
    @Column(nullable = false)
    private double amount;

    /** Balance before this transaction — set at creation time. */
    @Column(nullable = false)
    private double balanceBefore;

    /** Balance after this transaction — set at creation time. */
    @Column(nullable = false)
    private double balanceAfter;

    @Column(nullable = false)
    private String reason;

    /** Optional link to an internal order (shipping debit / refund context). */
    private String orderId;

    // -----------------------------------------------------------------------
    // Payment-provider fields (populated only for CREDIT / REFUND txns that
    // go through a payment gateway such as Razorpay).
    // -----------------------------------------------------------------------

    /** Payment provider name, e.g. "RAZORPAY". Null for adjustments/debits. */
    private String paymentProvider;

    /**
     * Provider-side idempotency identifier:
     * – Razorpay payment_id (pay_…) on success
     * – Razorpay order_id  (order_…) while PENDING
     * Used to prevent duplicate wallet credits from repeated webhook deliveries.
     */
    @Column(unique = true)
    private String paymentReference;

    /** Payment lifecycle status. NULL for non-payment transactions (debits, adjustments). */
    @Enumerated(EnumType.STRING)
    private PaymentTxnStatus paymentStatus;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
