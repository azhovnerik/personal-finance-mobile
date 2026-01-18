package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.SubscriptionCancellation;
import com.example.personalFinance.model.SubscriptionCancellationReasonType;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.repository.SubscriptionCancellationRepository;
import com.example.personalFinance.repository.UserSubscriptionRepository;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private UserSubscriptionRepository userSubscriptionRepository;

    @Mock
    private SubscriptionPlanService subscriptionPlanService;

    @Mock
    private SubscriptionCancellationRepository subscriptionCancellationRepository;

    @Mock
    private SubscriptionNotificationService subscriptionNotificationService;

    @Mock
    private LiqPaySubscriptionManager liqPaySubscriptionManager;

    @Mock
    private SubscriptionEventLogService subscriptionEventLogService;

    @InjectMocks
    private SubscriptionService subscriptionService;

    @Test
    @SuppressWarnings("unchecked")
    void activateSubscriptionShouldRecordPurchaseForNewActivation() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("PRO_MONTHLY")
                .build();

        when(userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user)).thenReturn(Optional.empty());
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime currentPeriodEndsAt = LocalDateTime.now().plusMonths(1);
        LocalDateTime nextBillingAt = LocalDateTime.now().plusMonths(2);
        subscriptionService.activateSubscription(
                user,
                plan,
                "customer-token",
                "provider-sub-id",
                currentPeriodEndsAt,
                nextBillingAt,
                "ORDER-789");

        ArgumentCaptor<UserSubscription> subscriptionCaptor = ArgumentCaptor.forClass(UserSubscription.class);
        ArgumentCaptor<Map<String, String>> contextCaptor = ArgumentCaptor.forClass(Map.class);

        verify(subscriptionEventLogService).recordPurchase(subscriptionCaptor.capture(), eq("ORDER-789"), contextCaptor.capture());
        verify(subscriptionEventLogService, never()).recordRenewal(any(), any(), any());
        UserSubscription savedSubscription = subscriptionCaptor.getValue();
        Map<String, String> context = contextCaptor.getValue();

        assertThat(savedSubscription.getUser()).isEqualTo(user);
        assertThat(savedSubscription.getPlan()).isEqualTo(plan);
        assertThat(savedSubscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(context.get("provider_subscription_id")).isEqualTo("provider-sub-id");
        assertThat(context.get("payment_customer_token_present")).isEqualTo("true");
        verify(subscriptionNotificationService).sendSubscriptionActivatedEmail(user, savedSubscription);
    }

    @Test
    @SuppressWarnings("unchecked")
    void activateSubscriptionShouldRecordRenewalForExistingActivePlan() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("PRO_MONTHLY")
                .build();
        UserSubscription existing = UserSubscription.builder()
                .id(UUID.randomUUID())
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .build();

        when(userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user))
                .thenReturn(Optional.of(existing));
        when(userSubscriptionRepository.save(existing)).thenReturn(existing);

        subscriptionService.activateSubscription(
                user,
                plan,
                "new-token",
                "new-provider-sub-id",
                LocalDateTime.now().plusMonths(1),
                LocalDateTime.now().plusMonths(2),
                "ORDER-111");

        ArgumentCaptor<Map<String, String>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(subscriptionEventLogService).recordRenewal(eq(existing), eq("ORDER-111"), contextCaptor.capture());
        verify(subscriptionEventLogService, never()).recordPurchase(any(), any(), any());
        verify(subscriptionNotificationService, never()).sendSubscriptionActivatedEmail(any(), any());

        Map<String, String> context = contextCaptor.getValue();
        assertThat(context.get("provider_subscription_id")).isEqualTo("new-provider-sub-id");
        assertThat(context.get("payment_customer_token_present")).isEqualTo("true");
    }

    @Test
    @SuppressWarnings("unchecked")
    void cancelSubscriptionShouldRecordCancellationContext() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("PRO_MONTHLY")
                .build();
        UserSubscription subscription = UserSubscription.builder()
                .id(UUID.randomUUID())
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodEndsAt(LocalDateTime.now().plusDays(3))
                .build();

        when(userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user))
                .thenReturn(Optional.of(subscription));
        when(userSubscriptionRepository.save(subscription)).thenReturn(subscription);
        when(subscriptionCancellationRepository.save(isA(SubscriptionCancellation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        subscriptionService.cancelSubscription(user, SubscriptionCancellationReasonType.MISSING_FEATURES, " need export ");

        ArgumentCaptor<Map<String, String>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(subscriptionEventLogService).recordCancellation(eq(subscription), contextCaptor.capture());
        verify(liqPaySubscriptionManager).cancelSubscription(subscription);
        verify(subscriptionNotificationService).sendCancellationConfirmation(user, subscription);

        Map<String, String> context = contextCaptor.getValue();
        assertThat(context).containsEntry("reason", SubscriptionCancellationReasonType.MISSING_FEATURES.name());
        assertThat(context).containsEntry("details", " need export ");
        verify(subscriptionCancellationRepository).save(isA(SubscriptionCancellation.class));
        verifyNoMoreInteractions(subscriptionEventLogService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void markSubscriptionCancelledByProviderShouldUpdateSubscription() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("PRO_MONTHLY")
                .build();
        UserSubscription subscription = UserSubscription.builder()
                .id(UUID.randomUUID())
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .paymentSubscriptionId("old_pay")
                .currentPeriodEndsAt(LocalDateTime.now().plusDays(5))
                .build();

        when(userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user))
                .thenReturn(Optional.of(subscription));
        when(userSubscriptionRepository.save(subscription)).thenReturn(subscription);

        LocalDateTime effectiveAt = LocalDateTime.now().plusDays(10);
        subscriptionService.markSubscriptionCancelledByProvider(user, plan, "new_pay", effectiveAt, "unsubscribed");

        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(subscription.isAutoRenew()).isFalse();
        assertThat(subscription.getPaymentSubscriptionId()).isEqualTo("new_pay");
        assertThat(subscription.getCancellationEffectiveAt()).isEqualTo(effectiveAt);

        ArgumentCaptor<Map<String, String>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(subscriptionEventLogService).recordCancellation(eq(subscription), contextCaptor.capture());
        Map<String, String> context = contextCaptor.getValue();
        assertThat(context).containsEntry("provider_status", "unsubscribed");
        assertThat(context).containsEntry("provider_subscription_id", "new_pay");
        verify(subscriptionNotificationService).sendCancellationConfirmation(user, subscription);
    }
}
