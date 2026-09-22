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
@Table(name = "cod_remittances")
public class CodRemittance extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String shipmentId;

    @Column(nullable = false)
    private double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemittanceStatus status = RemittanceStatus.PENDING;

    private Instant settledAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
