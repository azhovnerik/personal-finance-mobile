package com.example.personalFinance.config;

import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

@Configuration
@RequiredArgsConstructor
public class LocalizationConfiguration {

    private final LocalizationProperties properties;
    private final LocalizationService localizationService;
    private final UserService userService;

    @Bean
    public LocaleResolver localeResolver() {
        UserLocaleResolver resolver = new UserLocaleResolver(localizationService, userService);
        resolver.setDefaultLocale(localizationService.getDefaultLocale());
        resolver.setCookieName(properties.getCookieName());
        resolver.setCookieMaxAge((int) Duration.ofDays(properties.getCookieMaxAgeDays()).getSeconds());
        resolver.setCookieSecure(false);
        return resolver;
    }

    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }
}
