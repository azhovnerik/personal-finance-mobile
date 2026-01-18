package com.example.personalFinance.web.advice;

import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.LocalizationService.LocaleOption;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
@RequiredArgsConstructor
public class LocalizationModelAdvice {

    private final LocalizationService localizationService;

    @ModelAttribute("supportedLanguages")
    public List<LocaleOption> supportedLanguages() {
        return localizationService.getLocaleOptions();
    }

    @ModelAttribute("currentLanguage")
    public String currentLanguage(Locale locale) {
        String language = locale != null ? locale.toLanguageTag() : null;
        return localizationService.normalizeLanguage(language);
    }
}
