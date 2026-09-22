package com.hetex.service;

import com.hetex.entity.CommissionRule;
import com.hetex.entity.MarginType;
import com.hetex.repository.CommissionRuleRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class CommissionService {

    private final CommissionRuleRepository commissionRuleRepository;

    public CommissionService(CommissionRuleRepository commissionRuleRepository) {
        this.commissionRuleRepository = commissionRuleRepository;
    }

    public record MarginResult(double margin, double sellerPrice) {}

    /** Admin-configured margin the business earns on top of the courier's freight+COD charge. */
    public MarginResult computeMargin(String courierId, double billableWeight, double courierCost) {
        List<CommissionRule> candidates = commissionRuleRepository.findByCourierIdIsNullOrCourierId(courierId);

        Optional<CommissionRule> rule = candidates.stream()
            .filter(r -> billableWeight >= r.getMinWeight() && billableWeight <= r.getMaxWeight())
            // courier-specific rule wins over the global (null) fallback
            .max(Comparator.comparing(r -> r.getCourierId() != null));

        double margin = rule
            .map(r -> r.getMarginType() == MarginType.FLAT
                ? r.getMarginValue()
                : round(courierCost * (r.getMarginValue() / 100)))
            .orElse(round(courierCost * 0.12)); // 12% default margin if admin hasn't set a rule

        return new MarginResult(margin, round(courierCost + margin));
    }

    private double round(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
