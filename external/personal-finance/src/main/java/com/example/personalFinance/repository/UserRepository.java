package com.example.personalFinance.repository;

import com.example.personalFinance.model.UserApp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserApp, UUID> {
    Optional<UserApp> findByEmail(String email);
    Optional<UserApp> findByPendingEmail(String pendingEmail);
    Optional<UserApp> findByTelegramName(String email);
    List<UserApp> findAll();

    Optional<UserApp> findById(UUID id);
}
