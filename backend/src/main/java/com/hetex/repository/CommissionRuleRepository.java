package com.hetex.repository;

import com.hetex.entity.CommissionRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommissionRuleRepository extends JpaRepository<CommissionRule, String> {
    List<CommissionRule> findAllByOrderByCreatedAtDesc();
    List<CommissionRule> findByCourierIdIsNullOrCourierId(String courierId);
}
