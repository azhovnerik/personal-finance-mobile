package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.personalFinance.dto.LiqPayCallbackResult;
import com.example.personalFinance.dto.LiqPayPaymentStatus;
import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;

@ExtendWith(MockitoExtension.class)
class LiqPayCallbackServiceTest {

    private static final String PRIVATE_KEY = "test_private";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final String PLAN_CODE = "STANDARD_YEARLY";

    @Mock
    private SubscriptionPlanService subscriptionPlanService;

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private UserService userService;

    @Mock
    private SubscriptionPaymentFlowLogger paymentFlowLogger;

    @Mock
    private MessageSource messageSource;

    @Mock
    private LocalizationService localizationService;

    @Mock
    private LiqPayPaymentStatusClient paymentStatusClient;

    private LiqPayCallbackService liqPayCallbackService;

    private UserApp user;
    private SubscriptionPlan plan;

    @BeforeEach
    void setUp() {
        liqPayCallbackService = new LiqPayCallbackService(
                new ObjectMapper(),
                subscriptionPlanService,
                subscriptionService,
                userService,
                PRIVATE_KEY,
                paymentFlowLogger,
                messageSource,
                localizationService,
                paymentStatusClient);
        user = UserApp.builder()
                .id(USER_ID)
                .email("user@example.com")
                .build();
        plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code(PLAN_CODE)
                .billingPeriod(SubscriptionBillingPeriod.YEARLY)
                .price(BigDecimal.TEN)
                .currency("USD")
                .trialAvailable(false)
                .type(SubscriptionType.STANDART_YEARLY)
                .build();
        lenient().when(userService.findById(USER_ID)).thenReturn(Optional.of(user));
        lenient().when(subscriptionPlanService.getPlanByCode(PLAN_CODE)).thenReturn(plan);
        lenient().when(subscriptionService.findCurrentSubscription(user)).thenReturn(Optional.empty());
        lenient().when(messageSource.getMessage(anyString(), any(), any(Locale.class))).thenReturn("message");
        lenient().when(localizationService.getDefaultLocale()).thenReturn(Locale.ENGLISH);
        lenient().when(paymentStatusClient.fetchStatus(any(), anyString(), anyString())).thenReturn(Optional.empty());
    }

