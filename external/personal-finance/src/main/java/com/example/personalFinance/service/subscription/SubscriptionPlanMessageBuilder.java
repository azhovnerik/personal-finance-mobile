package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.LocalizationService;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class SubscriptionPlanMessageBuilder {

    private final SubscriptionPlanService subscriptionPlanService;
    private final SubscriptionPlanFormatter subscriptionPlanFormatter;
    private final LocalizationService localizationService;
    private final MessageSource messageSource;

    public String buildPlanOptionsBulletList() {
        return buildPlanOptionsBulletList(null);
    }

    public String buildPlanOptionsBulletList(UserApp user) {
        Locale locale = resolveLocale(user);
        return subscriptionPlanService.getActivePaidPlansForUser(user).stream()
                .map(plan -> formatPlanLine(plan, locale))
                .collect(Collectors.joining("\n"));
    }

    private String formatPlanLine(SubscriptionPlan plan, Locale locale) {
        String planName = toTitleCase(plan.getCode());
        String price = formatPrice(plan.getPrice(), plan.getCurrency(), locale);
        String cadence = billingCadence(plan.getBillingPeriod(), locale);
        return messageSource.getMessage(
                "email.plan.option",
                new Object[]{planName, price, cadence},
                String.format("• %s plan for %s %s", planName, price, cadence),
                locale);
    }

    private String formatPrice(BigDecimal price, String currencyCode, Locale locale) {
        DecimalFormat format = new DecimalFormat("#.##", DecimalFormatSymbols.getInstance(locale));
        format.setGroupingUsed(false);
        format.setMinimumFractionDigits(0);
        format.setMaximumFractionDigits(2);
        String amount = format.format(price);
        String currencyLabel = subscriptionPlanFormatter.formatCurrencyLabel(currencyCode, locale);
        return amount + " " + currencyLabel;
    }

    private String billingCadence(SubscriptionBillingPeriod period, Locale locale) {
        return switch (period) {
            case MONTHLY -> messageSource.getMessage(
                    "email.plan.billing.monthly",
                    null,
                    "per month",
                    locale);
            case YEARLY -> messageSource.getMessage(
                    "email.plan.billing.yearly",
                    null,
                    "per year",
                    locale);
            default -> messageSource.getMessage(
                    "email.plan.billing.default",
                    new Object[]{period.name().toLowerCase(Locale.ROOT)},
                    "per " + period.name().toLowerCase(Locale.ROOT),
                    locale);
        };
    }

    private String toTitleCase(String value) {
        return Arrays.stream(value.toLowerCase(Locale.ROOT).split("_"))
                .filter(StringUtils::hasText)
                .map(StringUtils::capitalize)
                .collect(Collectors.joining(" "));
    }

    private Locale resolveLocale(UserApp user) {
        String language = user != null ? user.getInterfaceLanguage() : null;
        return localizationService.resolveLocale(language);
    }
}
