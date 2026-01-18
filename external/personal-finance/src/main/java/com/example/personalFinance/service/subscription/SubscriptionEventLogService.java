package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionEventLog;
import com.example.personalFinance.model.SubscriptionEventType;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.repository.SubscriptionEventLogRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionEventLogService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final SubscriptionEventLogRepository subscriptionEventLogRepository;

    public void recordPurchase(UserSubscription subscription, String orderId, Map<String, String> context) {
        recordEvent(subscription, SubscriptionEventType.PURCHASE, orderId, "Subscription purchased", context);
    }

    public void recordRenewal(UserSubscription subscription, String orderId, Map<String, String> context) {
        recordEvent(subscription, SubscriptionEventType.RENEWAL, orderId, "Subscription renewed", context);
    }

    public void recordCancellation(UserSubscription subscription, Map<String, String> context) {
        recordEvent(subscription, SubscriptionEventType.CANCELLATION, null, "Subscription cancelled", context);
    }

    public void recordPaymentPending(UserSubscription subscription, String orderId, Map<String, String> context) {
        recordEvent(subscription, SubscriptionEventType.PAYMENT_PENDING, orderId,
                "Subscription payment pending", context);
    }

    public void recordPaymentFailure(UserSubscription subscription, String orderId, Map<String, String> context) {
        recordEvent(subscription, SubscriptionEventType.PAYMENT_FAILURE, orderId,
                "Subscription payment failed", context);
    }

    private void recordEvent(UserSubscription subscription,
                             SubscriptionEventType eventType,
                             String orderId,
                             String message,
                             Map<String, String> context) {
        if (subscription == null || subscription.getUser() == null) {
            log.debug("Skipping subscription event log for missing subscription or user (type={})", eventType);
            return;
        }
        SubscriptionEventLog entry = SubscriptionEventLog.builder()
                .subscription(subscription)
                .user(subscription.getUser())
                .eventType(eventType)
                .orderId(StringUtils.hasText(orderId) ? orderId : null)
                .message(message)
                .context(formatContext(context, subscription))
                .createdAt(LocalDateTime.now())
                .build();
        subscriptionEventLogRepository.save(entry);
    }

    private String formatContext(Map<String, String> context, UserSubscription subscription) {
        Map<String, String> enriched = new LinkedHashMap<>();
        if (subscription != null && subscription.getPlan() != null) {
            enriched.put("plan_code", subscription.getPlan().getCode());
        }
        if (subscription != null && subscription.getStatus() != null) {
            enriched.put("status", subscription.getStatus().name());
        }
        if (subscription != null && subscription.getCurrentPeriodEndsAt() != null) {
            enriched.put("current_period_ends_at", DATE_TIME_FORMATTER.format(subscription.getCurrentPeriodEndsAt()));
        }
        if (subscription != null && subscription.getNextBillingAt() != null) {
            enriched.put("next_billing_at", DATE_TIME_FORMATTER.format(subscription.getNextBillingAt()));
        }
        if (!CollectionUtils.isEmpty(context)) {
            context.forEach((key, value) -> {
                if (!StringUtils.hasText(key) || !StringUtils.hasText(value)) {
                    return;
                }
                enriched.put(key.trim(), sanitize(value));
            });
        }
        if (CollectionUtils.isEmpty(enriched)) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        enriched.forEach((key, value) -> builder.append(key).append('=').append(value).append(';'));
        if (builder.length() > 0) {
            builder.setLength(builder.length() - 1);
        }
        return builder.toString();
    }

    private String sanitize(String value) {
        String sanitized = value.replaceAll("\n", " ").trim();
        if (sanitized.length() > 1000) {
            return sanitized.substring(0, 1000);
        }
        return sanitized;
    }
}
