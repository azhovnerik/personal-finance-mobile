package com.example.personalFinance.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_plan")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_period", nullable = false)
    private SubscriptionBillingPeriod billingPeriod;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal price;

    @Column(name = "old_price", nullable = false, precision = 8, scale = 2)
    private BigDecimal oldPrice;

    @Column(nullable = false)
    private String currency;

    @Column(name = "trial_available", nullable = false)
    private boolean trialAvailable;

    @Column(name = "trial_period_days")
    private Integer trialPeriodDays;

    @Column(name = "is_active", nullable = false)
    private boolean active;
}
