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
@Table(name = "otp_codes")
public class OtpCode extends BaseEntity {

    @Column(nullable = false)
    private String identifier;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean consumed = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