    @Test
    void processCallbackShouldMarkPendingPaymentOnSubscribeAction() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"subscribe\"," +
                "\"status\":\"subscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"card_token\":\"token_1\"," +
                "\"payment_id\":\"sub_1\"," +
                "\"subscribe_date_start\":\"2099-01-01 10:00:00\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isActivationPending()).isTrue();
        assertThat(result.isPaymentFailed()).isFalse();
        ArgumentCaptor<LocalDateTime> billingCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(subscriptionService).markSubscriptionPendingPayment(eq(user), eq(plan), eq("token_1"),
                eq("sub_1"), billingCaptor.capture(), eq(orderId), eq("subscribed"));
        assertThat(billingCaptor.getValue()).isEqualTo(LocalDateTime.parse("2099-01-01T10:00:00"));
        verify(subscriptionService, never()).activateSubscription(any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    void processCallbackShouldActivateWhenStatusApiReportsSuccess() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"subscribe\"," +
                "\"status\":\"subscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"card_token\":\"token_1\"," +
                "\"payment_id\":\"pay_42\"," +
                "\"subscribe_date_start\":\"2099-01-01 10:00:00\"," +
                "\"subscribe_date_end\":\"2100-01-01 10:00:00\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);
        when(paymentStatusClient.fetchStatus(eq(USER_ID), eq(orderId), eq("pay_42")))
                .thenReturn(Optional.of(LiqPayPaymentStatus.builder()
                        .status("success")
                        .paymentId("pay_42")
                        .build()));

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isActivated()).isTrue();
        assertThat(result.isActivationPending()).isFalse();
        ArgumentCaptor<LocalDateTime> currentPeriodCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(subscriptionService).activateSubscription(eq(user), eq(plan), eq("token_1"), eq("pay_42"),
                currentPeriodCaptor.capture(), any(), eq(orderId));
        assertThat(currentPeriodCaptor.getValue()).isEqualTo(LocalDateTime.parse("2100-01-01T10:00:00"));
        verify(subscriptionService).markSubscriptionPendingPayment(eq(user), eq(plan), eq("token_1"), eq("pay_42"),
                any(), eq(orderId), eq("subscribed"));
    }

    @Test
    void processCallbackShouldActivateWhenStatusApiReportsSubscribedStatus() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"subscribe\"," +
                "\"status\":\"subscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"card_token\":\"token_1\"," +
                "\"payment_id\":\"pay_77\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);
        when(paymentStatusClient.fetchStatus(eq(USER_ID), eq(orderId), eq("pay_77")))
                .thenReturn(Optional.of(LiqPayPaymentStatus.builder()
                        .status("subscribed")
                        .paymentId("pay_77")
                        .build()));

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isActivated()).isTrue();
        assertThat(result.isActivationPending()).isFalse();
        verify(subscriptionService).activateSubscription(eq(user), eq(plan), eq("token_1"), eq("pay_77"),
                any(), any(), eq(orderId));
    }

    @Test
    void processCallbackShouldMarkPaymentFailedWhenStatusApiReportsFailure() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"subscribe\"," +
                "\"status\":\"subscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"card_token\":\"token_2\"," +
                "\"payment_id\":\"pay_fail\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);
        when(paymentStatusClient.fetchStatus(eq(USER_ID), eq(orderId), eq("pay_fail")))
                .thenReturn(Optional.of(LiqPayPaymentStatus.builder()
                        .status("failure")
                        .paymentId("pay_fail")
                        .errorDescription("Insufficient funds")
                        .build()));

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isPaymentFailed()).isTrue();
        assertThat(result.isActivationPending()).isFalse();
        verify(subscriptionService).markSubscriptionPaymentFailed(eq(user), eq(plan), eq("pay_fail"), eq("failure"),
                eq("Insufficient funds"), eq(orderId));
        verify(subscriptionService, never()).activateSubscription(any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    void processCallbackShouldMarkPaymentFailedOnPayFailure() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"pay\"," +
                "\"status\":\"failure\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"card_token\":\"token_1\"," +
                "\"payment_id\":\"pay_1\"," +
                "\"err_code\":\"insufficient\"," +
                "\"err_description\":\"Insufficient funds\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isPaymentFailed()).isTrue();
        verify(subscriptionService).markSubscriptionPaymentFailed(eq(user), eq(plan), eq("pay_1"),
                eq("failure"), eq("Insufficient funds"), eq(orderId));
        verify(subscriptionService, never()).activateSubscription(any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    void processCallbackShouldMarkCancelledOnUnsubscribeAction() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"unsubscribe\"," +
                "\"status\":\"unsubscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"payment_id\":\"pay_cancel\"," +
                "\"subscribe_date_end\":\"2101-05-01 12:00:00\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isActivated()).isFalse();
        assertThat(result.isPaymentFailed()).isFalse();
        verify(subscriptionService).markSubscriptionCancelledByProvider(eq(user), eq(plan), eq("pay_cancel"),
                eq(LocalDateTime.parse("2101-05-01T12:00:00")), eq("unsubscribed"));
        verify(subscriptionService, never()).markSubscriptionPaymentFailed(any(), any(), any(), any(), any(), any());
    }

    @Test
    void processCallbackShouldTreatSubscribeWithUnsubscribedStatusAsCancellation() {
        String orderId = USER_ID + "--" + PLAN_CODE + "--" + UUID.randomUUID();
        String jsonPayload = "{" +
                "\"action\":\"subscribe\"," +
                "\"status\":\"unsubscribed\"," +
                "\"order_id\":\"" + orderId + "\"," +
                "\"info\":\"" + PLAN_CODE + "\"," +
                "\"payment_id\":\"sub_cancel\"," +
                "\"subscribe_date_end\":\"2102-03-01 08:00:00\"" +
                "}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);

        LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);

        assertThat(result.isActivated()).isFalse();
        assertThat(result.isPaymentFailed()).isFalse();
        verify(subscriptionService).markSubscriptionCancelledByProvider(eq(user), eq(plan), eq("sub_cancel"),
                eq(LocalDateTime.parse("2102-03-01T08:00:00")), eq("unsubscribed"));
        verify(subscriptionService, never()).markSubscriptionPendingPayment(any(), any(), any(), any(), any(), anyString(), anyString());
        verify(subscriptionService, never()).activateSubscription(any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    void processCallbackShouldRejectUnknownAction() {
        String jsonPayload = "{\"action\":\"unknown\"}";
        String data = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        String signature = signatureFor(data);

        assertThatThrownBy(() -> liqPayCallbackService.processCallback(data, signature))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(subscriptionPlanService, subscriptionService, userService);
    }

    private String signatureFor(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest((PRIVATE_KEY + data + PRIVATE_KEY).getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-1 algorithm unavailable in test", ex);
        }
    }
}
