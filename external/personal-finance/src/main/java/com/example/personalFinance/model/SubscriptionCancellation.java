package com.example.personalFinance.model;

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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_cancellation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionCancellation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscription_id", nullable = false)
    private UserSubscription subscription;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false)
    private SubscriptionCancellationReasonType reasonType;

    @Column(name = "additional_details", length = 1000)
    private String additionalDetails;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
