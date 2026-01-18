package com.example.personalFinance.repository;

import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, UUID> {

    List<SubscriptionPlan> findAllByActiveTrueOrderByPriceAsc();

    Optional<SubscriptionPlan> findByTypeAndBillingPeriodAndActiveTrue(SubscriptionType type,
                                                                       SubscriptionBillingPeriod billingPeriod);

    Optional<SubscriptionPlan> findByTypeAndActiveTrue(SubscriptionType type);

    Optional<SubscriptionPlan> findByCode(String code);
}
