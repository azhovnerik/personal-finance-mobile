package com.example.personalFinance.service;

import com.example.personalFinance.config.LocalizationProperties;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class LocalizationServiceTest {

    private LocalizationService localizationService;

    @BeforeEach
    void setUp() {
        LocalizationProperties properties = new LocalizationProperties();
        properties.setSupportedLanguages(List.of("en", "ua", "es"));
        properties.setDefaultLanguage("en");

        MessageSource messageSource = mock(MessageSource.class);
        localizationService = new LocalizationService(properties, messageSource);
    }

    @Test
    void resolvesRussianLocaleToUkrainian() {
        Locale locale = localizationService.resolveLocale("ru-RU");
        assertEquals(Locale.forLanguageTag("ua"), locale);
    }

    @Test
    void normalizesRussianLanguageCodeToUkrainian() {
        String language = localizationService.normalizeLanguage("ru");
        assertEquals("ua", language);
    }
}
