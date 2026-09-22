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
@Table(name = "commission_rules")
public class CommissionRule extends BaseEntity {

    /** Null means this rule is the fallback applied across all couriers. */
    private String courierId;

    @Column(nullable = false)
    private double minWeight = 0;

    @Column(nullable = false)
    private double maxWeight = 1000;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarginType marginType = MarginType.PERCENT;

    @Column(nullable = false)
    private double marginValue;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
