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
@Table(name = "marketplace_connections")
public class MarketplaceConnection extends BaseEntity {

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketplacePlatform platform;

    @Column(nullable = false)
    private String storeName;

    @Column(nullable = false)
    private boolean connected = true;

    @Column(nullable = false)
    private Instant connectedAt = Instant.now();
}
