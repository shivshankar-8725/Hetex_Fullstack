package com.hetex.repository;

import com.hetex.entity.TrackingPageConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrackingPageConfigRepository extends JpaRepository<TrackingPageConfig, String> {
    Optional<TrackingPageConfig> findByUserId(String userId);
}
