package com.example.personalFinance.dto;

import com.example.personalFinance.model.SubscriptionPlan;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LiqPayCallbackResult {

    String orderId;
    UUID userId;
    SubscriptionPlan plan;
    String providerStatus;
    boolean activated;
    boolean alreadyActive;
    boolean activationPending;
    boolean paymentFailed;
}
