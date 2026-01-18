package com.example.personalFinance.service.subscription;

import com.example.personalFinance.dto.LiqPayCallbackResult;
import com.example.personalFinance.dto.LiqPayPaymentStatus;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class LiqPayCallbackService {

    private static final DateTimeFormatter LIQPAY_DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String ORDER_ID_DELIMITER = "--";
    private static final String PAYMENT_ID_FIELD = "payment_id";
    private static final String LIQPAY_ORDER_ID_FIELD = "liqpay_order_id";
    private static final String[] SUBSCRIPTION_ID_TOKENS = new String[] {
            "subscribe_id",
            "subscription_id",
            "order_sub_id",
            "order_subscribe_id",
            "liqpay_subscription_id",
            "liqpay_subscribe_id",
            "sub_id",
            PAYMENT_ID_FIELD,
            LIQPAY_ORDER_ID_FIELD
    };
    private static final Pattern JSON_LIKE_PATTERN = Pattern.compile("^\\s*[\\{\\[]");

    private final ObjectMapper objectMapper;
    private final SubscriptionPlanService subscriptionPlanService;
    private final SubscriptionService subscriptionService;
    private final UserService userService;
    private final String privateKey;
    private final SubscriptionPaymentFlowLogger paymentFlowLogger;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;
    private final LiqPayPaymentStatusClient paymentStatusClient;

    public LiqPayCallbackService(ObjectMapper objectMapper,
                                 SubscriptionPlanService subscriptionPlanService,
                                 SubscriptionService subscriptionService,
                                 UserService userService,
                                 @Value("${app.subscription.liqpay.private-key:}") String privateKey,
                                 SubscriptionPaymentFlowLogger paymentFlowLogger,
                                 MessageSource messageSource,
                                 LocalizationService localizationService,
                                 LiqPayPaymentStatusClient paymentStatusClient) {
        this.objectMapper = objectMapper;
        this.subscriptionPlanService = subscriptionPlanService;
        this.subscriptionService = subscriptionService;
        this.userService = userService;
        this.privateKey = privateKey;
        this.paymentFlowLogger = paymentFlowLogger;
        this.messageSource = messageSource;
        this.localizationService = localizationService;
        this.paymentStatusClient = paymentStatusClient;
    }

    public LiqPayCallbackResult processCallback(String data, String signature) {
        UUID userIdForLog = null;
        String orderIdForLog = null;
        String planCodeForLog = null;
        String statusForLog = null;
        try {
            if (!StringUtils.hasText(data) || !StringUtils.hasText(signature)) {
                paymentFlowLogger.logStep(null, null, "CALLBACK_REJECTED",
                        "Missing LiqPay data or signature",
                        Map.of(
                                "has_data", String.valueOf(StringUtils.hasText(data)),
                                "has_signature", String.valueOf(StringUtils.hasText(signature))
                        ));
                throw new IllegalArgumentException("Missing LiqPay callback payload");
            }
            if (!StringUtils.hasText(privateKey)) {
                paymentFlowLogger.logError(null, null, "CALLBACK_CONFIGURATION_ERROR",
                        "LiqPay private key is not configured", null);
                throw new IllegalStateException("LiqPay integration is not configured");
            }
            if (!isSignatureValid(data, signature)) {
                paymentFlowLogger.logStep(null, null, "CALLBACK_SIGNATURE_INVALID",
                        "LiqPay callback signature mismatch",
                        Map.of("signature_length", String.valueOf(signature.length())));
                throw new IllegalArgumentException("LiqPay callback signature mismatch");
            }
            paymentFlowLogger.logStep(null, null, "CALLBACK_SIGNATURE_VALID",
                    "LiqPay callback signature verified",
                    Map.of("data_length", String.valueOf(data.length())));

            JsonNode payload = decodePayload(data);
            LiqPayAction action = resolveAction(text(payload, "action"));
            String status = text(payload, "status");
            statusForLog = status;
            Map<String, String> actionContext = new LinkedHashMap<>();
            actionContext.put("action", action.name());
            if (StringUtils.hasText(status)) {
                actionContext.put("status", status);
            }
            paymentFlowLogger.logStep(null, null,
                    LiqPayAction.SUBSCRIBE.equals(action)
                            ? "CALLBACK_SUBSCRIBE_RECEIVED"
                            : "CALLBACK_PAY_RECEIVED",
                    "Received LiqPay callback",
                    actionContext);

            OrderReference reference = extractOrderReference(payload);
            orderIdForLog = reference.orderId();
            userIdForLog = reference.userId();
            planCodeForLog = reference.planCode();
            Map<String, String> orderContext = new LinkedHashMap<>();
            if (StringUtils.hasText(planCodeForLog)) {
                orderContext.put("plan", planCodeForLog);
            }
            orderContext.put("status", String.valueOf(status));
            paymentFlowLogger.logStep(userIdForLog, orderIdForLog, "CALLBACK_ORDER_IDENTIFIED",
                    "Identified order reference from LiqPay callback", orderContext);

            UUID finalUserIdForLog = userIdForLog;
            UserApp user = userService.findById(finalUserIdForLog)
                    .orElseThrow(() -> new IllegalStateException("User not found for LiqPay order " + reference.orderId()));
            SubscriptionPlan plan = subscriptionPlanService.getPlanByCode(reference.planCode());
            if (SubscriptionType.TRIAL.equals(plan.getType())) {
                Map<String, String> trialContext = new LinkedHashMap<>();
                if (StringUtils.hasText(plan.getCode())) {
                    trialContext.put("plan", plan.getCode());
                }
                paymentFlowLogger.logStep(userIdForLog, orderIdForLog, "CALLBACK_TRIAL_PLAN_REJECTED",
                        "Attempt to activate trial plan via LiqPay", trialContext);
                throw new IllegalStateException("Cannot activate trial plan from LiqPay callback");
            }

            Optional<UserSubscription> existingSubscription = subscriptionService.findCurrentSubscription(user);

            boolean alreadyActive = existingSubscription
                    .filter(sub -> SubscriptionStatus.ACTIVE.equals(sub.getStatus()))
                    .filter(sub -> sub.getPlan() != null && plan.getId().equals(sub.getPlan().getId()))
                    .isPresent();

            String customerToken = firstNonBlank(text(payload, "card_token"),
                    text(payload, "token"),
                    text(payload, "cardToken"));
            String providerSubscriptionId = extractProviderSubscriptionId(payload);
            String providerIdSource = "payload";
            if (!StringUtils.hasText(providerSubscriptionId)) {
                providerSubscriptionId = existingSubscription
                        .map(UserSubscription::getPaymentSubscriptionId)
                        .filter(StringUtils::hasText)
                        .orElse(null);
                providerIdSource = "existing";
            }
            if (!StringUtils.hasText(providerSubscriptionId)) {
                Map<String, String> missingContext = new LinkedHashMap<>();
                if (StringUtils.hasText(plan.getCode())) {
                    missingContext.put("plan", plan.getCode());
                }
                missingContext.put("status", String.valueOf(status));
                String payloadKeys = summarizePayloadKeys(payload);
                if (StringUtils.hasText(payloadKeys)) {
                    missingContext.put("payload_keys", payloadKeys);
                }
                String payloadSnapshot = snapshotPayload(payload);
                if (StringUtils.hasText(payloadSnapshot)) {
                    missingContext.put("payload_snapshot", payloadSnapshot);
                }
                paymentFlowLogger.logStep(userIdForLog, orderIdForLog, "SUBSCRIPTION_PROVIDER_ID_MISSING",
                        "LiqPay callback did not contain subscription identifier", missingContext);
                throw new IllegalStateException(message("subscription.error.providerIdMissing"));
            }
            if (LiqPayAction.SUBSCRIBE.equals(action)) {
                return handleSubscribeCallback(user, plan, customerToken, providerSubscriptionId, status,
                        reference, payload, alreadyActive);
            }
            if (LiqPayAction.UNSUBSCRIBE.equals(action)) {
                return handleUnsubscribeCallback(user, plan, providerSubscriptionId, status, reference, payload);
            }

            return handlePayCallback(user, plan, customerToken, providerSubscriptionId, providerIdSource,
                    status, reference, payload, alreadyActive);
        } catch (RuntimeException ex) {
            StringBuilder message = new StringBuilder("Failed to process LiqPay callback");
            if (planCodeForLog != null) {
                message.append(" for plan ").append(planCodeForLog);
            }
            if (statusForLog != null) {
                message.append(" (status=").append(statusForLog).append(')');
            }
            paymentFlowLogger.logError(userIdForLog, orderIdForLog, "CALLBACK_PROCESSING_ERROR",
                    message.toString(), ex);
            throw ex;
        }
    }

    private LiqPayCallbackResult handleSubscribeCallback(UserApp user,
                                                         SubscriptionPlan plan,
                                                         String customerToken,
                                                         String providerSubscriptionId,
                                                         String status,
                                                         OrderReference reference,
                                                         JsonNode payload,
                                                         boolean alreadyActive) {
        if (isUnsubscribeSuccessStatus(status)) {
            Map<String, String> providerCancelContext = new LinkedHashMap<>();
            providerCancelContext.put("plan", plan.getCode());
            providerCancelContext.put("status", String.valueOf(status));
            providerCancelContext.put("provider_subscription_id", providerSubscriptionId);
            paymentFlowLogger.logStep(user.getId(), reference.orderId(),
                    "SUBSCRIPTION_PROVIDER_CANCELLATION_STATUS",
                    "LiqPay subscribe callback reported cancellation status", providerCancelContext);
            return handleUnsubscribeCallback(user, plan, providerSubscriptionId, status, reference, payload);
        }

        if (!isSubscribeSuccessStatus(status)) {
            Map<String, String> rejectContext = new LinkedHashMap<>();
            rejectContext.put("plan", plan.getCode());
            if (StringUtils.hasText(status)) {
                rejectContext.put("status", status);
            }
            paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_SUBSCRIBE_REJECTED",
                    "LiqPay subscribe callback returned a non-success status", rejectContext);
            throw new IllegalStateException(message("subscription.error.paymentFailed"));
        }
        LocalDateTime nextBillingAt = resolvePendingBillingDate(plan, payload);
        subscriptionService.markSubscriptionPendingPayment(user, plan, customerToken, providerSubscriptionId,
                nextBillingAt, reference.orderId(), status);
        Map<String, String> pendingContext = new LinkedHashMap<>();
        pendingContext.put("plan", plan.getCode());
        pendingContext.put("status", String.valueOf(status));
        pendingContext.put("provider_subscription_id", providerSubscriptionId);
        if (nextBillingAt != null) {
            pendingContext.put("next_billing_at", nextBillingAt.toString());
        }
        paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_PAYMENT_PENDING",
                "Marked subscription as pending payment", pendingContext);
        LiqPayCallbackResult pendingResult = LiqPayCallbackResult.builder()
                .orderId(reference.orderId())
                .userId(user.getId())
                .plan(plan)
                .providerStatus(status)
                .activated(false)
                .alreadyActive(false)
                .activationPending(true)
                .paymentFailed(false)
                .build();

        return finalizePendingSubscriptionFromStatus(user, plan, customerToken, providerSubscriptionId,
                reference, payload, alreadyActive)
                .orElse(pendingResult);
    }

    private LiqPayCallbackResult handlePayCallback(UserApp user,
                                                   SubscriptionPlan plan,
                                                   String customerToken,
                                                   String providerSubscriptionId,
                                                   String providerIdSource,
                                                   String status,
                                                   OrderReference reference,
                                                   JsonNode payload,
                                                   boolean alreadyActive) {
        if (!isPaySuccessStatus(status)) {
            String failureReason = resolveFailureReason(payload, status);
            Map<String, String> failureContext = new LinkedHashMap<>();
            failureContext.put("plan", plan.getCode());
            if (StringUtils.hasText(status)) {
                failureContext.put("status", status);
            }
            String errorCode = text(payload, "err_code");
            if (StringUtils.hasText(errorCode)) {
                failureContext.put("err_code", errorCode);
            }
            if (StringUtils.hasText(failureReason)) {
                failureContext.put("failure_reason", failureReason);
            }
            paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_PAYMENT_FAILED",
                    "LiqPay reported payment failure", failureContext);
            subscriptionService.markSubscriptionPaymentFailed(user, plan, providerSubscriptionId, status, failureReason,
                    reference.orderId());
            return LiqPayCallbackResult.builder()
                    .orderId(reference.orderId())
                    .userId(user.getId())
                    .plan(plan)
                    .providerStatus(status)
                    .activated(false)
                    .alreadyActive(false)
                    .activationPending(false)
                    .paymentFailed(true)
                    .build();
        }

        LocalDateTime currentPeriodEndsAt = resolveCurrentPeriodEndsAt(plan, payload);
        LocalDateTime nextBillingAt = resolveNextBillingAt(plan, payload, currentPeriodEndsAt);

        Map<String, String> activationContext = new LinkedHashMap<>();
        activationContext.put("plan", plan.getCode());
        activationContext.put("status", String.valueOf(status));
        activationContext.put("provider_subscription_id", providerSubscriptionId);
        activationContext.put("provider_subscription_id_source", providerIdSource);
        paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_ACTIVATION_ATTEMPT",
                "Activating subscription based on LiqPay callback", activationContext);

        subscriptionService.activateSubscription(user, plan, customerToken, providerSubscriptionId,
                currentPeriodEndsAt, nextBillingAt, reference.orderId());

        Map<String, String> resultContext = new LinkedHashMap<>();
        resultContext.put("plan", plan.getCode());
        resultContext.put("status", String.valueOf(status));
        paymentFlowLogger.logStep(user.getId(), reference.orderId(),
                alreadyActive ? "SUBSCRIPTION_ALREADY_ACTIVE" : "SUBSCRIPTION_ACTIVATED",
                alreadyActive
                        ? "Subscription was already active for plan"
                        : "Subscription activated from LiqPay callback",
                resultContext);

        log.info("Activated subscription via LiqPay callback: orderId={}, userId={}, plan={}, status={}",
                reference.orderId(), user.getId(), plan.getCode(), status);

        return LiqPayCallbackResult.builder()
                .orderId(reference.orderId())
                .userId(user.getId())
                .plan(plan)
                .providerStatus(status)
                .activated(!alreadyActive)
                .alreadyActive(alreadyActive)
                .activationPending(false)
                .paymentFailed(false)
                .build();
    }

    private LiqPayCallbackResult handleUnsubscribeCallback(UserApp user,
                                                           SubscriptionPlan plan,
                                                           String providerSubscriptionId,
                                                           String status,
                                                           OrderReference reference,
                                                           JsonNode payload) {
        if (!isUnsubscribeSuccessStatus(status)) {
            Map<String, String> rejectContext = new LinkedHashMap<>();
            rejectContext.put("plan", plan.getCode());
            if (StringUtils.hasText(status)) {
                rejectContext.put("status", status);
            }
            rejectContext.put("provider_subscription_id", providerSubscriptionId);
            paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_PROVIDER_CANCELLATION_REJECTED",
                    "LiqPay unsubscribe callback returned a non-success status", rejectContext);
            throw new IllegalStateException(message("subscription.error.liqpayCancellationFailed"));
        }

        LocalDateTime cancellationEffectiveAt = resolveCurrentPeriodEndsAt(plan, payload);
        subscriptionService.markSubscriptionCancelledByProvider(user, plan, providerSubscriptionId,
                cancellationEffectiveAt, status);

        Map<String, String> cancellationContext = new LinkedHashMap<>();
        cancellationContext.put("plan", plan.getCode());
        cancellationContext.put("status", String.valueOf(status));
        cancellationContext.put("provider_subscription_id", providerSubscriptionId);
        if (cancellationEffectiveAt != null) {
            cancellationContext.put("cancellation_effective_at", cancellationEffectiveAt.toString());
        }
        paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_CANCELLED_BY_PROVIDER",
                "Marked subscription as cancelled based on LiqPay callback", cancellationContext);

        return LiqPayCallbackResult.builder()
                .orderId(reference.orderId())
                .userId(user.getId())
                .plan(plan)
                .providerStatus(status)
                .activated(false)
                .alreadyActive(false)
                .activationPending(false)
                .paymentFailed(false)
                .build();
    }

    private Optional<LiqPayCallbackResult> finalizePendingSubscriptionFromStatus(UserApp user,
                                                                                SubscriptionPlan plan,
                                                                                String customerToken,
                                                                                String providerSubscriptionId,
                                                                                OrderReference reference,
                                                                                JsonNode payload,
                                                                                boolean alreadyActive) {
        Optional<LiqPayPaymentStatus> statusResponse = paymentStatusClient.fetchStatus(user.getId(),
                reference.orderId(), text(payload, PAYMENT_ID_FIELD));
        if (statusResponse.isEmpty()) {
            return Optional.empty();
        }
        LiqPayPaymentStatus paymentStatus = statusResponse.get();
        String providerStatus = paymentStatus.getStatus();
        if (isPaySuccessStatus(providerStatus)) {
            LocalDateTime currentPeriodEndsAt = resolveCurrentPeriodEndsAt(plan, payload);
            LocalDateTime nextBillingAt = resolveNextBillingAt(plan, payload, currentPeriodEndsAt);
            Map<String, String> activationContext = new LinkedHashMap<>();
            activationContext.put("plan", plan.getCode());
            activationContext.put("status", String.valueOf(providerStatus));
            activationContext.put("provider_subscription_id", providerSubscriptionId);
            activationContext.put("confirmation_source", "status_api");
            paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_ACTIVATION_ATTEMPT",
                    "Confirming subscription activation via status API", activationContext);
            subscriptionService.activateSubscription(user, plan, customerToken, providerSubscriptionId,
                    currentPeriodEndsAt, nextBillingAt, reference.orderId());
            paymentFlowLogger.logStep(user.getId(), reference.orderId(),
                    alreadyActive ? "SUBSCRIPTION_ALREADY_ACTIVE" : "SUBSCRIPTION_ACTIVATED",
                    alreadyActive
                            ? "Subscription was already active for plan"
                            : "Subscription activated after confirming payment via status API",
                    Map.of("plan", plan.getCode()));
            return Optional.of(LiqPayCallbackResult.builder()
                    .orderId(reference.orderId())
                    .userId(user.getId())
                    .plan(plan)
                    .providerStatus(providerStatus)
                    .activated(!alreadyActive)
                    .alreadyActive(alreadyActive)
                    .activationPending(false)
                    .paymentFailed(false)
                    .build());
        }
        if (isPayFailureStatus(providerStatus)) {
            Map<String, String> failureContext = new LinkedHashMap<>(paymentStatus.toLogContext());
            failureContext.put("plan", plan.getCode());
            paymentFlowLogger.logStep(user.getId(), reference.orderId(), "SUBSCRIPTION_PAYMENT_FAILED",
                    "LiqPay status API reported failed payment", failureContext);
            subscriptionService.markSubscriptionPaymentFailed(user, plan, providerSubscriptionId, providerStatus,
                    paymentStatus.failureReason(), reference.orderId());
            return Optional.of(LiqPayCallbackResult.builder()
                    .orderId(reference.orderId())
                    .userId(user.getId())
                    .plan(plan)
                    .providerStatus(providerStatus)
                    .activated(false)
                    .alreadyActive(false)
                    .activationPending(false)
                    .paymentFailed(true)
                    .build());
        }
        return Optional.empty();
    }

    private String message(String code) {
        return messageSource.getMessage(code, null, localizationService.getDefaultLocale());
    }

    private boolean isSignatureValid(String data, String signature) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            String payload = privateKey + data + privateKey;
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            String expected = Base64.getEncoder().encodeToString(hash);
            return expected.equals(signature);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-1 algorithm is unavailable", ex);
        }
    }

    private JsonNode decodePayload(String data) {
        try {
            byte[] decoded = Base64.getDecoder().decode(data);
            return objectMapper.readTree(decoded);
        } catch (IllegalArgumentException | IOException ex) {
            throw new IllegalArgumentException("Unable to decode LiqPay payload", ex);
        }
    }

    private LiqPayAction resolveAction(String actionValue) {
        if (!StringUtils.hasText(actionValue)) {
            paymentFlowLogger.logStep(null, null, "CALLBACK_ACTION_MISSING",
                    "LiqPay callback did not include action", Map.of());
            throw new IllegalArgumentException("LiqPay callback action is missing");
        }
        return switch (actionValue.toLowerCase(Locale.ROOT)) {
            case "subscribe" -> LiqPayAction.SUBSCRIBE;
            case "pay" -> LiqPayAction.PAY;
            case "unsubscribe" -> LiqPayAction.UNSUBSCRIBE;
            default -> {
                paymentFlowLogger.logStep(null, null, "CALLBACK_UNSUPPORTED_ACTION",
                        "Unsupported LiqPay action",
                        Map.of("action", actionValue));
                throw new IllegalStateException("Unsupported LiqPay action: " + actionValue);
            }
        };
    }

    private boolean isPaySuccessStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "success", "sandbox", "payok", "subscribed" -> true;
            default -> false;
        };
    }

    private boolean isPayFailureStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "failure", "fail", "error", "reversed", "refund", "refunded", "chargeback",
                    "canceled", "cancelled", "expired", "unsubscribed" -> true;
            default -> false;
        };
    }

    private boolean isSubscribeSuccessStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "success", "sandbox", "subscribed" -> true;
            default -> false;
        };
    }

    private boolean isUnsubscribeSuccessStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return false;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "success", "sandbox", "ok", "unsubscribed", "unsubscribesuccess", "subscribecanceled",
                    "canceled", "cancelled" -> true;
            default -> false;
        };
    }

    private OrderReference extractOrderReference(JsonNode payload) {
        String orderIdRaw = text(payload, "order_id");
        if (!StringUtils.hasText(orderIdRaw)) {
            throw new IllegalArgumentException("LiqPay callback is missing order_id");
        }
        String orderId = orderIdRaw.trim();
        if (orderId.contains(ORDER_ID_DELIMITER)) {
            String[] parts = orderId.split(ORDER_ID_DELIMITER);
            if (parts.length >= 3) {
                UUID userId = parseUuid(parts[0]);
                String planCode = parts[1];
                return new OrderReference(orderId, userId, planCode);
            }
        }
        String planCode = firstNonBlank(text(payload, "info"), text(payload, "product_id"));
        if (!StringUtils.hasText(planCode)) {
            throw new IllegalArgumentException("Unable to determine plan from LiqPay callback");
        }
        Optional<UUID> userIdOptional = parseLegacyOrderUserId(orderId);
        if (userIdOptional.isEmpty()) {
            throw new IllegalArgumentException("Unable to determine user from order " + orderId);
        }
        return new OrderReference(orderId, userIdOptional.get(), planCode);
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid UUID in LiqPay callback: " + value, ex);
        }
    }

    private Optional<UUID> parseLegacyOrderUserId(String orderId) {
        int separatorIndex = orderId.lastIndexOf('-');
        if (separatorIndex <= 0) {
            return Optional.empty();
        }
        String candidate = orderId.substring(0, separatorIndex);
        try {
            return Optional.of(UUID.fromString(candidate));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private LocalDateTime resolveCurrentPeriodEndsAt(SubscriptionPlan plan, JsonNode payload) {
        LocalDateTime resolved = parseDate(payload, "subscribe_date_end", "next_pay_time", "end_time", "date_end");
        if (resolved != null && resolved.isAfter(LocalDateTime.now())) {
            return resolved;
        }
        LocalDateTime now = LocalDateTime.now();
        if (plan.getBillingPeriod() == null) {
            return now.plusMonths(1);
        }
        return switch (plan.getBillingPeriod()) {
            case MONTHLY -> now.plusMonths(1);
            case YEARLY -> now.plusYears(1);
            default -> now.plusMonths(1);
        };
    }

    private LocalDateTime resolvePendingBillingDate(SubscriptionPlan plan, JsonNode payload) {
        LocalDateTime resolved = parseDate(payload, "subscribe_date_start", "next_pay_time", "next_payment_date");
        if (resolved != null && resolved.isAfter(LocalDateTime.now().minusMinutes(5))) {
            return resolved;
        }
        LocalDateTime now = LocalDateTime.now();
        return switch (plan.getBillingPeriod()) {
            case MONTHLY -> now.plusMonths(1);
            case YEARLY -> now.plusYears(1);
            default -> now.plusMonths(1);
        };
    }

    private String resolveFailureReason(JsonNode payload, String status) {
        return firstNonBlank(
                text(payload, "err_description"),
                text(payload, "failure_reason"),
                text(payload, "errormsg"),
                text(payload, "description"),
                status
        );
    }

    private enum LiqPayAction {
        SUBSCRIBE,
        PAY,
        UNSUBSCRIBE
    }

    private LocalDateTime resolveNextBillingAt(SubscriptionPlan plan, JsonNode payload, LocalDateTime currentPeriodEndsAt) {
        LocalDateTime resolved = parseDate(payload, "next_pay_time", "next_payment_date", "next_bill_date");
        if (resolved != null && resolved.isAfter(LocalDateTime.now())) {
            return resolved;
        }
        return currentPeriodEndsAt;
    }

    private LocalDateTime parseDate(JsonNode payload, String... fieldNames) {
        for (String field : fieldNames) {
            JsonNode node = payload.get(field);
            if (node == null || node.isNull()) {
                continue;
            }
            if (node.isNumber()) {
                long value = node.asLong();
                if (String.valueOf(value).length() > 10) {
                    return Instant.ofEpochMilli(value).atZone(ZoneId.systemDefault()).toLocalDateTime();
                }
                return Instant.ofEpochSecond(value).atZone(ZoneId.systemDefault()).toLocalDateTime();
            }
            String text = node.asText();
            if (!StringUtils.hasText(text)) {
                continue;
            }
            try {
                return LocalDateTime.parse(text, LIQPAY_DATETIME_FORMAT);
            } catch (DateTimeParseException ex) {
                try {
                    long epoch = Long.parseLong(text);
                    if (text.length() > 10) {
                        return Instant.ofEpochMilli(epoch).atZone(ZoneId.systemDefault()).toLocalDateTime();
                    }
                    return Instant.ofEpochSecond(epoch).atZone(ZoneId.systemDefault()).toLocalDateTime();
                } catch (NumberFormatException ignored) {
                    log.debug("Unable to parse LiqPay date field {} with value {}", field, text);
                }
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String extractProviderSubscriptionId(JsonNode payload) {
        if (payload == null || payload.isNull()) {
            return null;
        }
        String paymentId = text(payload, PAYMENT_ID_FIELD);
        if (StringUtils.hasText(paymentId)) {
            return paymentId;
        }

        String liqpayOrderId = text(payload, LIQPAY_ORDER_ID_FIELD);
        if (StringUtils.hasText(liqpayOrderId)) {
            return liqpayOrderId;
        }

        String direct = firstNonBlank(
                text(payload, "subscribe_id"),
                text(payload, "subscription_id"),
                text(payload, "order_sub_id"),
                text(payload, "order_subscribe_id"),
                text(payload, "liqpay_subscription_id"),
                text(payload, "liqpay_subscribe_id"),
                text(payload, "subscribeId"),
                text(payload, "subscriptionId"),
                text(payload, "subId"),
                text(payload, "sub_id"),
                text(payload, PAYMENT_ID_FIELD),
                text(payload, LIQPAY_ORDER_ID_FIELD),
                textCaseInsensitive(payload, "subscribe_id"),
                textCaseInsensitive(payload, "subscription_id"),
                textCaseInsensitive(payload, "subscribeId"),
                textCaseInsensitive(payload, "subscriptionId"),
                textCaseInsensitive(payload, "subId"),
                textCaseInsensitive(payload, "sub_id"),
                textCaseInsensitive(payload, PAYMENT_ID_FIELD),
                textCaseInsensitive(payload, LIQPAY_ORDER_ID_FIELD));
        if (StringUtils.hasText(direct)) {
            return direct;
        }
        String nested = firstNonBlank(
                text(payload.path("subscribe"), "id"),
                text(payload.path("subscribe"), "subscribe_id"),
                text(payload.path("subscribe"), "subscription_id"),
                text(payload.path("subscription"), "id"),
                text(payload.path("subscription"), "subscribe_id"),
                text(payload.path("subscription"), "subscription_id"),
                text(payload.path("data"), "subscribe_id"),
                text(payload.path("data"), "subscription_id"),
                text(payload.path("data"), "sub_id"),
                text(payload.path("payment"), "subscribe_id"),
                text(payload.path("payment"), "subscription_id"),
                text(payload.path("response"), "subscribe_id"),
                text(payload.path("response"), "subscription_id"));
        if (StringUtils.hasText(nested)) {
            return nested;
        }
        String embedded = searchSubscriptionId(payload, null);
        if (StringUtils.hasText(embedded)) {
            return embedded;
        }
        return extractSubscriptionIdFromEmbeddedStrings(payload);
    }

    private String textCaseInsensitive(JsonNode payload, String field) {
        if (payload == null || !StringUtils.hasText(field) || !payload.isObject()) {
            return null;
        }
        for (Iterator<Map.Entry<String, JsonNode>> iterator = payload.fields(); iterator.hasNext(); ) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            if (field.equalsIgnoreCase(entry.getKey())) {
                return asTrimmedText(entry.getValue());
            }
        }
        return null;
    }

    private String searchSubscriptionId(JsonNode node, String context) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isValueNode()) {
            if (node.isTextual()) {
                String fromText = extractSubscriptionIdFromText(node.asText());
                if (StringUtils.hasText(fromText)) {
                    return fromText;
                }
                JsonNode parsed = parseEmbeddedJson(node.asText());
                if (parsed != null) {
                    String nested = searchSubscriptionId(parsed, context);
                    if (StringUtils.hasText(nested)) {
                        return nested;
                    }
                }
            }
            return null;
        }
        if (node.isArray()) {
            for (JsonNode element : node) {
                String nested = searchSubscriptionId(element, context);
                if (StringUtils.hasText(nested)) {
                    return nested;
                }
            }
            return null;
        }
        if (!node.isObject()) {
            return null;
        }
        for (Iterator<Map.Entry<String, JsonNode>> iterator = node.fields(); iterator.hasNext(); ) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            String key = entry.getKey();
            JsonNode value = entry.getValue();
            String nestedContext = StringUtils.hasText(context) ? context + "." + key : key;
            String candidate = candidateSubscriptionId(context, key, value);
            if (StringUtils.hasText(candidate)) {
                return candidate;
            }
            String nested = searchSubscriptionId(value, nestedContext);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        return null;
    }

    private String candidateSubscriptionId(String context, String fieldName, JsonNode value) {
        if (value == null || value.isNull() || !value.isValueNode()) {
            return null;
        }
        String normalizedField = normalizeName(fieldName);
        String normalizedContext = normalizeName(context);
        boolean fieldIndicatesSubscription = indicatesSubscription(fieldName);
        boolean contextIndicatesSubscription = indicatesSubscription(context);
        boolean fieldLooksLikeId = indicatesId(fieldName) || normalizedField.endsWith("id");
        String trimmed = asTrimmedText(value);
        if ((fieldIndicatesSubscription && fieldLooksLikeId)
                || (contextIndicatesSubscription && fieldLooksLikeId)
                || (normalizedContext.contains("subscribe") && normalizedField.contains("id"))) {
            return trimmed;
        }
        if (StringUtils.hasText(trimmed) && value.isTextual()) {
            String extracted = extractSubscriptionIdFromText(trimmed);
            if (StringUtils.hasText(extracted)) {
                return extracted;
            }
            JsonNode parsed = parseEmbeddedJson(trimmed);
            if (parsed != null) {
                String nested = searchSubscriptionId(parsed, nestedContext(context, fieldName));
                if (StringUtils.hasText(nested)) {
                    return nested;
                }
            }
        }
        return null;
    }

    private String nestedContext(String context, String fieldName) {
        if (!StringUtils.hasText(context)) {
            return fieldName;
        }
        if (!StringUtils.hasText(fieldName)) {
            return context;
        }
        return context + "." + fieldName;
    }

    private String asTrimmedText(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isValueNode()) {
            return null;
        }
        String text = value.asText();
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private String text(JsonNode payload, String field) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String extractSubscriptionIdFromEmbeddedStrings(JsonNode payload) {
        if (payload == null || payload.isNull()) {
            return null;
        }
        if (payload.isValueNode() && payload.isTextual()) {
            return extractSubscriptionIdFromText(payload.asText());
        }
        if (payload.isArray()) {
            for (JsonNode element : payload) {
                String nested = extractSubscriptionIdFromEmbeddedStrings(element);
                if (StringUtils.hasText(nested)) {
                    return nested;
                }
            }
            return null;
        }
        if (!payload.isObject()) {
            return null;
        }
        for (Iterator<Map.Entry<String, JsonNode>> iterator = payload.fields(); iterator.hasNext(); ) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            String extracted = extractSubscriptionIdFromEmbeddedStrings(entry.getValue());
            if (StringUtils.hasText(extracted)) {
                return extracted;
            }
        }
        return null;
    }

    private String extractSubscriptionIdFromText(String text) {
        if (!StringUtils.hasText(text)) {
            return null;
        }
        String candidate = tryParseSubscriptionIdFromSimpleText(text);
        if (StringUtils.hasText(candidate)) {
            return candidate;
        }
        JsonNode parsed = parseEmbeddedJson(text);
        if (parsed != null) {
            return searchSubscriptionId(parsed, null);
        }
        return null;
    }

    private String tryParseSubscriptionIdFromSimpleText(String text) {
        String value = text.trim();
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        for (String token : SUBSCRIPTION_ID_TOKENS) {
            int idx = lower.indexOf(token);
            if (idx < 0) {
                continue;
            }
            int start = idx + token.length();
            while (start < value.length()) {
                char ch = value.charAt(start);
                if (Character.isWhitespace(ch) || ch == ':' || ch == '=' || ch == '"' || ch == '\'' ) {
                    start++;
                    continue;
                }
                break;
            }
            if (start < value.length()) {
                char firstValueChar = value.charAt(start);
                if (firstValueChar == '{' || firstValueChar == '[') {
                    return null;
                }
            }
            int end = start;
            while (end < value.length()) {
                char ch = value.charAt(end);
                if (Character.isWhitespace(ch) || ch == '"' || ch == '\'' || ch == ',' || ch == ';' || ch == '}'
                        || ch == ']' || ch == ')') {
                    break;
                }
                end++;
            }
            if (end > start) {
                return value.substring(start, end).trim();
            }
        }
        return null;
    }

    private JsonNode parseEmbeddedJson(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        if (!JSON_LIKE_PATTERN.matcher(value).find()) {
            return null;
        }
        try {
            return objectMapper.readTree(value);
        } catch (IOException ex) {
            log.debug("Unable to parse embedded JSON while searching for subscription id", ex);
            return null;
        }
    }

    private String summarizePayloadKeys(JsonNode payload) {
        if (payload == null || payload.isNull() || !payload.isObject()) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        Iterator<String> fieldNames = payload.fieldNames();
        int count = 0;
        while (fieldNames.hasNext() && count < 10) {
            if (count > 0) {
                builder.append(',');
            }
            builder.append(fieldNames.next());
            count++;
        }
        if (payload.size() > count) {
            builder.append(",...");
        }
        return builder.toString();
    }

    private String snapshotPayload(JsonNode payload) {
        if (payload == null || payload.isNull()) {
            return null;
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            if (json.length() > 700) {
                return json.substring(0, 700) + "...";
            }
            return json;
        } catch (Exception ex) {
            log.debug("Unable to snapshot LiqPay payload", ex);
            return null;
        }
    }

    private boolean indicatesSubscription(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        String collapsed = normalizeName(value);
        return lower.contains("subscribe")
                || lower.contains("subscription")
                || lower.contains("subscr")
                || collapsed.startsWith("sub")
                || collapsed.contains("subscribe");
    }

    private boolean indicatesId(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        String collapsed = normalizeName(value);
        return lower.contains("id") || collapsed.endsWith("id") || collapsed.contains("id");
    }

    private String normalizeName(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private record OrderReference(String orderId, UUID userId, String planCode) {
    }
}
