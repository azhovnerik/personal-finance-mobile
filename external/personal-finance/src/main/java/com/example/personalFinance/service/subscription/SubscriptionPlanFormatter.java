package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionPlan;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class SubscriptionPlanFormatter {

    private final MessageSource messageSource;

    public SubscriptionPlanFormatter(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public String formatPlanName(SubscriptionPlan plan) {
        if (plan == null || !StringUtils.hasText(plan.getCode())) {
            return "";
        }
        return Stream.of(plan.getCode().toLowerCase(Locale.ROOT).split("_"))
                .filter(StringUtils::hasText)
                .map(StringUtils::capitalize)
                .collect(Collectors.joining(" "));
    }

    public String formatPlanDisplayName(SubscriptionPlan plan) {
        return formatPlanName(plan).toUpperCase(Locale.ROOT);
    }

    public String formatCurrencyLabel(String currency, Locale locale) {
        if (!StringUtils.hasText(currency)) {
            return "";
        }
        String key = "currency.display." + currency.toLowerCase(Locale.ROOT);
        try {
            return messageSource.getMessage(key, null, currency.toUpperCase(Locale.ROOT), locale);
        } catch (NoSuchMessageException ex) {
            return currency.toUpperCase(Locale.ROOT);
        }
    }
}
