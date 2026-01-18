package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionCancellation;
import com.example.personalFinance.model.SubscriptionCancellationReasonType;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.repository.SubscriptionCancellationRepository;
import com.example.personalFinance.repository.UserSubscriptionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanService subscriptionPlanService;
    private final SubscriptionCancellationRepository subscriptionCancellationRepository;
    private final SubscriptionNotificationService subscriptionNotificationService;
    private final LiqPaySubscriptionManager liqPaySubscriptionManager;
    private final SubscriptionEventLogService subscriptionEventLogService;

    @Value("${app.subscription.trial.reminder-days-before:5}")
    private int trialReminderDaysBefore;

    @Value("${app.subscription.trial.expired-reminder-days-after:2}")
    private int trialExpiredReminderDaysAfter;

    @Value("${app.subscription.trial-length-days}")
    private int defaultTrialLengthDays;

    @Transactional
    public UserSubscription provisionTrial(UserApp user) {
        Optional<UserSubscription> existing = userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user);
        if (existing.isPresent()) {
            log.debug("User {} already has subscription {}", user.getId(), existing.get().getId());
            return existing.get();
        }
        SubscriptionPlan basePlan = subscriptionPlanService.getActivePlan(SubscriptionType.TRIAL);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime trialEndsAt;
        if (basePlan.getTrialPeriodDays() != null && basePlan.getTrialPeriodDays() > 0) {
            trialEndsAt = now.plusDays(basePlan.getTrialPeriodDays());
        } else {
            trialEndsAt = now.plusDays(defaultTrialLengthDays);
        }
        UserSubscription subscription = UserSubscription.builder()
                .user(user)
                .plan(basePlan)
                .status(SubscriptionStatus.TRIAL)
                .createdAt(now)
                .updatedAt(now)
                .trialStartedAt(now)
                .trialEndsAt(trialEndsAt)
                .autoRenew(false)
                .build();
        UserSubscription saved = userSubscriptionRepository.save(subscription);
        subscriptionNotificationService.sendTrialWelcomeEmail(user, saved);
        log.info("Provisioned trial subscription {} for user {} until {}", saved.getId(), user.getId(), trialEndsAt);
        return saved;
    }

    public Optional<UserSubscription> findCurrentSubscription(UserApp user) {
        return userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user);
    }

    public boolean hasActiveAccess(UserApp user) {
        return findCurrentSubscription(user)
                .map(this::hasActiveAccess)
                .orElse(false);
    }

    private boolean hasActiveAccess(UserSubscription subscription) {
        LocalDateTime now = LocalDateTime.now();
        if (SubscriptionStatus.TRIAL.equals(subscription.getStatus())) {
            return subscription.getTrialEndsAt() != null && subscription.getTrialEndsAt().isAfter(now);
        }
        if (SubscriptionStatus.ACTIVE.equals(subscription.getStatus())) {
            return true;
        }
        if (SubscriptionStatus.CANCELLED.equals(subscription.getStatus())) {
            if (subscription.getCancellationEffectiveAt() == null) {
                return false;
            }
            return subscription.getCancellationEffectiveAt().isAfter(now);
        }
        if (SubscriptionStatus.PAST_DUE.equals(subscription.getStatus())) {
            return false;
        }
        return false;
    }

    public boolean isTrialExpired(UserApp user) {
        return findCurrentSubscription(user)
                .filter(sub -> SubscriptionStatus.TRIAL.equals(sub.getStatus()))
                .map(sub -> sub.getTrialEndsAt() != null && !sub.getTrialEndsAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    public boolean requiresPayment(UserApp user) {
        return !hasActiveAccess(user);
    }

    @Transactional
    public void activateSubscription(UserApp user,
                                     SubscriptionPlan plan,
                                     String paymentCustomerToken,
                                     String paymentSubscriptionId,
                                     LocalDateTime currentPeriodEndsAt,
                                     LocalDateTime nextBillingAt,
                                     String orderId) {
        UserSubscription subscription = userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseGet(() -> initialiseSubscriptionRecord(user, plan));
        applyActivation(subscription, plan, paymentCustomerToken, paymentSubscriptionId, currentPeriodEndsAt,
                nextBillingAt, orderId);
    }

    @Transactional
    public void markSubscriptionPendingPayment(UserApp user,
                                               SubscriptionPlan plan,
                                               String paymentCustomerToken,
                                               String paymentSubscriptionId,
                                               LocalDateTime nextBillingAt,
                                               String orderId,
                                               String providerStatus) {
        UserSubscription subscription = userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseGet(() -> initialiseSubscriptionRecord(user, plan));
        UserSubscription saved = applyPendingStatus(subscription, plan, paymentCustomerToken, paymentSubscriptionId,
                nextBillingAt);
        Map<String, String> context = new LinkedHashMap<>();
        if (StringUtils.hasText(providerStatus)) {
            context.put("provider_status", providerStatus);
        }
        if (StringUtils.hasText(saved.getPaymentSubscriptionId())) {
            context.put("provider_subscription_id", saved.getPaymentSubscriptionId());
        }
        subscriptionEventLogService.recordPaymentPending(saved, orderId, context);
    }

    @Transactional
    public void markSubscriptionPaymentFailed(UserApp user,
                                              SubscriptionPlan plan,
                                              String paymentSubscriptionId,
                                              String failureStatus,
                                              String failureMessage,
                                              String orderId) {
        UserSubscription subscription = userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseGet(() -> initialiseSubscriptionRecord(user, plan));
        UserSubscription saved = applyPendingStatus(subscription, plan, null, paymentSubscriptionId, null);
        Map<String, String> context = new LinkedHashMap<>();
        if (StringUtils.hasText(failureStatus)) {
            context.put("failure_status", failureStatus);
        }
        if (StringUtils.hasText(failureMessage)) {
            context.put("failure_message", failureMessage.trim());
        }
        if (StringUtils.hasText(saved.getPaymentSubscriptionId())) {
            context.put("provider_subscription_id", saved.getPaymentSubscriptionId());
        }
        subscriptionEventLogService.recordPaymentFailure(saved, orderId, context);
        subscriptionNotificationService.sendPaymentFailedEmail(user, plan, failureMessage);
    }

    private UserSubscription initialiseSubscriptionRecord(UserApp user, SubscriptionPlan plan) {
        LocalDateTime now = LocalDateTime.now();
        UserSubscription subscription = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.TRIAL)
                .createdAt(now)
                .updatedAt(now)
                .autoRenew(false)
                .cancellations(new ArrayList<>())
                .build();
        log.info("Created subscription shell for user {} to store activation from LiqPay", user.getId());
        return subscription;
    }

    private void applyActivation(UserSubscription subscription,
                                 SubscriptionPlan plan,
                                 String paymentCustomerToken,
                                 String paymentSubscriptionId,
                                 LocalDateTime currentPeriodEndsAt,
                                 LocalDateTime nextBillingAt,
                                 String orderId) {
        boolean alreadyActive = SubscriptionStatus.ACTIVE.equals(subscription.getStatus())
                && subscription.getPlan() != null
                && plan != null
                && plan.getId().equals(subscription.getPlan().getId());

        LocalDateTime now = LocalDateTime.now();
        subscription.setPlan(plan);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(now);
        }
        if (StringUtils.hasText(paymentCustomerToken)) {
            subscription.setPaymentCustomerToken(paymentCustomerToken);
        }
        if (StringUtils.hasText(paymentSubscriptionId)) {
            subscription.setPaymentSubscriptionId(paymentSubscriptionId);
        }
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setCancelledAt(null);
        subscription.setCancellationEffectiveAt(null);
        subscription.setCurrentPeriodStartedAt(now);
        subscription.setCurrentPeriodEndsAt(currentPeriodEndsAt);
        subscription.setNextBillingAt(nextBillingAt);
        subscription.setAutoRenew(true);
        subscription.setUpdatedAt(now);
        userSubscriptionRepository.save(subscription);

        if (!alreadyActive) {
            subscriptionNotificationService.sendSubscriptionActivatedEmail(subscription.getUser(), subscription);
        }
        Map<String, String> context = new LinkedHashMap<>();
        context.put("provider_subscription_id", StringUtils.hasText(subscription.getPaymentSubscriptionId())
                ? subscription.getPaymentSubscriptionId()
                : null);
        context.put("payment_customer_token_present", String.valueOf(StringUtils.hasText(subscription.getPaymentCustomerToken())));
        if (alreadyActive) {
            subscriptionEventLogService.recordRenewal(subscription, orderId, context);
        } else {
            subscriptionEventLogService.recordPurchase(subscription, orderId, context);
        }
        log.info("Activated subscription {} for user {}", subscription.getId(), subscription.getUser().getId());
    }

    private UserSubscription applyPendingStatus(UserSubscription subscription,
                                                SubscriptionPlan plan,
                                                String paymentCustomerToken,
                                                String paymentSubscriptionId,
                                                LocalDateTime nextBillingAt) {
        LocalDateTime now = LocalDateTime.now();
        subscription.setPlan(plan);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(now);
        }
        if (StringUtils.hasText(paymentCustomerToken)) {
            subscription.setPaymentCustomerToken(paymentCustomerToken);
        }
        if (StringUtils.hasText(paymentSubscriptionId)) {
            subscription.setPaymentSubscriptionId(paymentSubscriptionId);
        }
        subscription.setStatus(SubscriptionStatus.PAST_DUE);
        subscription.setCurrentPeriodStartedAt(null);
        subscription.setCurrentPeriodEndsAt(null);
        subscription.setNextBillingAt(nextBillingAt);
        subscription.setCancelledAt(null);
        subscription.setCancellationEffectiveAt(null);
        subscription.setAutoRenew(true);
        subscription.setUpdatedAt(now);
        return userSubscriptionRepository.save(subscription);
    }

    @Transactional
    public void cancelSubscription(UserApp user, SubscriptionCancellationReasonType reasonType, String additionalDetails) {
        UserSubscription subscription = findCurrentSubscription(user)
                .filter(sub -> EnumSet.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE)
                        .contains(sub.getStatus()))
                .orElseThrow(() -> new IllegalStateException("No cancellable subscription found"));

        LocalDateTime now = LocalDateTime.now();
        boolean remoteCancellationRequired = EnumSet.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE)
                .contains(subscription.getStatus());

        if (remoteCancellationRequired) {
            liqPaySubscriptionManager.cancelSubscription(subscription);
        }

        applyCancellation(subscription, null);
        userSubscriptionRepository.save(subscription);

        SubscriptionCancellation cancellation = SubscriptionCancellation.builder()
                .subscription(subscription)
                .reasonType(reasonType)
                .additionalDetails(StringUtils.hasText(additionalDetails) ? additionalDetails.trim() : null)
                .createdAt(now)
                .build();
        subscriptionCancellationRepository.save(cancellation);
        subscriptionNotificationService.sendCancellationConfirmation(user, subscription);
        Map<String, String> context = new LinkedHashMap<>();
        if (reasonType != null) {
            context.put("reason", reasonType.name());
        }
        if (StringUtils.hasText(additionalDetails)) {
            context.put("details", additionalDetails);
        }
        subscriptionEventLogService.recordCancellation(subscription, context);
        log.info("Cancelled subscription {} for user {}", subscription.getId(), user.getId());
    }

    @Transactional
    public void markSubscriptionCancelledByProvider(UserApp user,
                                                    SubscriptionPlan plan,
                                                    String paymentSubscriptionId,
                                                    LocalDateTime cancellationEffectiveAt,
                                                    String providerStatus) {
        UserSubscription subscription = userSubscriptionRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseGet(() -> initialiseSubscriptionRecord(user, plan));
        subscription.setPlan(plan);
        if (StringUtils.hasText(paymentSubscriptionId)) {
            subscription.setPaymentSubscriptionId(paymentSubscriptionId);
        }
        applyCancellation(subscription, cancellationEffectiveAt);
        userSubscriptionRepository.save(subscription);

        Map<String, String> context = new LinkedHashMap<>();
        if (StringUtils.hasText(providerStatus)) {
            context.put("provider_status", providerStatus);
        }
        if (StringUtils.hasText(subscription.getPaymentSubscriptionId())) {
            context.put("provider_subscription_id", subscription.getPaymentSubscriptionId());
        }
        subscriptionEventLogService.recordCancellation(subscription, context);
        subscriptionNotificationService.sendCancellationConfirmation(user, subscription);
        log.info("Subscription {} for user {} cancelled based on provider callback",
                subscription.getId(), user.getId());
    }

    public boolean hasActiveSubscriptionForPlan(UserApp user, SubscriptionPlan plan) {
        if (user == null || plan == null) {
            return false;
        }
        return findCurrentSubscription(user)
                .filter(sub -> SubscriptionStatus.ACTIVE.equals(sub.getStatus()))
                .filter(sub -> sub.getPlan() != null && plan.getId().equals(sub.getPlan().getId()))
                .isPresent();
    }

    @Transactional
    public int sendTrialEndingSoonReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusDays(trialReminderDaysBefore);
        List<UserSubscription> subscriptions = userSubscriptionRepository
                .findByStatusAndTrialEndsAtBetweenAndTrialReminderSentAtIsNull(SubscriptionStatus.TRIAL, now, threshold);
        subscriptions.forEach(subscription -> {
            subscriptionNotificationService.sendTrialEndingSoonEmail(subscription.getUser(), subscription);
            subscription.setTrialReminderSentAt(now);
            subscription.setUpdatedAt(now);
            userSubscriptionRepository.save(subscription);
        });
        return subscriptions.size();
    }

    @Transactional
    public int handleTrialExpirations() {
        LocalDateTime now = LocalDateTime.now();
        List<UserSubscription> subscriptions = userSubscriptionRepository
                .findByStatusAndTrialEndsAtBeforeAndTrialExpiredNotifiedAtIsNull(SubscriptionStatus.TRIAL, now);
        subscriptions.forEach(subscription -> {
            subscription.setStatus(SubscriptionStatus.EXPIRED);
            subscription.setTrialExpiredNotifiedAt(now);
            subscription.setUpdatedAt(now);
            subscriptionNotificationService.sendTrialExpiredEmail(subscription.getUser(), subscription);
            userSubscriptionRepository.save(subscription);
        });
        return subscriptions.size();
    }

    @Transactional
    public int sendTrialExpiredReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.minusDays(trialExpiredReminderDaysAfter);
        List<UserSubscription> subscriptions = userSubscriptionRepository
                .findByStatusAndTrialEndsAtBeforeAndTrialExpiredReminderSentAtIsNull(SubscriptionStatus.EXPIRED,
                        threshold);
        subscriptions.forEach(subscription -> {
            subscriptionNotificationService.sendTrialExpiredEmail(subscription.getUser(), subscription);
            subscription.setTrialExpiredReminderSentAt(now);
            subscription.setUpdatedAt(now);
            userSubscriptionRepository.save(subscription);
        });
        return subscriptions.size();
    }

    private void applyCancellation(UserSubscription subscription, LocalDateTime candidateEffectiveAt) {
        LocalDateTime now = LocalDateTime.now();
        subscription.setAutoRenew(false);
        subscription.setCancelledAt(now);
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.setCancellationEffectiveAt(resolveCancellationEffectiveAt(subscription, candidateEffectiveAt, now));
        subscription.setUpdatedAt(now);
    }

    private LocalDateTime resolveCancellationEffectiveAt(UserSubscription subscription,
                                                         LocalDateTime candidateEffectiveAt,
                                                         LocalDateTime now) {
        if (candidateEffectiveAt != null && candidateEffectiveAt.isAfter(now)) {
            return candidateEffectiveAt;
        }
        if (subscription.getCurrentPeriodEndsAt() != null
                && subscription.getCurrentPeriodEndsAt().isAfter(now)) {
            return subscription.getCurrentPeriodEndsAt();
        }
        if (subscription.getTrialEndsAt() != null && subscription.getTrialEndsAt().isAfter(now)) {
            return subscription.getTrialEndsAt();
        }
        return now;
    }
}
