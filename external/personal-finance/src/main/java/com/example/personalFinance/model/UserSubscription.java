package com.example.personalFinance.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_subscription")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserApp user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "trial_started_at")
    private LocalDateTime trialStartedAt;

    @Column(name = "trial_ends_at")
    private LocalDateTime trialEndsAt;

    @Column(name = "current_period_started_at")
    private LocalDateTime currentPeriodStartedAt;

    @Column(name = "current_period_ends_at")
    private LocalDateTime currentPeriodEndsAt;

    @Column(name = "next_billing_at")
    private LocalDateTime nextBillingAt;

    @Column(name = "payment_customer_token")
    private String paymentCustomerToken;

    @Column(name = "payment_subscription_id")
    private String paymentSubscriptionId;

    @Column(name = "auto_renew")
    private boolean autoRenew;

    @Column(name = "trial_reminder_sent_at")
    private LocalDateTime trialReminderSentAt;

    @Column(name = "trial_expired_notified_at")
    private LocalDateTime trialExpiredNotifiedAt;

    @Column(name = "trial_expired_reminder_sent_at")
    private LocalDateTime trialExpiredReminderSentAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_effective_at")
    private LocalDateTime cancellationEffectiveAt;

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubscriptionCancellation> cancellations = new ArrayList<>();

    public boolean isTrial() {
        return SubscriptionStatus.TRIAL.equals(status);
    }

    public boolean isActive() {
        return SubscriptionStatus.ACTIVE.equals(status);
    }
}
