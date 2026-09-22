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
@Table(name = "ndr_records")
public class NdrRecord extends BaseEntity {

    @Column(nullable = false)
    private String shipmentId;

    @Column(nullable = false)
    private int attemptNumber = 1;

    @Column(nullable = false)
    private String reason;

    private String buyerResponse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NdrAction action = NdrAction.PENDING;

    private String notes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
