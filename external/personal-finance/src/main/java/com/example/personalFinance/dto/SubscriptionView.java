package com.example.personalFinance.dto;

import com.example.personalFinance.model.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SubscriptionView {
    SubscriptionStatus status;
    String planCode;
    String planDisplayName;
    LocalDateTime trialEndsAt;
    LocalDateTime currentPeriodEndsAt;
    boolean paymentRequired;
    boolean trial;
    boolean cancellable;
    List<SubscriptionPlanOption> plans;
}
