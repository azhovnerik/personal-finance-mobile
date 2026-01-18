package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;

class SubscriptionPlanFormatterTest {

    private SubscriptionPlanFormatter formatter;

    @BeforeEach
    void setUp() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasenames("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);
        formatter = new SubscriptionPlanFormatter(messageSource);
    }

    @Test
    void formatCurrencyLabelReturnsLocalizedValueForUaLocale() {
        String label = formatter.formatCurrencyLabel("UAH", Locale.forLanguageTag("ua"));

        assertThat(label).isEqualTo("грн");
    }

    @Test
    void formatCurrencyLabelFallsBackToUppercaseCodeWhenMessageMissing() {
        String label = formatter.formatCurrencyLabel("ABC", Locale.ENGLISH);

        assertThat(label).isEqualTo("ABC");
    }
}
