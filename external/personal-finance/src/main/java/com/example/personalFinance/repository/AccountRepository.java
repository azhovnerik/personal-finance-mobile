package com.example.personalFinance.repository;

import com.example.personalFinance.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findAccountsByUserId(UUID userId);

    Optional<Account> findByUserIdAndId(UUID userId, UUID id);

    Optional<Account> findAccountByUserIdAndName(UUID userId, String name);

    void deleteById(UUID id);
}
