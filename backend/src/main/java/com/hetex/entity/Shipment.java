package com.hetex.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "shipments")
public class Shipment extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String orderId;

    @Column(nullable = false)
    private String courierId;

    @Column(nullable = false, unique = true)
    private String awbNumber;

    @Column(nullable = false)
    private double rateCharged;

    @Column(nullable = false)
    private double marginEarned;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShipmentStatus status = ShipmentStatus.READY_TO_SHIP;

    @Column(nullable = false)
    private String currentLocation = "Origin Hub";

    @Column(nullable = false)
    private boolean labelGenerated = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
