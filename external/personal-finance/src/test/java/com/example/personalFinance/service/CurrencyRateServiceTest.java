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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrencyRateServiceTest {

    @Mock
    private CurrencyRateRepository currencyRateRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private CurrencyRateService currencyRateService;

    private UserApp user;

    @BeforeEach
    void setUp() {
        user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .baseCurrency(CurrencyCode.USD)
                .build();
        lenient().when(userService.findById(user.getId())).thenReturn(Optional.of(user));
    }

    @Test
    void saveManualCreatesNewRateWhenAbsent() {
        LocalDate rateDate = LocalDate.of(2024, 1, 10);
        BigDecimal rateValue = new BigDecimal("1.234500");
        when(currencyRateRepository.findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(user, CurrencyCode.EUR, rateDate))
                .thenReturn(Optional.empty());
        when(currencyRateRepository.save(any(CurrencyRate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0, CurrencyRate.class));

        CurrencyRate saved = currencyRateService.saveManual(user.getId(), null, CurrencyCode.EUR, rateDate, rateValue);

        assertEquals(rateDate, saved.getRateDate());
        assertEquals(CurrencyCode.EUR, saved.getCurrency());
        assertEquals(rateValue, saved.getRate());
        assertTrue(saved.isManual());
        assertEquals("manual", saved.getSource());
        verify(currencyRateRepository).save(saved);
    }

    @Test
    void saveManualUpdatesExistingRateById() {
        UUID rateId = UUID.randomUUID();
        CurrencyRate existing = CurrencyRate.builder()
                .id(rateId)
                .user(user)
                .currency(CurrencyCode.EUR)
                .rateDate(LocalDate.of(2024, 2, 1))
                .rate(new BigDecimal("1.100000"))
                .manual(false)
                .source("auto")
                .build();
        when(currencyRateRepository.findByUserAndId(user, rateId)).thenReturn(Optional.of(existing));
        when(currencyRateRepository.save(existing)).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDate newDate = LocalDate.of(2024, 2, 15);
        BigDecimal newRate = new BigDecimal("0.850000");
        CurrencyRate updated = currencyRateService.saveManual(user.getId(), rateId, CurrencyCode.GBP, newDate, newRate);

        assertEquals(existing, updated);
        assertEquals(CurrencyCode.GBP, existing.getCurrency());
        assertEquals(newDate, existing.getRateDate());
        assertEquals(newRate, existing.getRate());
        assertTrue(existing.isManual());
        assertEquals("manual", existing.getSource());
        verify(currencyRateRepository).save(existing);
    }

    @Test
    void saveManualThrowsWhenRateNotFoundForUpdate() {
        UUID missingId = UUID.randomUUID();
        when(currencyRateRepository.findByUserAndId(user, missingId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> currencyRateService.saveManual(user.getId(), missingId, CurrencyCode.CHF,
                        LocalDate.of(2024, 3, 1), new BigDecimal("0.910000")));
        verify(currencyRateRepository, never()).save(any(CurrencyRate.class));
    }

    @Test
    void deleteRemovesRate() {
        UUID rateId = UUID.randomUUID();
        CurrencyRate existing = CurrencyRate.builder()
                .id(rateId)
                .user(user)
                .currency(CurrencyCode.PLN)
                .rateDate(LocalDate.of(2024, 4, 1))
                .rate(new BigDecimal("0.250000"))
                .build();
        when(currencyRateRepository.findByUserAndId(user, rateId)).thenReturn(Optional.of(existing));

        currencyRateService.delete(user.getId(), rateId);

        verify(currencyRateRepository).delete(existing);
    }

    @Test
    void deleteThrowsWhenRateMissing() {
        UUID rateId = UUID.randomUUID();
        when(currencyRateRepository.findByUserAndId(user, rateId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> currencyRateService.delete(user.getId(), rateId));
        verify(currencyRateRepository, never()).delete(any(CurrencyRate.class));
    }
}
