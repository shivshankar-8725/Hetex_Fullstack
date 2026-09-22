package com.hetex.repository;

import com.hetex.entity.CodRemittance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CodRemittanceRepository extends JpaRepository<CodRemittance, String> {
    Optional<CodRemittance> findByShipmentId(String shipmentId);
}
