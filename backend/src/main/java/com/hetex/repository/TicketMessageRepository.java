package com.hetex.repository;

import com.hetex.entity.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketMessageRepository extends JpaRepository<TicketMessage, String> {
    List<TicketMessage> findByTicketIdOrderByCreatedAtAsc(String ticketId);
}
