package com.example.personalFinance.service.subscription;

import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.service.AppUrlBuilder;
import com.example.personalFinance.service.LocalizationService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SubscriptionNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionNotificationService.class);

    private final JavaMailSender mailSender;
    private final SubscriptionPlanMessageBuilder planMessageBuilder;
    private final AppUrlBuilder appUrlBuilder;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;

    @Value("${app.subscription.page-path:/subscriptions}")
    private String subscriptionPagePath;

    @Value("${app.mail.from-address:}")
    private String fromAddress;

    public void sendTrialWelcomeEmail(UserApp user, UserSubscription subscription) {
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }
        Locale locale = resolveLocale(user);
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.trial.welcome.subject", null, locale));
        String planOptions = planMessageBuilder.buildPlanOptionsBulletList(user);
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("email.trial.welcome.greeting", new Object[]{user.getName()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.welcome.intro", null, locale))
                .append("\n\n");
        Object[] dateArg = new Object[]{formatDate(locale, subscription.getTrialEndsAt())};
        if (StringUtils.hasText(planOptions)) {
            body.append(messageSource.getMessage("email.trial.welcome.planHeader", dateArg, locale))
                    .append("\n")
                    .append(planOptions)
                    .append("\n\n");
        } else {
            body.append(messageSource.getMessage("email.trial.welcome.planFallback", dateArg, locale))
                    .append("\n\n");
        }
        body.append(messageSource.getMessage("email.trial.welcome.subscriptionLink",
                        new Object[]{getSubscriptionPageUrl()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.welcome.signature", null, locale));
        message.setText(body.toString());
        sendEmail(user, message,
                "Sent trial welcome email to user {}",
                "Failed to send trial welcome email to user {}");
    }

    public void sendTrialEndingSoonEmail(UserApp user, UserSubscription subscription) {
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }
        Locale locale = resolveLocale(user);
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.trial.reminder.subject", null, locale));
        String planOptions = planMessageBuilder.buildPlanOptionsBulletList(user);
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("email.trial.reminder.intro", new Object[]{user.getName()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.reminder.body",
                        new Object[]{formatDate(locale, subscription.getTrialEndsAt())}, locale));
        if (StringUtils.hasText(planOptions)) {
            body.append("\n\n")
                    .append(messageSource.getMessage("email.trial.reminder.planHeader", null, locale))
                    .append("\n")
                    .append(planOptions)
                    .append("\n");
        }
        body.append("\n")
                .append(messageSource.getMessage("email.trial.reminder.subscriptionLink",
                        new Object[]{getSubscriptionPageUrl()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.reminder.signature", null, locale));
        message.setText(body.toString());
        sendEmail(user, message,
                "Sent trial ending soon email to user {}",
                "Failed to send trial ending soon email to user {}");
    }

    public void sendTrialExpiredEmail(UserApp user, UserSubscription subscription) {
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }
        Locale locale = resolveLocale(user);
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.trial.expired.subject", null, locale));
        String planOptions = planMessageBuilder.buildPlanOptionsBulletList(user);
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("email.trial.expired.intro", new Object[]{user.getName()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.expired.body",
                        new Object[]{formatDate(locale, subscription.getTrialEndsAt())}, locale));
        if (StringUtils.hasText(planOptions)) {
            body.append("\n\n")
                    .append(messageSource.getMessage("email.trial.expired.planHeader", null, locale))
                    .append("\n")
                    .append(planOptions)
                    .append("\n");
        }
        body.append("\n")
                .append(messageSource.getMessage("email.trial.expired.subscriptionLink",
                        new Object[]{getSubscriptionPageUrl()}, locale))
                .append("\n\n")
                .append(messageSource.getMessage("email.trial.expired.signature", null, locale));
        message.setText(body.toString());
        sendEmail(user, message,
                "Sent trial expired email to user {}",
                "Failed to send trial expired email to user {}");
    }

    public void sendCancellationConfirmation(UserApp user, UserSubscription subscription) {
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }
        Locale locale = resolveLocale(user);
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.cancellation.subject", null, locale));
        String effectiveDate = subscription.getCancellationEffectiveAt() != null
                ? formatDate(locale, subscription.getCancellationEffectiveAt())
                : messageSource.getMessage("email.cancellation.fallback", null, locale);
        message.setText(messageSource.getMessage("email.cancellation.body",
                new Object[]{user.getName(), effectiveDate, getSubscriptionPageUrl()}, locale));
        sendEmail(user, message,
                "Sent cancellation confirmation email to user {}",
                "Failed to send cancellation confirmation email to user {}");
    }

    public void sendSubscriptionActivatedEmail(UserApp user, UserSubscription subscription) {
        if (!StringUtils.hasText(user.getEmail())) { 
            return;
        }
        Locale locale = resolveLocale(user);
        SubscriptionPlan plan = subscription.getPlan();
        String planName = plan != null ? formatPlanName(plan.getCode()) : "";
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.activation.subject", null, locale));
        message.setText(messageSource.getMessage("email.activation.body",
                new Object[]{user.getName(), planName, getSubscriptionPageUrl()}, locale));
        sendEmail(user, message,
                "Sent subscription activation email to user {}",
                "Failed to send subscription activation email to user {}");
    }

    public void sendPaymentFailedEmail(UserApp user, SubscriptionPlan plan, String failureReason) {
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }
        Locale locale = resolveLocale(user);
        String planName = plan != null ? formatPlanName(plan.getCode()) : "";
        String reason = StringUtils.hasText(failureReason)
                ? failureReason.trim()
                : messageSource.getMessage("subscription.error.paymentFailed", null, locale);
        SimpleMailMessage message = baseMessage(user.getEmail());
        message.setSubject(messageSource.getMessage("email.payment.failed.subject", null, locale));
        message.setText(messageSource.getMessage("email.payment.failed.body",
                new Object[]{user.getName(), planName, reason, getSubscriptionPageUrl()}, locale));
        sendEmail(user, message,
                "Sent payment failure email to user {}",
                "Failed to send payment failure email to user {}");
    }

    private SimpleMailMessage baseMessage(String email) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(fromAddress)) {
            message.setFrom(fromAddress);
        }
        message.setTo(email);
        return message;
    }

    private String getSubscriptionPageUrl() {
        return appUrlBuilder.buildUrl(subscriptionPagePath);
    }

    private String formatPlanName(String planCode) {
        if (!StringUtils.hasText(planCode)) {
            return "";
        }
        return Arrays.stream(planCode.toLowerCase(Locale.ROOT).split("_"))
                .filter(StringUtils::hasText)
                .map(StringUtils::capitalize)
                .collect(Collectors.joining(" "));
    }

    private Locale resolveLocale(UserApp user) {
        return localizationService.resolveLocale(user.getInterfaceLanguage());
    }

    private String formatDate(Locale locale, LocalDateTime dateTime) {
        if (dateTime == null) {
            return messageSource.getMessage("email.cancellation.fallback", null, locale);
        }
        LocalDate date = dateTime.toLocalDate();
        Locale dateLocale = localizationService.resolveDateLocale(locale);
        DateTimeFormatter formatter = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).localizedBy(dateLocale);
        return formatter.format(date);
    }

    private void sendEmail(UserApp user,
                           SimpleMailMessage message,
                           String successLogTemplate,
                           String failureLogTemplate) {
        try {
            mailSender.send(message);
            log.info(successLogTemplate, user.getId());
        } catch (MailException ex) {
            log.error(failureLogTemplate, user.getId(), ex);
        }
    }
}
