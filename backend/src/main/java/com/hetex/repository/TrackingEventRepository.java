package com.hetex.repository;

import com.hetex.entity.TrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, String> {
    List<TrackingEvent> findByShipmentIdOrderByTimestampAsc(String shipmentId);
    List<TrackingEvent> findByShipmentIdOrderByTimestampDesc(String shipmentId);
}
