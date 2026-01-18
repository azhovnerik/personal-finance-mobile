package com.example.personalFinance.config;

import com.example.personalFinance.web.interceptor.CurrencyConversionWarningInterceptor;
import com.example.personalFinance.web.interceptor.OnboardingInterceptor;
import com.example.personalFinance.web.interceptor.SubscriptionAccessInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final OnboardingInterceptor onboardingInterceptor;
    private final CurrencyConversionWarningInterceptor currencyConversionWarningInterceptor;
    private final SubscriptionAccessInterceptor subscriptionAccessInterceptor;
    private final LocaleChangeInterceptor localeChangeInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor)
                .addPathPatterns("/**");
        registry.addInterceptor(currencyConversionWarningInterceptor)
                .addPathPatterns("/**");
        registry.addInterceptor(onboardingInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/onboarding/**", "/css/**", "/js/**", "/images/**", "/webjars/**");
        registry.addInterceptor(subscriptionAccessInterceptor)
                .addPathPatterns("/**");
    }
}
