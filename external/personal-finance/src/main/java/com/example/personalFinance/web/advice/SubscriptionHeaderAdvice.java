package com.example.personalFinance.web.advice;

import com.example.personalFinance.dto.HeaderSubscriptionView;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.SubscriptionPlanFormatter;
import com.example.personalFinance.service.subscription.SubscriptionService;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
@RequiredArgsConstructor
public class SubscriptionHeaderAdvice {

    private final SecurityService securityService;
    private final UserService userService;
    private final SubscriptionService subscriptionService;
    private final SubscriptionPlanFormatter subscriptionPlanFormatter;

    @ModelAttribute("headerSubscription")
    public HeaderSubscriptionView headerSubscription() {
        if (securityService == null || !securityService.isAuthenticated()) {
            return null;
        }
        String username = securityService.getCurrentUser();
        if (!StringUtils.hasText(username)) {
            return null;
        }
        Optional<UserApp> user = userService.findByName(username);
        if (user.isEmpty()) {
            return null;
        }
        Optional<UserSubscription> subscription = subscriptionService.findCurrentSubscription(user.get());
        if (subscription.isEmpty()) {
            return null;
        }
        UserSubscription sub = subscription.get();
        SubscriptionPlan plan = sub.getPlan();
        if (plan == null) {
            return null;
        }
        boolean trial = SubscriptionStatus.TRIAL.equals(sub.getStatus());
        return HeaderSubscriptionView.builder()
                .planDisplayName(trial ? null : subscriptionPlanFormatter.formatPlanDisplayName(plan))
                .trial(trial)
                .trialEndsAt(sub.getTrialEndsAt())
                .build();
    }
}
