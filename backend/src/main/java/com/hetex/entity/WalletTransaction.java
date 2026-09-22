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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WalletTxnType type;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private double balanceAfter;

    @Column(nullable = false)
    private String reason;

    private String orderId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
