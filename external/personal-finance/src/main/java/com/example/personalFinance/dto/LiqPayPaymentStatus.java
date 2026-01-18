package com.example.personalFinance.dto;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import lombok.Builder;
import lombok.Value;
import org.springframework.util.StringUtils;

@Value
@Builder
public class LiqPayPaymentStatus {

    String status;
    String orderId;
    String paymentId;
    String errorCode;
    String errorDescription;
    String amount;
    String currency;

    public Map<String, String> toLogContext() {
        Map<String, String> context = new LinkedHashMap<>();
        if (StringUtils.hasText(status)) {
            context.put("status", status);
        }
        if (StringUtils.hasText(paymentId)) {
            context.put("payment_id", paymentId);
        }
        if (StringUtils.hasText(errorCode)) {
            context.put("err_code", errorCode);
        }
        if (StringUtils.hasText(errorDescription)) {
            context.put("err_description", errorDescription);
        }
        if (StringUtils.hasText(amount)) {
            context.put("amount", amount);
        }
        if (StringUtils.hasText(currency)) {
            context.put("currency", currency);
        }
        return context;
    }

    public String failureReason() {
        if (StringUtils.hasText(errorDescription)) {
            return errorDescription;
        }
        if (StringUtils.hasText(errorCode)) {
            return errorCode;
        }
        return status;
    }

    public static LiqPayPaymentStatus fromResponse(Map<String, Object> response) {
        if (response == null || response.isEmpty()) {
            return LiqPayPaymentStatus.builder().build();
        }
        return LiqPayPaymentStatus.builder()
                .status(asString(response.get("status")))
                .orderId(asString(response.get("order_id")))
                .paymentId(asString(response.get("payment_id")))
                .errorCode(asString(response.get("err_code")))
                .errorDescription(asString(response.get("err_description")))
                .amount(asString(response.get("amount")))
                .currency(asString(response.get("currency")))
                .build();
    }

    private static String asString(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String stringValue) {
            return StringUtils.hasText(stringValue) ? stringValue.trim() : null;
        }
        return StringUtils.hasText(Objects.toString(value, null))
                ? Objects.toString(value, null).trim()
                : null;
    }
}
