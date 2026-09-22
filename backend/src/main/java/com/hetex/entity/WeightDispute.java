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
@Table(name = "weight_disputes")
public class WeightDispute extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String shipmentId;

    @Column(nullable = false)
    private double declaredWeight;

    @Column(nullable = false)
    private double courierWeight;

    @Column(nullable = false)
    private double extraCharge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DisputeStatus status = DisputeStatus.OPEN;

    private String resolutionNote;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
