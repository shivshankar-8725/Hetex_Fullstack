package com.hetex.repository;

import com.hetex.entity.WeightDispute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WeightDisputeRepository extends JpaRepository<WeightDispute, String> {
    Optional<WeightDispute> findByShipmentId(String shipmentId);
}
