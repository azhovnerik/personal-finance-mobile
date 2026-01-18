package com.example.personalFinance.repository;

import com.example.personalFinance.model.SubscriptionEventLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionEventLogRepository extends JpaRepository<SubscriptionEventLog, UUID> {
}
