package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.personalFinance.dto.SubscriptionCheckoutSession;
import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.LocalizationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;

class LiqPayCheckoutServiceTest {

    private LocalizationService localizationService;
    private LiqPayCheckoutService service;
    private Locale originalDefaultLocale;

    @BeforeEach
    void setUp() {
        localizationService = mock(LocalizationService.class);
        service = new LiqPayCheckoutService(
                new ObjectMapper(),
                "pub",
                "priv",
                "https://checkout",
                "https://server",
                "https://result",
                "https://app",
                "/subscriptions",
                mock(SubscriptionPaymentFlowLogger.class),
                localizationService
        );
        originalDefaultLocale = Locale.getDefault();
    }

    @AfterEach
    void tearDown() {
        Locale.setDefault(originalDefaultLocale);
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void resolveLanguagePrefersUserInterfaceLanguage() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage("en");
        when(localizationService.normalizeLanguage("en")).thenReturn("en");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("en");
        verify(localizationService).normalizeLanguage("en");
    }

    @Test
    void resolveLanguageFallsBackToLocaleContextHolder() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage(null);
        LocaleContextHolder.setLocale(Locale.forLanguageTag("pl-PL"));
        when(localizationService.normalizeLanguage("pl")).thenReturn("pl");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("en");
        verify(localizationService).normalizeLanguage("pl");
        verify(localizationService, never()).getDefaultLanguage();
    }

    @Test
    void resolveLanguageFallsBackToSystemDefault() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage("");
        LocaleContextHolder.resetLocaleContext();
        Locale.setDefault(Locale.GERMANY);
        when(localizationService.normalizeLanguage("de")).thenReturn("de");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("en");
        verify(localizationService).normalizeLanguage("de");
    }

    @Test
    void resolveLanguageFallsBackToApplicationDefault() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage(null);
        LocaleContextHolder.resetLocaleContext();
        Locale.setDefault(Locale.ROOT);
        when(localizationService.getDefaultLanguage()).thenReturn("en");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("en");
        verify(localizationService).getDefaultLanguage();
    }

    @Test
    void resolveLanguageMapsUkrainianLanguageCode() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage("ua");
        when(localizationService.normalizeLanguage("ua")).thenReturn("ua");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("uk");
        verify(localizationService).normalizeLanguage("ua");
    }

    @Test
    void resolveLanguageMapsUnsupportedLanguageToEnglish() {
        UserApp user = new UserApp();
        user.setInterfaceLanguage("pl");
        when(localizationService.normalizeLanguage("pl")).thenReturn("pl");

        String language = service.resolveLanguage(user);

        assertThat(language).isEqualTo("en");
        verify(localizationService).normalizeLanguage("pl");
    }

    @Test
    void createCheckoutSessionPropagatesLanguageToClientPayload() {
        UserApp user = new UserApp();
        user.setId(UUID.randomUUID());
        user.setInterfaceLanguage("en");
        when(localizationService.normalizeLanguage("en")).thenReturn("en");

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("STANDARD_MONTHLY")
                .type(SubscriptionType.STANDART_MONTHLY)
                .billingPeriod(SubscriptionBillingPeriod.MONTHLY)
                .price(new BigDecimal("9.99"))
                .currency("USD")
                .trialAvailable(false)
                .trialPeriodDays(null)
                .active(true)
                .build();

        SubscriptionCheckoutSession session = service.createCheckoutSession(user, plan);

        assertThat(session.getLanguage()).isEqualTo("en");
    }
}
