package com.example.personalFinance.service.subscription;

import com.example.personalFinance.dto.LiqPayPaymentStatus;
import com.liqpay.LiqPay;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class LiqPayPaymentStatusClient {

    private final String publicKey;
    private final String privateKey;
    private final SubscriptionPaymentFlowLogger paymentFlowLogger;

    public LiqPayPaymentStatusClient(@Value("${app.subscription.liqpay.public-key:}") String publicKey,
                                     @Value("${app.subscription.liqpay.private-key:}") String privateKey,
                                     SubscriptionPaymentFlowLogger paymentFlowLogger) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.paymentFlowLogger = paymentFlowLogger;
    }

    public Optional<LiqPayPaymentStatus> fetchStatus(UUID userId, String orderId, String paymentId) {
        if (!StringUtils.hasText(publicKey) || !StringUtils.hasText(privateKey)) {
            return Optional.empty();
        }
        if (!StringUtils.hasText(orderId)) {
            return Optional.empty();
        }
        Map<String, String> request = new LinkedHashMap<>();
        request.put("action", "status");
        request.put("version", "3");
        request.put("order_id", orderId);
        if (StringUtils.hasText(paymentId)) {
            request.put("payment_id", paymentId);
        }
        Map<String, String> logContext = new LinkedHashMap<>();
        if (StringUtils.hasText(paymentId)) {
            logContext.put("payment_id", paymentId);
        }
        try {
            paymentFlowLogger.logStep(userId, orderId, "PAYMENT_STATUS_REQUESTED",
                    "Requesting LiqPay payment status", logContext);
            LiqPay client = new LiqPay(publicKey, privateKey);
            Map<String, Object> response = client.api("request", request);
            LiqPayPaymentStatus status = LiqPayPaymentStatus.fromResponse(response);
            paymentFlowLogger.logStep(userId, orderId, "PAYMENT_STATUS_RECEIVED",
                    "Received LiqPay payment status", status.toLogContext());
            return Optional.of(status);
        } catch (Exception ex) {
            paymentFlowLogger.logError(userId, orderId, "PAYMENT_STATUS_FAILED",
                    "Failed to fetch LiqPay payment status", ex);
            log.warn("Unable to fetch LiqPay payment status for order {}: {}", orderId, ex.getMessage());
            return Optional.empty();
        }
    }
}
