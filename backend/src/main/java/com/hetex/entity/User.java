package com.hetex.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.SELLER;

    private String businessName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus kycStatus = KycStatus.PENDING;

    private String panNumber;
    private String gstNumber;

    private String passwordHash;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
