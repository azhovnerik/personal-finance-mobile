package com.example.personalFinance.service.subscription;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.service.AppUrlBuilder;
import com.example.personalFinance.service.LocalizationService;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SubscriptionNotificationServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private SubscriptionPlanMessageBuilder planMessageBuilder;

    @Mock
    private AppUrlBuilder appUrlBuilder;

    @Mock
    private MessageSource messageSource;

    @Mock
    private LocalizationService localizationService;

    private SubscriptionNotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new SubscriptionNotificationService(mailSender, planMessageBuilder,
                appUrlBuilder, messageSource, localizationService);
        ReflectionTestUtils.setField(notificationService, "subscriptionPagePath", "/subscriptions");
        ReflectionTestUtils.setField(notificationService, "fromAddress", "support@example.com");

        when(localizationService.resolveLocale(anyString())).thenReturn(Locale.ENGLISH);
        when(appUrlBuilder.buildUrl(anyString())).thenAnswer(invocation -> "https://app.test" + invocation.getArgument(0));
        when(messageSource.getMessage(anyString(), any(), any(Locale.class))).thenReturn("message");
    }

    @Test
    void sendSubscriptionActivatedEmail_shouldNotThrowWhenMailSenderFails() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .name("Test User")
                .build();

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("PREMIUM_PLAN")
                .build();

        UserSubscription subscription = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .build();

        doThrow(new MailSendException("SMTP failure")).when(mailSender).send(any(SimpleMailMessage.class));

        assertDoesNotThrow(() -> notificationService.sendSubscriptionActivatedEmail(user, subscription));
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendPaymentFailedEmail_shouldUseFallbackReason() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .name("Test User")
                .build();
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code("STANDARD_YEARLY")
                .build();

        assertDoesNotThrow(() -> notificationService.sendPaymentFailedEmail(user, plan, null));
        verify(mailSender).send(any(SimpleMailMessage.class));
    }
}
