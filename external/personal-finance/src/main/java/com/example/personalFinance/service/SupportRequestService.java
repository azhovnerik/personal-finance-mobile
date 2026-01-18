package com.example.personalFinance.service;

import com.example.personalFinance.model.SupportRequest;
import com.example.personalFinance.repository.SupportRequestRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SupportRequestService {

    private static final Logger log = LoggerFactory.getLogger(SupportRequestService.class);

    private final SupportRequestRepository supportRequestRepository;
    private final JavaMailSender mailSender;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;

    @Value("${app.mail.from-address:}")
    private String fromAddress;

    @Value("${app.mail.support-address:support@moneydrive.me}")
    private String supportEmailAddress;

    @Transactional
    public SupportRequest submitRequest(String email, String subject, String messageBody) {
        String normalizedEmail = email != null ? email.trim() : null;
        String normalizedSubject = subject != null ? subject.trim() : null;
        String normalizedMessage = messageBody != null ? messageBody.trim() : null;

        SupportRequest request = supportRequestRepository.save(SupportRequest.builder()
                .email(normalizedEmail)
                .subject(normalizedSubject)
                .message(normalizedMessage)
                .build());

        sendSupportEmail(request);
        log.info("Created support request {} from {}", request.getId(), request.getEmail());
        return request;
    }

    private void sendSupportEmail(SupportRequest request) {
        if (!StringUtils.hasText(supportEmailAddress)) {
            return;
        }
        Locale locale = localizationService.getDefaultLocale();
        String subject = messageSource.getMessage("support.email.request.subject",
                new Object[]{request.getSubject()},
                locale);
        String body = messageSource.getMessage("support.email.request.body",
                new Object[]{request.getEmail(), request.getSubject(), request.getMessage()},
                locale);

        SimpleMailMessage message = new SimpleMailMessage();
        String resolvedFrom = resolveFromAddress();
        if (StringUtils.hasText(resolvedFrom)) {
            message.setFrom(resolvedFrom);
        }
        if (StringUtils.hasText(request.getEmail())) {
            message.setReplyTo(request.getEmail());
        }
        message.setTo(supportEmailAddress);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String resolveFromAddress() {
        if (StringUtils.hasText(supportEmailAddress)) {
            return supportEmailAddress;
        }
        if (StringUtils.hasText(fromAddress)) {
            return fromAddress;
        }
        return null;
    }
}
