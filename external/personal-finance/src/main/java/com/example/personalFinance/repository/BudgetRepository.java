package com.example.personalFinance.repository;

import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.UserApp;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findBudgetByUserOrderByMonthDesc(UserApp user);

    Page<Budget> findByUser(UserApp user, Pageable pageable);

    List<Budget> findBudgetByUserAndMonth(UserApp user, LocalDate month);

    Optional<Budget> findBudgetByUserAndId(UserApp userApp, UUID id);

    boolean existsByUser(UserApp user);
}
