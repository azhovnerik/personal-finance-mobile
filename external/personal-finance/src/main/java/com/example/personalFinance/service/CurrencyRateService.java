package com.example.personalFinance.service;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.CurrencyRate;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.CurrencyRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrencyRateService {

    private final CurrencyRateRepository currencyRateRepository;
    private final UserService userService;

    public List<CurrencyRate> findAll(UUID userId) {
        UserApp user = getUser(userId);
        return currencyRateRepository.findByUserOrderByRateDateDesc(user);
    }

    public Optional<CurrencyRate> findById(UUID userId, UUID id) {
        UserApp user = getUser(userId);
        return currencyRateRepository.findByUserAndId(user, id);
    }

    @Transactional
    public CurrencyRate saveManual(UUID userId, UUID rateId, CurrencyCode currency, LocalDate rateDate, BigDecimal rate) {
        UserApp user = getUser(userId);
        CurrencyRate currencyRate;
        if (rateId != null) {
            currencyRate = currencyRateRepository.findByUserAndId(user, rateId)
                    .orElseThrow(() -> new IllegalArgumentException("Exchange rate not found."));
            currencyRate.setCurrency(currency);
            currencyRate.setRateDate(rateDate);
        } else {
            currencyRate = currencyRateRepository
                    .findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, currency, rateDate)
                    .filter(existing -> existing.getRateDate().isEqual(rateDate))
                    .orElse(CurrencyRate.builder()
                            .user(user)
                            .currency(currency)
                            .rateDate(rateDate)
                            .build());
        }
        currencyRate.setRate(rate);
        currencyRate.setManual(true);
        currencyRate.setSource("manual");
        return currencyRateRepository.save(currencyRate);
    }

    @Transactional
    public CurrencyRate saveAutomatic(UserApp user, CurrencyCode currency, LocalDate rateDate, BigDecimal rate, String source) {
        CurrencyRate currencyRate = currencyRateRepository
                .findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, currency, rateDate)
                .filter(existing -> existing.getRateDate().isEqual(rateDate))
                .orElse(CurrencyRate.builder()
                        .user(user)
                        .currency(currency)
                        .rateDate(rateDate)
                        .build());
        currencyRate.setRate(rate);
        currencyRate.setManual(false);
        currencyRate.setSource(source);
        return currencyRateRepository.save(currencyRate);
    }

    @Transactional
    public void delete(UUID userId, UUID rateId) {
        UserApp user = getUser(userId);
        CurrencyRate currencyRate = currencyRateRepository.findByUserAndId(user, rateId)
                .orElseThrow(() -> new IllegalArgumentException("Exchange rate not found."));
        currencyRateRepository.delete(currencyRate);
    }

    private UserApp getUser(UUID userId) {
        return userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }
}
