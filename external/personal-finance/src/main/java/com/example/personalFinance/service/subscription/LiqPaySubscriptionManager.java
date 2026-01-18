package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.service.LocalizationService;
import com.liqpay.LiqPay;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiqPaySubscriptionManager {

    private final SubscriptionPaymentFlowLogger paymentFlowLogger;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;

    @Value("${app.subscription.liqpay.public-key:}")
    private String publicKey;

    @Value("${app.subscription.liqpay.private-key:}")
    private String privateKey;

    public void cancelSubscription(UserSubscription subscription) {
        if (subscription == null) {
            throw new IllegalArgumentException("Subscription is required for LiqPay cancellation");
        }
        UUID userId = subscription.getUser() != null ? subscription.getUser().getId() : null;
        String orderId = subscription.getId() != null ? subscription.getId().toString() : null;

        if (!StringUtils.hasText(publicKey) || !StringUtils.hasText(privateKey)) {
            paymentFlowLogger.logError(userId, orderId, "LIQPAY_UNSUBSCRIBE_CONFIGURATION_MISSING",
                    "LiqPay credentials are not configured", null);
            throw new IllegalStateException(message("subscription.error.liqpayNotConfigured"));
        }
        String providerSubscriptionId = subscription.getPaymentSubscriptionId();
        if (!StringUtils.hasText(providerSubscriptionId)) {
            paymentFlowLogger.logError(userId, orderId, "LIQPAY_UNSUBSCRIBE_IDENTIFIER_MISSING",
                    "Subscription does not contain provider subscription id", null);
            throw new IllegalStateException(message("subscription.error.liqpaySubscriptionIdMissing"));
        }

        try {
            LiqPay client = new LiqPay(publicKey, privateKey);

            LiqPayUnsubscribeResult paymentIdAttempt = sendUnsubscribeRequest(client, subscription,
                    providerSubscriptionId, LiqPayIdentifierField.PAYMENT_ID, userId, orderId);

            if (paymentIdAttempt.success()) {
                return;
            }

            if (shouldRetryWithAlternateIdentifier(paymentIdAttempt)) {
                LiqPayUnsubscribeResult subscribeIdAttempt = sendUnsubscribeRequest(client, subscription,
                        providerSubscriptionId, LiqPayIdentifierField.SUBSCRIBE_ID, userId, orderId);
                if (subscribeIdAttempt.success()) {
                    return;
                }
                throw new IllegalStateException(resolveErrorMessage(subscribeIdAttempt));
            }

            throw new IllegalStateException(resolveErrorMessage(paymentIdAttempt));
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            paymentFlowLogger.logError(userId, orderId, "LIQPAY_UNSUBSCRIBE_ERROR",
                    "Failed to cancel subscription in LiqPay", ex);
            throw new IllegalStateException(message("subscription.error.liqpayCancellationFailed"), ex);
        }
    }

    private LiqPayUnsubscribeResult sendUnsubscribeRequest(LiqPay client,
                                                           UserSubscription subscription,
                                                           String providerSubscriptionId,
                                                           LiqPayIdentifierField identifierField,
                                                           UUID userId,
                                                           String orderId) throws Exception {
        Map<String, String> request = new LinkedHashMap<>();
        request.put("action", "unsubscribe");
        request.put("version", "3");
        request.put("public_key", publicKey);
        request.put(identifierField.fieldName(), providerSubscriptionId);
        if (subscription.getId() != null) {
            request.put("order_id", subscription.getId().toString());
        }
        if (StringUtils.hasText(subscription.getPaymentCustomerToken())) {
            request.put("card_token", subscription.getPaymentCustomerToken());
        }

        Map<String, String> requestContext = new LinkedHashMap<>();
        requestContext.put("identifier_type", identifierField.logValue());
        requestContext.put(identifierField.fieldName(), providerSubscriptionId);
        if (request.containsKey("order_id")) {
            requestContext.put("order_id", request.get("order_id"));
        }

        paymentFlowLogger.logStep(userId, orderId, "LIQPAY_UNSUBSCRIBE_REQUEST",
                "Sending unsubscribe request to LiqPay", requestContext);

        Map<String, Object> response = client.api("request", request);

        Map<String, String> responseContext = new LinkedHashMap<>(requestContext);
        String status = extractText(response, "status");
        String result = extractText(response, "result");
        String errorDescription = extractText(response, "err_description");
        String errorCode = extractText(response, "err_code");
        if (StringUtils.hasText(status)) {
            responseContext.put("status", status);
        }
        if (StringUtils.hasText(result)) {
            responseContext.put("result", result);
        }
        if (StringUtils.hasText(errorDescription)) {
            responseContext.put("error_description", errorDescription);
        }
        if (StringUtils.hasText(errorCode)) {
            responseContext.put("error_code", errorCode);
        }

        boolean success = isSuccess(status) || isSuccess(result);
        if (success) {
            paymentFlowLogger.logStep(userId, orderId, "LIQPAY_UNSUBSCRIBE_SUCCESS",
                    "Cancelled subscription in LiqPay", responseContext);
        } else {
            paymentFlowLogger.logStep(userId, orderId, "LIQPAY_UNSUBSCRIBE_FAILED",
                    "LiqPay returned non-success response for unsubscribe", responseContext);
        }

        return new LiqPayUnsubscribeResult(success, status, result, errorDescription, errorCode);
    }

    private boolean shouldRetryWithAlternateIdentifier(LiqPayUnsubscribeResult result) {
        if (result == null || result.success()) {
            return false;
        }
        if (StringUtils.hasText(result.errorCode())) {
            String lowerCode = result.errorCode().toLowerCase(Locale.ROOT);
            if (lowerCode.contains("payment_not_found") || lowerCode.contains("subscribe_not_found")) {
                return true;
            }
        }
        if (StringUtils.hasText(result.errorDescription())) {
            String lowerDescription = result.errorDescription().toLowerCase(Locale.ROOT);
            if (lowerDescription.contains("не знайден") || lowerDescription.contains("not found")) {
                return true;
            }
        }
        return false;
    }

    private String resolveErrorMessage(LiqPayUnsubscribeResult result) {
        if (result == null) {
            return message("subscription.error.liqpayCancellationFailed");
        }
        String message = firstNonBlank(result.errorDescription(), result.errorCode());
        if (!StringUtils.hasText(message)) {
            String statusValue = firstNonBlank(result.status(), result.result());
            if (StringUtils.hasText(statusValue)) {
                message = "LiqPay returned status " + statusValue;
            }
        }
        if (!StringUtils.hasText(message)) {
            message = message("subscription.error.liqpayCancellationFailed");
        }
        return message;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String message(String code) {
        return messageSource.getMessage(code, null, localizationService.getDefaultLocale());
    }

    private boolean isSuccess(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "success", "ok", "unsubscribed", "unsubscribesuccess", "subscribecanceled", "canceled", "cancelled" -> true;
            default -> false;
        };
    }

    private String extractText(Map<String, Object> response, String key) {
        if (response == null || key == null) {
            return null;
        }
        Object value = response.get(key);
        if (value == null) {
            return null;
        }
        return value.toString();
    }

    private enum LiqPayIdentifierField {
        SUBSCRIBE_ID("subscribe_id"),
        PAYMENT_ID("payment_id");

        private final String fieldName;

        LiqPayIdentifierField(String fieldName) {
            this.fieldName = fieldName;
        }

        public String fieldName() {
            return fieldName;
        }

        public String logValue() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    private record LiqPayUnsubscribeResult(boolean success,
                                           String status,
                                           String result,
                                           String errorDescription,
                                           String errorCode) {
    }
}
