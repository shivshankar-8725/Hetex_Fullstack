package com.hetex.repository;

import com.hetex.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(String userId);
}
