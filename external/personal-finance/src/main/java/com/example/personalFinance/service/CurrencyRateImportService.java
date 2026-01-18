package com.example.personalFinance.service;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrencyRateImportService {

    private static final DateTimeFormatter NBU_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String SOURCE = "nbu";

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final CurrencyRateService currencyRateService;
    private final RestTemplateBuilder restTemplateBuilder;

    @Value("${app.currency-rate.import-url:https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange}")
    private String importUrl;

    @Value("${app.currency-rate.import-enabled:true}")
    private boolean importEnabled;

    @Scheduled(cron = "0 0 3 * * *")
    public void importDailyRates() {
        if (!importEnabled) {
            log.debug("Currency rate import disabled");
            return;
        }
        LocalDate today = LocalDate.now();
        userRepository.findAll().forEach(user -> importForUser(user, today));
    }

    public int importForUser(UserApp user, LocalDate rateDate) {
        CurrencyCode baseCurrency = user.getBaseCurrency();
        if (baseCurrency == null) {
            throw new IllegalStateException("Base currency must be set before importing rates.");
        }
        Set<CurrencyCode> currencies = collectCurrencies(user);
        currencies.remove(baseCurrency);
        if (currencies.isEmpty()) {
            return 0;
        }
        try {
            String url = String.format("%s?date=%s&json", importUrl, rateDate.format(NBU_DATE_FORMAT));
            ResponseEntity<NbuRate[]> response = restTemplateBuilder.build().getForEntity(url, NbuRate[].class);
            if (!response.hasBody() || response.getBody() == null || response.getBody().length == 0) {
                log.warn("Empty response from NBU API for user {}", user.getId());
                throw new IllegalStateException("The national bank did not return any exchange rates for the selected date.");
            }

            Map<CurrencyCode, BigDecimal> ratesByCurrency = extractRates(response.getBody());
            BigDecimal baseRateInUah = resolveBaseRate(baseCurrency, ratesByCurrency);

            int saved = 0;
            for (CurrencyCode currency : currencies) {
                BigDecimal rateInUah = ratesByCurrency.get(currency);
                if (rateInUah == null) {
                    log.info("No NBU rate published for {} on {}", currency, rateDate);
                    continue;
                }
                BigDecimal normalizedRate = rateInUah.divide(baseRateInUah, 6, RoundingMode.HALF_UP);
                currencyRateService.saveAutomatic(user, currency, rateDate, normalizedRate, SOURCE);
                saved++;
            }
            if (saved == 0) {
                throw new IllegalStateException("The national bank does not publish rates for the selected currencies on "
                        + rateDate + ".");
            }
            return saved;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Failed to import currency rates for user {}: {}", user.getId(), ex.getMessage());
            throw new IllegalStateException("Failed to import exchange rates. Please try again later.", ex);
        }
    }

    private Set<CurrencyCode> collectCurrencies(UserApp user) {
        Set<CurrencyCode> result = EnumSet.noneOf(CurrencyCode.class);
        List<Account> accounts = accountRepository.findAccountsByUserId(user.getId());
        for (Account account : accounts) {
            CurrencyCode currency = account.getCurrency();
            if (currency != null) {
                result.add(currency);
            }
        }
        return result;
    }

    private Map<CurrencyCode, BigDecimal> extractRates(NbuRate[] body) {
        Map<CurrencyCode, BigDecimal> result = new EnumMap<>(CurrencyCode.class);
        for (NbuRate rate : body) {
            if (rate == null || rate.cc == null || rate.rate == null) {
                continue;
            }
            try {
                CurrencyCode currency = CurrencyCode.valueOf(rate.cc);
                result.put(currency, rate.rate);
            } catch (IllegalArgumentException ex) {
                log.debug("Skipping unsupported currency {} returned by NBU", rate.cc);
            }
        }
        return result;
    }

    private BigDecimal resolveBaseRate(CurrencyCode baseCurrency, Map<CurrencyCode, BigDecimal> ratesByCurrency) {
        if (baseCurrency == CurrencyCode.UAH) {
            return BigDecimal.ONE;
        }
        BigDecimal baseRate = ratesByCurrency.get(baseCurrency);
        if (baseRate == null) {
            throw new IllegalStateException("The national bank does not provide a rate for base currency "
                    + baseCurrency + ".");
        }
        return baseRate;
    }

    public static class NbuRate {
        public String cc;
        public BigDecimal rate;
        public String exchangedate;
    }
}
