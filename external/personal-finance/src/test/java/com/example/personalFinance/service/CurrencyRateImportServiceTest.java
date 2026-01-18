package com.example.personalFinance.service;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrencyRateImportServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CurrencyRateService currencyRateService;

    @Mock
    private RestTemplateBuilder restTemplateBuilder;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private CurrencyRateImportService currencyRateImportService;

    private UserApp user;

    @BeforeEach
    void setUp() {
        user = UserApp.builder()
                .id(java.util.UUID.randomUUID())
                .email("user@example.com")
                .baseCurrency(CurrencyCode.USD)
                .build();
        lenient().when(restTemplateBuilder.build()).thenReturn(restTemplate);
        ReflectionTestUtils.setField(currencyRateImportService, "importUrl", "https://example.com/nbu");
    }

    @Test
    void importForUserSavesRatesFromApi() {
        Account account = Account.builder()
                .currency(CurrencyCode.EUR)
                .build();
        when(accountRepository.findAccountsByUserId(user.getId())).thenReturn(List.of(account));
        CurrencyRateImportService.NbuRate usd = new CurrencyRateImportService.NbuRate();
        usd.cc = "USD";
        usd.rate = new BigDecimal("36.5000");
        CurrencyRateImportService.NbuRate eur = new CurrencyRateImportService.NbuRate();
        eur.cc = "EUR";
        eur.rate = new BigDecimal("39.0000");
        when(restTemplate.getForEntity(anyString(), eq(CurrencyRateImportService.NbuRate[].class)))
                .thenReturn(ResponseEntity.ok(new CurrencyRateImportService.NbuRate[]{usd, eur}));

        LocalDate rateDate = LocalDate.of(2024, 5, 1);
        int imported = currencyRateImportService.importForUser(user, rateDate);

        verify(currencyRateService).saveAutomatic(user, CurrencyCode.EUR, rateDate, new BigDecimal("1.068493"), "nbu");
        assertEquals(1, imported);
    }

    @Test
    void importForUserReturnsZeroWhenNoAccountCurrenciesDetected() {
        when(accountRepository.findAccountsByUserId(user.getId())).thenReturn(List.of());

        int imported = currencyRateImportService.importForUser(user, LocalDate.now());

        verify(restTemplate, never()).getForEntity(anyString(), eq(CurrencyRateImportService.NbuRate[].class));
        verify(currencyRateService, never()).saveAutomatic(any(), any(), any(), any(), anyString());
        assertEquals(0, imported);
    }

    @Test
    void importForUserThrowsWhenProviderReturnsEmptyRates() {
        Account account = Account.builder()
                .currency(CurrencyCode.EUR)
                .build();
        when(accountRepository.findAccountsByUserId(user.getId())).thenReturn(List.of(account));

        when(restTemplate.getForEntity(anyString(), eq(CurrencyRateImportService.NbuRate[].class)))
                .thenReturn(ResponseEntity.ok(new CurrencyRateImportService.NbuRate[0]));

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> currencyRateImportService.importForUser(user, LocalDate.now()));

        verify(currencyRateService, never()).saveAutomatic(any(UserApp.class), any(CurrencyCode.class), any(LocalDate.class), any(BigDecimal.class), any(String.class));
    }

    @Test
    void importForUserRequiresBaseCurrency() {
        user.setBaseCurrency(null);

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> currencyRateImportService.importForUser(user, LocalDate.now()));

        verify(restTemplate, never()).getForEntity(anyString(), any());
    }
}
