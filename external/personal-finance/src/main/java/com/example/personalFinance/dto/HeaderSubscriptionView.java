package com.example.personalFinance.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class HeaderSubscriptionView {
    String planDisplayName;
    boolean trial;
    LocalDateTime trialEndsAt;
}
