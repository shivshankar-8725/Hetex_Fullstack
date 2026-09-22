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
@Table(name = "addresses")
public class Address extends BaseEntity {

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AddressType type;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String contactName;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String addressLine1;

    private String addressLine2;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String pincode;

    @Column(nullable = false)
    private String country = "India";

    @Column(nullable = false)
    private boolean isDefault = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
