package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "currency_rate",
        uniqueConstraints = @UniqueConstraint(name = "uk_currency_rate_user_currency_date",
                columnNames = {"user_id", "currency", "rate_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CurrencyRate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_currency_rate_user"))
    private UserApp user;

    @Convert(converter = CurrencyCodeAttributeConverter.class)
    @Column(nullable = false)
    private CurrencyCode currency;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal rate;

    @Column(nullable = false)
    private boolean manual;

    @Column(length = 128)
    private String source;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
