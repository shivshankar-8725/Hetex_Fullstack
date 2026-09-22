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
@Table(name = "orders")
public class Order extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String orderNumber;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String pickupAddressId;

    @Column(nullable = false)
    private String buyerAddressId;

    @Column(nullable = false)
    private String itemDescription;

    @Column(nullable = false)
    private double declaredValue;

    @Column(nullable = false)
    private double weight;

    @Column(nullable = false)
    private double length;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    @Column(nullable = false)
    private double volumetricWeight;

    @Column(nullable = false)
    private double billableWeight;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMode paymentMode;

    @Column(nullable = false)
    private double codAmount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.DRAFT;

    @Column(nullable = false)
    private String source = "MANUAL";

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
