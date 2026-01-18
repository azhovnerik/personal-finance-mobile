package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.SubscriptionPlanRepository;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;

    public List<SubscriptionPlan> getActivePlans() {
        return subscriptionPlanRepository.findAllByActiveTrueOrderByPriceAsc();
    }

    public List<SubscriptionPlan> getActivePaidPlans() {
        return getActivePlans().stream()
                .filter(plan -> !SubscriptionType.TRIAL.equals(plan.getType()))
                .toList();
    }

    public List<SubscriptionPlan> getActivePaidPlansForUser(UserApp user) {
        EnumSet<SubscriptionType> allowedTypes = determineAllowedPaidTypes(user);
        List<SubscriptionPlan> paidPlans = getActivePaidPlans();
        List<SubscriptionPlan> filtered = paidPlans.stream()
                .filter(plan -> allowedTypes.contains(plan.getType()))
                .toList();
        if (!filtered.isEmpty()) {
            return filtered;
        }
        return paidPlans.stream()
                .filter(plan -> SubscriptionType.STANDART_MONTHLY.equals(plan.getType())
                        || SubscriptionType.STANDART_YEARLY.equals(plan.getType()))
                .toList();
    }

    public boolean isPlanAvailableForUser(SubscriptionPlan plan, UserApp user) {
        if (plan == null) {
            return false;
        }
        return determineAllowedPaidTypes(user).contains(plan.getType());
    }

    public SubscriptionPlan getPlan(UUID id) {
        return subscriptionPlanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found"));
    }

    public SubscriptionPlan getActivePlan(SubscriptionType type) {
        return subscriptionPlanRepository.findByTypeAndActiveTrue(type)
                .orElseThrow(() -> new IllegalStateException("Required subscription plan configuration is missing"));
    }

    public SubscriptionPlan getActivePlan(SubscriptionType type, SubscriptionBillingPeriod billingPeriod) {
        return subscriptionPlanRepository.findByTypeAndBillingPeriodAndActiveTrue(type, billingPeriod)
                .orElseThrow(() -> new IllegalStateException("Required subscription plan configuration is missing"));
    }

    public Optional<SubscriptionPlan> findActivePlan(SubscriptionType type, SubscriptionBillingPeriod billingPeriod) {
        return subscriptionPlanRepository.findByTypeAndBillingPeriodAndActiveTrue(type, billingPeriod);
    }

    public SubscriptionPlan getPlanByCode(String code) {
        return subscriptionPlanRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found"));
    }

    private EnumSet<SubscriptionType> determineAllowedPaidTypes(UserApp user) {
        if (user != null && "UA".equalsIgnoreCase(user.getCountryCode())) {
            return EnumSet.of(SubscriptionType.STANDART_MONTHLY_UA, SubscriptionType.STANDART_YEARLY_UA);
        }
        return EnumSet.of(SubscriptionType.STANDART_MONTHLY, SubscriptionType.STANDART_YEARLY);
    }
}
