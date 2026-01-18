package com.example.personalFinance.service;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.CurrencyRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrencyConversionService {

    private final CurrencyRateRepository currencyRateRepository;
    private final UserService userService;
    private final CurrencyConversionWarningContext warningContext;

    public BigDecimal convertToBase(UserApp user, CurrencyCode currency, BigDecimal amount, LocalDate rateDate) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (currency == null || user == null || currency == user.getBaseCurrency()) {
            return amount.setScale(2, RoundingMode.HALF_UP);
        }
        return currencyRateRepository
                .findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, currency, rateDate)
                .map(rate -> amount.multiply(rate.getRate()).setScale(2, RoundingMode.HALF_UP))
                .orElseGet(() -> handleMissingRate(currency, amount, rateDate));
    }

    public BigDecimal convertToBase(UserApp user, CurrencyCode currency, BigDecimal amount, long epochSeconds) {
        LocalDate date = Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
        return convertToBase(user, currency, amount, date);
    }

    private BigDecimal handleMissingRate(CurrencyCode currency, BigDecimal amount, LocalDate rateDate) {
        if (amount != null && amount.signum() != 0) {
            warningContext.addMissingRate(currency, rateDate);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal convertToBase(UUID userId, CurrencyCode currency, BigDecimal amount, LocalDate rateDate) {
        UserApp user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return convertToBase(user, currency, amount, rateDate);
    }

    public BigDecimal convertToBase(UUID userId, CurrencyCode currency, BigDecimal amount, long epochSeconds) {
        UserApp user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return convertToBase(user, currency, amount, epochSeconds);
    }
}
