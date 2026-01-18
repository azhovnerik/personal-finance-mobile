package com.example.personalFinance.repository;

import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {

    Optional<UserSubscription> findFirstByUserOrderByCreatedAtDesc(UserApp user);

    Optional<UserSubscription> findFirstByUserAndStatusInOrderByCreatedAtDesc(UserApp user, Collection<SubscriptionStatus> statuses);

    List<UserSubscription> findByStatusAndTrialEndsAtBetweenAndTrialReminderSentAtIsNull(SubscriptionStatus status,
                                                                                         LocalDateTime from,
                                                                                         LocalDateTime to);

    List<UserSubscription> findByStatusAndTrialEndsAtBeforeAndTrialExpiredNotifiedAtIsNull(SubscriptionStatus status,
                                                                                           LocalDateTime before);

    List<UserSubscription> findByStatusAndTrialEndsAtBeforeAndTrialExpiredReminderSentAtIsNull(SubscriptionStatus status,
                                                                                                LocalDateTime before);

    List<UserSubscription> findByStatusInAndNextBillingAtBefore(Collection<SubscriptionStatus> statuses, LocalDateTime before);
}
