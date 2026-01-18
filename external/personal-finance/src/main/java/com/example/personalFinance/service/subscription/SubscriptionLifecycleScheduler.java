package com.example.personalFinance.service.subscription;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionLifecycleScheduler {

    private final SubscriptionService subscriptionService;

    @Scheduled(cron = "${app.subscription.cron.trial-reminder:0 0 9 * * *}")
    public void processTrialReminders() {
        log.info("Starting processTrialReminders scheduler execution");
        long startTime = System.currentTimeMillis();
        try {
            int sent = subscriptionService.sendTrialEndingSoonReminders();
            long duration = System.currentTimeMillis() - startTime;
            log.info("Completed processTrialReminders: sent={}, duration={}ms, status=SUCCESS", sent, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Failed processTrialReminders: duration={}ms, status=ERROR, error={}", duration, e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${app.subscription.cron.trial-expiration:0 5 9 * * *}")
    public void processTrialExpirations() {
        log.info("Starting processTrialExpirations scheduler execution");
        long startTime = System.currentTimeMillis();
        try {
            int processed = subscriptionService.handleTrialExpirations();
            long duration = System.currentTimeMillis() - startTime;
            log.info("Completed processTrialExpirations: processed={}, duration={}ms, status=SUCCESS", processed, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Failed processTrialExpirations: duration={}ms, status=ERROR, error={}", duration, e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${app.subscription.cron.trial-expired-reminder:0 10 9 * * *}")
    public void processTrialExpiredReminders() {
        log.info("Starting processTrialExpiredReminders scheduler execution");
        long startTime = System.currentTimeMillis();
        try {
            int sent = subscriptionService.sendTrialExpiredReminders();
            long duration = System.currentTimeMillis() - startTime;
            log.info("Completed processTrialExpiredReminders: sent={}, duration={}ms, status=SUCCESS", sent, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Failed processTrialExpiredReminders: duration={}ms, status=ERROR, error={}", duration, e.getMessage(), e);
        }
    }
}
