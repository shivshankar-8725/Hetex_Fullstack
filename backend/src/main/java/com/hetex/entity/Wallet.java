package com.hetex.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "wallets")
public class Wallet extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private double balance = 0;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
