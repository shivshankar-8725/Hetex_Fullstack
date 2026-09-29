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
@Table(name = "support_tickets")
public class SupportTicket extends BaseEntity {

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String orderId;

    @Column(nullable = false)
    private String courierId;

    @Column(nullable = true)
    private String awbNumber;

    @Column(nullable = true)
    private String vendorTicketId;

    @Column(nullable = true)
    private String vendorStatus;

    @Column(nullable = false)
    private boolean vendorApiSupported = false;

    @Column(length = 1000)
    private String vendorNotes;

    @Column(nullable = false)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.OPEN;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
