package com.hetex.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "couriers")
public class Courier extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String logoColor = "#2563eb";

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private double baseRatePerKg;

    @Column(nullable = false)
    private double codChargeFlat = 25;

    @Column(nullable = false)
    private double codChargePercent = 1.5;

    @Column(nullable = false)
    private double rating = 4.0;

    @Column(nullable = false)
    private int etaMinDays = 2;

    @Column(nullable = false)
    private int etaMaxDays = 5;

    @Column(nullable = false)
    private double rtoRiskPercent = 8;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
