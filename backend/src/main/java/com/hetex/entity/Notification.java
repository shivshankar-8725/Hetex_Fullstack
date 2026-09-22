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
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotifyChannel channel;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String message;

    private String orderId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
