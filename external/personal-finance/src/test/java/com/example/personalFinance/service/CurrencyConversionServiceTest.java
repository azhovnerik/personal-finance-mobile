package com.example.personalFinance.service;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.CurrencyRate;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.CurrencyRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrencyConversionServiceTest {

    @Mock
    private CurrencyRateRepository currencyRateRepository;

    @Mock
    private UserService userService;

    @Mock
    private CurrencyConversionWarningContext warningContext;

    @InjectMocks
    private CurrencyConversionService currencyConversionService;

    private UserApp user;

    @BeforeEach
    void setUp() {
        user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .baseCurrency(CurrencyCode.USD)
                .build();
    }

    @Test
    void convertToBaseReturnsAmountForBaseCurrency() {
        BigDecimal result = currencyConversionService.convertToBase(user, CurrencyCode.USD, new BigDecimal("10"), LocalDate.now());
        assertEquals(new BigDecimal("10.00"), result);
    }

    @Test
    void convertToBaseAppliesRate() {
        LocalDate rateDate = LocalDate.of(2024, 1, 1);
        CurrencyRate rate = CurrencyRate.builder()
                .user(user)
                .currency(CurrencyCode.EUR)
                .rateDate(rateDate)
                .rate(new BigDecimal("1.2345"))
                .manual(true)
                .source("test")
                .build();
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, CurrencyCode.EUR, rateDate))
                .thenReturn(Optional.of(rate));

        BigDecimal converted = currencyConversionService.convertToBase(user, CurrencyCode.EUR, new BigDecimal("20"), rateDate);
        assertEquals(new BigDecimal("24.69"), converted);
    }

    @Test
    void convertToBaseReturnsZeroWhenRateMissing() {
        LocalDate rateDate = LocalDate.of(2024, 2, 1);
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, CurrencyCode.GBP, rateDate))
                .thenReturn(Optional.empty());

        BigDecimal result = currencyConversionService.convertToBase(user, CurrencyCode.GBP, new BigDecimal("5"), rateDate);

        assertEquals(new BigDecimal("0.00"), result);
        verify(warningContext).addMissingRate(CurrencyCode.GBP, rateDate);
    }

    @Test
    void convertToBaseDoesNotReportWarningForZeroAmount() {
        LocalDate rateDate = LocalDate.of(2024, 6, 1);
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, CurrencyCode.JPY, rateDate))
                .thenReturn(Optional.empty());

        BigDecimal result = currencyConversionService.convertToBase(user, CurrencyCode.JPY, BigDecimal.ZERO, rateDate);

        assertEquals(new BigDecimal("0.00"), result);
        verify(warningContext, never()).addMissingRate(CurrencyCode.JPY, rateDate);
    }

    @Test
    void convertToBaseUsingUserIdDelegatesToUserService() {
        LocalDate rateDate = LocalDate.of(2024, 3, 1);
        UUID userId = user.getId();
        CurrencyRate rate = CurrencyRate.builder()
                .user(user)
                .currency(CurrencyCode.CAD)
                .rateDate(rateDate)
                .rate(new BigDecimal("0.7500"))
                .manual(false)
                .source("api")
                .build();
        when(userService.findById(userId)).thenReturn(Optional.of(user));
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, CurrencyCode.CAD, rateDate))
                .thenReturn(Optional.of(rate));

        BigDecimal converted = currencyConversionService.convertToBase(userId, CurrencyCode.CAD, new BigDecimal("10"), rateDate);
        assertEquals(new BigDecimal("7.50"), converted);
    }

    @Test
    void convertToBaseUsingEpochDate() {
        LocalDate rateDate = LocalDate.of(2024, 4, 15);
        long epoch = rateDate.atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC);
        CurrencyRate rate = CurrencyRate.builder()
                .user(user)
                .currency(CurrencyCode.PLN)
                .rateDate(rateDate)
                .rate(new BigDecimal("0.2500"))
                .manual(true)
                .source("test")
                .build();
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(eq(user), eq(CurrencyCode.PLN), any(LocalDate.class)))
                .thenReturn(Optional.of(rate));

        BigDecimal converted = currencyConversionService.convertToBase(user, CurrencyCode.PLN, new BigDecimal("100"), epoch);
        assertEquals(new BigDecimal("25.00"), converted);
    }
}
