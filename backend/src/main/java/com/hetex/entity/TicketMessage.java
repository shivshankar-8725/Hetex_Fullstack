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
@Table(name = "ticket_messages")
public class TicketMessage extends BaseEntity {

    @Column(nullable = false)
    private String ticketId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SenderRole senderRole;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
