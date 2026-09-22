package com.hetex.repository;

import com.hetex.entity.NdrRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NdrRecordRepository extends JpaRepository<NdrRecord, String> {
    List<NdrRecord> findByShipmentIdOrderByCreatedAtDesc(String shipmentId);
}
