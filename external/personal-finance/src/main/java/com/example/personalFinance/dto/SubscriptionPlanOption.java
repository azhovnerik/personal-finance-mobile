package com.example.personalFinance.dto;

import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionType;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SubscriptionPlanOption {
    UUID id;
    String code;
    SubscriptionType type;
    SubscriptionBillingPeriod billingPeriod;
    BigDecimal price;
    BigDecimal oldPrice;
    String currency;
    String currencyLabel;
    Integer trialPeriodDays;
    String displayName;
}
