package com.example.personalFinance.repository;

import com.example.personalFinance.model.SubscriptionCancellation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionCancellationRepository extends JpaRepository<SubscriptionCancellation, UUID> {

    List<SubscriptionCancellation> findAllByOrderByCreatedAtDesc();
}
