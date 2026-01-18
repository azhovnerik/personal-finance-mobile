package com.example.personalFinance.service;

import com.example.personalFinance.config.LocalizationProperties;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class LocalizationService {

    private static final Map<String, String> LANGUAGE_ALIASES = Map.ofEntries(
            Map.entry("it", "it-IT"),
            Map.entry("nl", "nl-NL"),
            Map.entry("tr", "tr-TR"),
            Map.entry("ja", "ja-JP"),
            Map.entry("ko", "ko-KR"),
            Map.entry("zh", "zh-CN"),
            Map.entry("zh-hans", "zh-CN"),
            Map.entry("zh-hant", "zh-TW"),
            Map.entry("pt-br", "pt-BR"),
            Map.entry("ru", "ua"),
            Map.entry("ru-ru", "ua"));

    private static final Map<String, List<String>> LANGUAGE_FALLBACKS = Map.ofEntries(
            Map.entry("it-it", List.of("en")),
            Map.entry("nl-nl", List.of("en")),
            Map.entry("tr-tr", List.of("en")),
            Map.entry("ja-jp", List.of("en")),
            Map.entry("ko-kr", List.of("en")),
            Map.entry("zh-cn", List.of("zh", "en")),
            Map.entry("zh-tw", List.of("zh-hant", "zh", "en")),
            Map.entry("zh-hant", List.of("zh", "en")),
            Map.entry("pt-br", List.of("pt", "en")),
            Map.entry("pt", List.of("en")),
            Map.entry("zh", List.of("en")));

    private final LocalizationProperties properties;
    private final MessageSource messageSource;

    public List<String> getSupportedLanguageCodes() {
        Map<String, String> canonicalByLowerCase = new LinkedHashMap<>();
        for (String language : properties.getSupportedLanguages()) {
            if (!StringUtils.hasText(language)) {
                continue;
            }
            String canonical = canonicalizeLanguageTag(language);
            canonicalByLowerCase.put(canonical.toLowerCase(Locale.ROOT), canonical);
        }
        return canonicalByLowerCase.values().stream().toList();
    }

    public Locale getDefaultLocale() {
        return toLocale(properties.getDefaultLanguage());
    }

    public String getDefaultLanguage() {
        return canonicalizeLanguageTag(properties.getDefaultLanguage());
    }

    public Locale resolveLocale(String language) {
        return toLocale(normalizeLanguage(language));
    }

    public String normalizeLanguage(String language) {
        if (!StringUtils.hasText(language)) {
            return getDefaultLanguage();
        }
        Set<String> supported = new LinkedHashSet<>(getSupportedLanguageCodes());
        String candidate = canonicalizeLanguageTag(language);
        if (supported.contains(candidate)) {
            return candidate;
        }
        String aliasMatch = resolveAlias(candidate, supported);
        if (aliasMatch != null) {
            return aliasMatch;
        }
        String fallback = resolveFallback(candidate, supported, new LinkedHashSet<>());
        return fallback != null ? fallback : getDefaultLanguage();
    }

    public List<LocaleOption> getLocaleOptions() {
        return getSupportedLanguageCodes().stream()
                .map(code -> new LocaleOption(code, resolveLanguageDisplayName(code)))
                .toList();
    }

    public Locale resolveDateLocale(Locale locale) {
        if (locale == null) {
            return getDefaultLocale();
        }
        String languageTag = locale.toLanguageTag();
        if ("ua".equalsIgnoreCase(languageTag) || "ua-UA".equalsIgnoreCase(languageTag)) {
            return Locale.forLanguageTag("uk-UA");
        }
        return locale;
    }

    public record LocaleOption(String code, String displayName) {
    }

    private String resolveLanguageDisplayName(String code) {
        String normalizedCode = normalizeLanguage(code);
        Locale targetLocale = resolveLocale(normalizedCode);
        try {
            return messageSource.getMessage(
                    "language.name." + normalizedCode.toLowerCase(Locale.ROOT),
                    null,
                    normalizedCode.toUpperCase(Locale.ROOT),
                    targetLocale);
        } catch (NoSuchMessageException ex) {
            return normalizedCode.toUpperCase(Locale.ROOT);
        }
    }

    private Locale toLocale(String language) {
        String normalized = canonicalizeLanguageTag(language);
        return Locale.forLanguageTag(normalized);
    }

    private String canonicalizeLanguageTag(String language) {
        if (!StringUtils.hasText(language)) {
            String defaultLanguage = properties.getDefaultLanguage();
            return StringUtils.hasText(defaultLanguage)
                    ? canonicalizeLanguageTag(defaultLanguage)
                    : "en";
        }
        Locale locale = Locale.forLanguageTag(language);
        String tag = locale.toLanguageTag();
        if (StringUtils.hasText(tag)) {
            return tag;
        }
        return language.toLowerCase(Locale.ROOT);
    }

    private String resolveAlias(String language, Set<String> supported) {
        return Optional.ofNullable(LANGUAGE_ALIASES.get(language.toLowerCase(Locale.ROOT)))
                .map(this::canonicalizeLanguageTag)
                .filter(supported::contains)
                .orElse(null);
    }

    private String resolveFallback(String language, Set<String> supported, Set<String> visited) {
        String key = language.toLowerCase(Locale.ROOT);
        if (!visited.add(key)) {
            return null;
        }
        List<String> fallbacks = LANGUAGE_FALLBACKS.getOrDefault(key, List.of());
        for (String fallbackCandidate : fallbacks) {
            String canonical = canonicalizeLanguageTag(fallbackCandidate);
            if (supported.contains(canonical)) {
                return canonical;
            }
            String nested = resolveFallback(canonical, supported, visited);
            if (nested != null) {
                return nested;
            }
        }
        return null;
    }
}
