package com.hetex.repository;

import com.hetex.entity.Shipment;
import com.hetex.entity.ShipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, String> {
    Optional<Shipment> findByOrderId(String orderId);
    Optional<Shipment> findByAwbNumber(String awbNumber);
    long countByStatus(ShipmentStatus status);
    List<Shipment> findByStatusIn(List<ShipmentStatus> statuses);
}
