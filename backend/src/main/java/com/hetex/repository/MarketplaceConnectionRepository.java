package com.hetex.repository;

import com.hetex.entity.MarketplaceConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarketplaceConnectionRepository extends JpaRepository<MarketplaceConnection, String> {
    List<MarketplaceConnection> findByUserId(String userId);
}
