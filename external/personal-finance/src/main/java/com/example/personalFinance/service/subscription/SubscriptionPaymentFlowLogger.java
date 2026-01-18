package com.example.personalFinance.service.subscription;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Slf4j
@Component
public class SubscriptionPaymentFlowLogger {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault());

    private final Path logFile;
    private final AtomicBoolean fileLoggingAvailable = new AtomicBoolean(true);
    private final Object lock = new Object();

    public SubscriptionPaymentFlowLogger(@Value("${app.subscription.payment-flow-log.path:}") String configuredPath) {
        if (StringUtils.hasText(configuredPath)) {
            this.logFile = Paths.get(configuredPath).toAbsolutePath().normalize();
        } else {
            this.logFile = Paths.get("logs", "subscription-payments.log").toAbsolutePath().normalize();
        }
        ensureLogFile();
    }

    public void logStep(UUID userId, String orderId, String step, String message) {
        logStep(userId, orderId, step, message, Map.of());
    }

    public void logStep(UUID userId, String orderId, String step, String message, Map<String, String> context) {
        Map<String, String> sanitizedContext = sanitize(context);
        StringBuilder builder = new StringBuilder();
        builder.append(TIMESTAMP_FORMATTER.format(Instant.now()));
        builder.append(" | step=").append(step);
        if (userId != null) {
            builder.append(" | user=").append(userId);
        }
        if (StringUtils.hasText(orderId)) {
            builder.append(" | order=").append(orderId);
        }
        if (StringUtils.hasText(message)) {
            builder.append(" | ").append(message);
        }
        if (!sanitizedContext.isEmpty()) {
            builder.append(" | context=");
            sanitizedContext.forEach((key, value) -> builder.append(key).append('=').append(value).append(';'));
        }
        appendLine(builder.toString());
    }

    public void logError(UUID userId, String orderId, String step, String message, Throwable throwable) {
        Map<String, String> context = new LinkedHashMap<>();
        if (throwable != null) {
            context.put("error", throwable.getClass().getSimpleName());
            if (StringUtils.hasText(throwable.getMessage())) {
                context.put("error_message", throwable.getMessage().replaceAll("\n", " "));
            }
        }
        logStep(userId, orderId, step, message, context);
    }

    private Map<String, String> sanitize(Map<String, String> context) {
        if (CollectionUtils.isEmpty(context)) {
            return Map.of();
        }
        Map<String, String> sanitized = new LinkedHashMap<>();
        context.forEach((key, value) -> {
            if (!StringUtils.hasText(key) || value == null) {
                return;
            }
            String sanitizedValue = value.replaceAll("\n", " ").trim();
            sanitized.put(key.trim(), sanitizedValue);
        });
        return sanitized;
    }

    private void appendLine(String line) {
        log.info("PaymentFlow | {}", line);
        if (!fileLoggingAvailable.get()) {
            return;
        }
        synchronized (lock) {
            try {
                Files.writeString(logFile, line + System.lineSeparator(), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (IOException ex) {
                fileLoggingAvailable.set(false);
                log.warn("Unable to write subscription payment flow log to {}: {}", logFile, ex.getMessage());
            }
        }
    }

    private void ensureLogFile() {
        try {
            Path parent = logFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            if (Files.notExists(logFile)) {
                Files.createFile(logFile);
            }
        } catch (IOException ex) {
            fileLoggingAvailable.set(false);
            log.warn("Unable to initialize subscription payment flow log file at {}: {}", logFile, ex.getMessage());
        }
    }
}
