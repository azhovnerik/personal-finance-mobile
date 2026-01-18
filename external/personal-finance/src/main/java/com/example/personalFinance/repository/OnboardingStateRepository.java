package com.example.personalFinance.repository;

import com.example.personalFinance.model.OnboardingState;
import com.example.personalFinance.model.UserApp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OnboardingStateRepository extends JpaRepository<OnboardingState, UUID> {
    Optional<OnboardingState> findByUser(UserApp user);

    List<OnboardingState> findAllByUserId(UUID userId);
}
