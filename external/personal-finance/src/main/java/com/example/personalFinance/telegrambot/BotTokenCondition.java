package com.example.personalFinance.telegrambot;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Spring condition that checks whether a Telegram bot token is configured.
 * The bean is created only when a token is present and non-empty in one of the
 * supported configuration properties or environment variables.
 */
public class BotTokenCondition implements Condition {

    private static final String[] TOKEN_PROPERTY_KEYS = {
            "botToken",
            "BOT_TOKEN",
            "bot.token"
    };

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Environment env = context.getEnvironment();
        for (String key : TOKEN_PROPERTY_KEYS) {
            String value = env.getProperty(key);
            if (StringUtils.hasText(value)) {
                return true;
            }
        }

        for (String key : TOKEN_PROPERTY_KEYS) {
            String value = System.getenv(key);
            if (StringUtils.hasText(value)) {
                return true;
            }
        }

        return false;
    }
}
