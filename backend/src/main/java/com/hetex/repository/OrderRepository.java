package com.hetex.repository;

import com.hetex.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Order> findByOrderNumber(String orderNumber);
    long countByUserId(String userId);
    List<Order> findByUserIdAndCreatedAtAfter(String userId, java.time.Instant after);
    List<Order> findAllByOrderByCreatedAtDesc();
}
