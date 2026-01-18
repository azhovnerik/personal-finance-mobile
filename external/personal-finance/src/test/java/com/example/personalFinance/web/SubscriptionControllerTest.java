package com.example.personalFinance.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.LiqPayCallbackService;
import com.example.personalFinance.service.subscription.LiqPayCheckoutService;
import com.example.personalFinance.service.subscription.SubscriptionPaymentFlowLogger;
import com.example.personalFinance.service.subscription.SubscriptionPlanFormatter;
import com.example.personalFinance.service.subscription.SubscriptionPlanService;
import com.example.personalFinance.service.subscription.SubscriptionService;
import com.example.personalFinance.dto.SubscriptionView;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.MessageSource;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.ui.Model;
import org.springframework.context.i18n.LocaleContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubscriptionControllerTest {

    @Mock
    private SubscriptionService subscriptionService;
    @Mock
    private SubscriptionPlanService subscriptionPlanService;
    @Mock
    private LiqPayCheckoutService liqPayCheckoutService;
    @Mock
    private LiqPayCallbackService liqPayCallbackService;
    @Mock
    private SecurityService securityService;
    @Mock
    private UserService userService;
    @Mock
    private SubscriptionPaymentFlowLogger paymentFlowLogger;
    @Mock
    private SubscriptionPlanFormatter subscriptionPlanFormatter;
    @Mock
    private MessageSource messageSource;
    @Mock
    private LocalizationService localizationService;

    @InjectMocks
    private SubscriptionController subscriptionController;

    private UserApp user;
    private SubscriptionPlan plan;

    @BeforeEach
    void setUp() {
        user = new UserApp();
        user.setId(UUID.randomUUID());
        user.setInterfaceLanguage("en");

        plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("STANDART_MONTHLY")
                .type(SubscriptionType.STANDART_MONTHLY)
                .billingPeriod(SubscriptionBillingPeriod.MONTHLY)
                .price(BigDecimal.TEN)
                .currency("USD")
                .trialAvailable(false)
                .active(true)
                .build();

        when(securityService.getCurrentUser()).thenReturn("user@example.com");
        when(userService.findByName("user@example.com")).thenReturn(Optional.of(user));
        when(localizationService.resolveLocale("en")).thenReturn(Locale.ENGLISH);
        when(subscriptionPlanService.getActivePaidPlansForUser(user)).thenReturn(List.of(plan));
        when(subscriptionPlanFormatter.formatPlanDisplayName(plan)).thenReturn("STANDART MONTHLY");
        when(subscriptionService.hasActiveAccess(user)).thenReturn(false);
        lenient().when(messageSource.getMessage(eq("subscription.info.activationPending"), any(), eq(Locale.ENGLISH)))
                .thenReturn("Activation pending");
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void viewSubscriptions_doesNotShowActivationPendingMessageWhenSubscriptionCancelled() {
        UserSubscription cancelledSubscription = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.CANCELLED)
                .build();
        when(subscriptionService.findCurrentSubscription(user)).thenReturn(Optional.of(cancelledSubscription));

        Model model = new ExtendedModelMap();
        subscriptionController.viewSubscriptions(model, null, null, null, "STANDART_MONTHLY");

        assertThat(model.containsAttribute("infoMessage")).isFalse();
    }

    @Test
    void viewSubscriptions_showsActivationPendingMessageWhenSubscriptionPastDue() {
        UserSubscription pendingSubscription = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.PAST_DUE)
                .build();
        when(subscriptionService.findCurrentSubscription(user)).thenReturn(Optional.of(pendingSubscription));

        Model model = new ExtendedModelMap();
        subscriptionController.viewSubscriptions(model, null, null, null, "STANDART_MONTHLY");

        assertThat(model.getAttribute("infoMessage")).isEqualTo("Activation pending");
        assertThat(model.getAttribute("activationPendingPlan")).isEqualTo("STANDART_MONTHLY");
    }

    @Test
    void viewSubscriptions_localizesCurrencyLabelFromLocaleContext() {
        Locale ukrainian = Locale.forLanguageTag("ua");
        user.setInterfaceLanguage("ua");
        LocaleContextHolder.setLocale(ukrainian);

        SubscriptionPlan uaPlan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("STANDART_MONTHLY_UA")
                .type(SubscriptionType.STANDART_MONTHLY_UA)
                .billingPeriod(SubscriptionBillingPeriod.MONTHLY)
                .price(BigDecimal.valueOf(420))
                .currency("UAH")
                .trialAvailable(false)
                .active(true)
                .build();

        when(localizationService.resolveLocale("ua")).thenReturn(ukrainian);
        when(subscriptionPlanService.getActivePaidPlansForUser(user)).thenReturn(List.of(uaPlan));
        when(subscriptionPlanFormatter.formatPlanDisplayName(uaPlan)).thenReturn("STANDART MONTHLY UA");
        when(subscriptionPlanFormatter.formatPlanName(uaPlan)).thenReturn("STANDART MONTHLY UA");
        when(subscriptionPlanFormatter.formatCurrencyLabel("UAH", ukrainian)).thenReturn("ГРН");

        Model model = new ExtendedModelMap();
        subscriptionController.viewSubscriptions(model, null, null, null, "STANDART_MONTHLY_UA");

        SubscriptionView view = (SubscriptionView) model.getAttribute("subscription");
        assertThat(view.getPlans()).singleElement().satisfies(option -> {
            assertThat(option.getCurrency()).isEqualTo("UAH");
            assertThat(option.getCurrencyLabel()).isEqualTo("ГРН");
        });
    }
}
