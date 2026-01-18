package com.example.personalFinance.service.subscription;

import com.example.personalFinance.dto.SubscriptionCheckoutSession;
import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.LocalizationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.liqpay.LiqPay;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class LiqPayCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(LiqPayCheckoutService.class);
    private static final DateTimeFormatter LIQPAY_DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    static final String ORDER_ID_DELIMITER = "--";

    private final ObjectMapper objectMapper;
    private final String publicKey;
    private final String privateKey;
    private final String checkoutUrl;
    private final String serverCallbackUrl;
    private final String resultUrl;
    private final String appBaseUrl;
    private final String subscriptionPagePath;
    private final LocalizationService localizationService;
    private final SubscriptionPaymentFlowLogger paymentFlowLogger;

    public LiqPayCheckoutService(ObjectMapper objectMapper,
                                 @Value("${app.subscription.liqpay.public-key:}") String publicKey,
                                 @Value("${app.subscription.liqpay.private-key:}") String privateKey,
                                 @Value("${app.subscription.liqpay.checkout-url:https://www.liqpay.ua/api/3/checkout}") String checkoutUrl,
//                                 @Value("${app.subscription.liqpay.checkout-url:https://www.liqpay.ua/api/request}") String checkoutUrl,
                                 @Value("${app.subscription.liqpay.server-callback-url:}") String serverCallbackUrl,
                                 @Value("${app.subscription.liqpay.result-url:}") String resultUrl,
                                 @Value("${app.base-url:}") String appBaseUrl,
                                 @Value("${app.subscription.page-path:/subscriptions}") String subscriptionPagePath,
                                 SubscriptionPaymentFlowLogger paymentFlowLogger,
                                 LocalizationService localizationService) {
        this.objectMapper = objectMapper;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.checkoutUrl = checkoutUrl;
        this.serverCallbackUrl = serverCallbackUrl;
        this.resultUrl = resultUrl;
        this.appBaseUrl = appBaseUrl;
        this.subscriptionPagePath = subscriptionPagePath;
        this.paymentFlowLogger = paymentFlowLogger;
        this.localizationService = localizationService;
    }

    public SubscriptionCheckoutSession createCheckoutSession(UserApp user, SubscriptionPlan plan) {
        validateConfiguration();
        String orderId = buildOrderId(user, plan);
        String amount = formatAmount(plan.getPrice());

        String language = resolveLanguage(user);
        LiqPayClient liqPay = createClient();
        Map<String, String> params = buildRequestParams(user, plan, orderId, amount, language);
        String checkoutFormHtml;
        try {
            checkoutFormHtml = buildCheckoutForm(liqPay, params);
        } catch (RuntimeException ex) {
            paymentFlowLogger.logError(user.getId(), orderId, "CHECKOUT_FORM_ERROR",
                    "Failed to build LiqPay checkout form", ex);
            throw ex;
        }
        Map<String, String> requestData = liqPay.buildRequestData(params);

        logCheckoutSession(user, plan, orderId, params);

        return SubscriptionCheckoutSession.builder()
                .checkoutUrl(checkoutUrl)
                .data(requestData.get("data"))
                .signature(requestData.get("signature"))
                .checkoutFormHtml(checkoutFormHtml)
                .language(language)
                .providerReference(plan.getCode())
                .orderId(orderId)
                .orderDescription(formatOrderDescription(plan))
                .amount(toMinorUnits(plan.getPrice()))
                .currency(plan.getCurrency())
                .build();
    }

    private String buildCheckoutForm(LiqPayClient liqPay, Map<String, String> params) {
        try {
            String formHtml = liqPay.buildCheckoutForm(params);
            if (!StringUtils.hasText(formHtml)) {
                throw new IllegalStateException("LiqPay checkout form is unavailable. Please try again later.");
            }
            return formHtml;
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Unable to prepare payment request. Please try again later.", ex);
        }
    }

    private void logCheckoutSession(UserApp user, SubscriptionPlan plan, String orderId, Map<String, String> params) {
        Map<String, String> context = new LinkedHashMap<>();
        if (plan != null && StringUtils.hasText(plan.getCode())) {
            context.put("plan", plan.getCode());
        }
        context.put("amount", params.get("amount"));
        context.put("currency", params.get("currency"));
        if (params.containsKey("server_url")) {
            context.put("server_url", params.get("server_url"));
        }
        if (params.containsKey("result_url")) {
            context.put("result_url", params.get("result_url"));
        }
        paymentFlowLogger.logStep(user != null ? user.getId() : null, orderId,
                "CHECKOUT_SESSION_CREATED", "Prepared LiqPay checkout session", context);
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(publicKey) || !StringUtils.hasText(privateKey)) {
            throw new IllegalStateException("LiqPay integration is not configured. Please contact support.");
        }
    }

    private LiqPayClient createClient() {
        try {
            return new LiqPayClient(publicKey, privateKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("LiqPay integration is not configured. Please contact support.", ex);
        }
    }

    private Map<String, String> buildRequestParams(UserApp user, SubscriptionPlan plan, String orderId, String amount,
                                                  String language) {
        Map<String, String> request = new LinkedHashMap<>();
        request.put("public_key", publicKey);
        request.put("version", "3");
        request.put("action", "subscribe");
        request.put("amount", amount);
        request.put("currency", plan.getCurrency());
        request.put("description", formatOrderDescription(plan));
        request.put("order_id", orderId);
        request.put("language", language);
        request.put("subscribe", "1");
        request.put("subscribe_date_start", determineSubscriptionStart(plan).format(LIQPAY_DATETIME_FORMAT));
        request.put("subscribe_periodicity", resolvePeriod(plan.getBillingPeriod()));
        request.put("subscribe_amount", amount);
        request.put("subscribe_currency", plan.getCurrency());
        request.put("info", plan.getCode());
        String callbackUrl = resolveServerCallbackUrl();
        if (StringUtils.hasText(callbackUrl)) {
            request.put("server_url", callbackUrl);
        }
        String resultCallbackUrl = resolveResultUrl();
        if (StringUtils.hasText(resultCallbackUrl)) {
            request.put("result_url", resultCallbackUrl);
        }
        if (StringUtils.hasText(user.getEmail())) {
            request.put("customer", toJson(Map.of(
                    "email", user.getEmail(),
                    "id", user.getId().toString()
            )));
        }
        return request;
    }

    private LocalDateTime determineSubscriptionStart(SubscriptionPlan plan) {
        if (plan.isTrialAvailable() && plan.getTrialPeriodDays() != null && plan.getTrialPeriodDays() > 0) {
            return LocalDateTime.now().plusDays(plan.getTrialPeriodDays());
        }
        return LocalDateTime.now();
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Unable to serialize LiqPay payload", e);
            throw new IllegalStateException("Unable to prepare payment request. Please try again later.", e);
        }
    }

    private String resolvePeriod(SubscriptionBillingPeriod billingPeriod) {
        return switch (billingPeriod) {
            case MONTHLY -> "month";
            case YEARLY -> "year";
            default -> billingPeriod.name().toLowerCase(Locale.ROOT);
        };
    }

    String resolveLanguage(UserApp user) {
        String preferredLanguage = resolvePreferredLanguage(user);
        return mapToCheckoutLanguage(preferredLanguage);
    }

    private String resolvePreferredLanguage(UserApp user) {
        if (user != null && StringUtils.hasText(user.getInterfaceLanguage())) {
            return localizationService.normalizeLanguage(user.getInterfaceLanguage());
        }

        String localeLanguage = resolveLocaleLanguage(LocaleContextHolder.getLocale());
        if (localeLanguage != null) {
            return localeLanguage;
        }

        String systemLanguage = resolveLocaleLanguage(Locale.getDefault());
        if (systemLanguage != null) {
            return systemLanguage;
        }

        return localizationService.getDefaultLanguage();
    }

    private String mapToCheckoutLanguage(String language) {
        if (!StringUtils.hasText(language)) {
            return "en";
        }
        String normalized = language.toLowerCase(Locale.ROOT);
        if ("ua".equals(normalized)) {
            return "uk";
        }
        if ("uk".equals(normalized) || "en".equals(normalized) || "ru".equals(normalized)) {
            return normalized;
        }
        return "en";
    }

    private String resolveLocaleLanguage(Locale locale) {
        if (locale == null) {
            return null;
        }
        if (StringUtils.hasText(locale.getLanguage())) {
            return localizationService.normalizeLanguage(locale.getLanguage());
        }
        String languageTag = locale.toLanguageTag();
        if (StringUtils.hasText(languageTag) && !"und".equalsIgnoreCase(languageTag)) {
            return localizationService.normalizeLanguage(languageTag);
        }
        return null;
    }

    private String formatOrderDescription(SubscriptionPlan plan) {
        return String.format("%s subscription", toTitleCase(plan.getCode()));
    }

    private String formatAmount(BigDecimal price) {
        return price.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String toTitleCase(String code) {
        return Arrays.stream(code.toLowerCase(Locale.ROOT).split("_"))
                .filter(part -> !part.isBlank())
                .map(this::capitalize)
                .collect(Collectors.joining(" "));
    }

    private String capitalize(String value) {
        if (value.isEmpty()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private String buildOrderId(UserApp user, SubscriptionPlan plan) {
        return user.getId() + ORDER_ID_DELIMITER + plan.getCode() + ORDER_ID_DELIMITER + UUID.randomUUID();
    }

    private long toMinorUnits(BigDecimal price) {
        BigDecimal normalized = price.setScale(2, RoundingMode.HALF_UP);
        return normalized.movePointRight(2).longValueExact();
    }

    private String resolveServerCallbackUrl() {
        if (StringUtils.hasText(serverCallbackUrl)) {
            return serverCallbackUrl;
        }
        String baseUrl = resolveBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            return null;
        }
        return UriComponentsBuilder.fromUriString(baseUrl)
                .path("/subscriptions/liqpay/callback")
                .build()
                .toUriString();
    }

    private String resolveResultUrl() {
        if (StringUtils.hasText(resultUrl)) {
            return resultUrl;
        }
        String baseUrl = resolveBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            return null;
        }
        String path = StringUtils.hasText(subscriptionPagePath) ? subscriptionPagePath : "/subscriptions";
        return UriComponentsBuilder.fromUriString(baseUrl)
                .path(path.startsWith("/") ? path : "/" + path)
                .build()
                .toUriString();
    }

    private String resolveBaseUrl() {
        String runtimeUrl = resolveRuntimeBaseUrl();
        if (StringUtils.hasText(runtimeUrl)) {
            if (!StringUtils.hasText(appBaseUrl) || isLocalhost(appBaseUrl)) {
                return runtimeUrl;
            }
        }
        if (StringUtils.hasText(appBaseUrl)) {
            return appBaseUrl;
        }
        return runtimeUrl;
    }

    private String resolveRuntimeBaseUrl() {
        try {
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .build()
                    .toUriString();
        } catch (IllegalStateException ex) {
            log.debug("Unable to determine request base URL for LiqPay checkout", ex);
            return null;
        }
    }

    private boolean isLocalhost(String url) {
        String normalized = url.toLowerCase(Locale.ROOT);
        return normalized.contains("localhost") || normalized.contains("127.0.0.1");
    }

    private static final class LiqPayClient extends LiqPay {
        private LiqPayClient(String publicKey, String privateKey) {
            super(publicKey, privateKey);
        }

        private Map<String, String> buildRequestData(Map<String, String> params) {
            return generateData(params);
        }

        private String buildCheckoutForm(Map<String, String> params) {
            return cnb_form(params);
        }
    }
}
