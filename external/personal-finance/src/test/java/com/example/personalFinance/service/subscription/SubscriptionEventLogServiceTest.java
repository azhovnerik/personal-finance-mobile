package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.example.personalFinance.model.SubscriptionEventLog;
import com.example.personalFinance.model.SubscriptionEventType;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.repository.SubscriptionEventLogRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubscriptionEventLogServiceTest {

    @Mock
    private SubscriptionEventLogRepository subscriptionEventLogRepository;

    @InjectMocks
    private SubscriptionEventLogService subscriptionEventLogService;

    @Test
    void recordPurchaseShouldPersistSanitizedContext() {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .email("user@example.com")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .code("PRO_MONTHLY")
                .build();
        LocalDateTime currentPeriodEndsAt = LocalDateTime.of(2024, 1, 10, 12, 30, 45);
        LocalDateTime nextBillingAt = LocalDateTime.of(2024, 2, 10, 12, 30, 45);
        UserSubscription subscription = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodEndsAt(currentPeriodEndsAt)
                .nextBillingAt(nextBillingAt)
                .build();

        Map<String, String> context = new LinkedHashMap<>();
        context.put("order_note", " first line\nsecond line ");
        context.put("ignored", "  ");

        subscriptionEventLogService.recordPurchase(subscription, "ORDER-123", context);

        ArgumentCaptor<SubscriptionEventLog> logCaptor = ArgumentCaptor.forClass(SubscriptionEventLog.class);
        verify(subscriptionEventLogRepository).save(logCaptor.capture());
        SubscriptionEventLog saved = logCaptor.getValue();

        assertThat(saved.getEventType()).isEqualTo(SubscriptionEventType.PURCHASE);
        assertThat(saved.getOrderId()).isEqualTo("ORDER-123");
        assertThat(saved.getMessage()).isEqualTo("Subscription purchased");
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getSubscription()).isEqualTo(subscription);
        assertThat(saved.getContext()).isEqualTo(
                "plan_code=PRO_MONTHLY;status=ACTIVE;current_period_ends_at=2024-01-10T12:30:45;"
                        + "next_billing_at=2024-02-10T12:30:45;order_note=first line second line");
    }

    @Test
    void recordPurchaseShouldSkipWhenSubscriptionMissingUser() {
        UserSubscription subscription = UserSubscription.builder()
                .user(null)
                .build();

        subscriptionEventLogService.recordPurchase(subscription, "ORDER-456", Map.of());

        verify(subscriptionEventLogRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
