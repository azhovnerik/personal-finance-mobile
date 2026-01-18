package com.example.personalFinance.repository;

import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgeCategoryRepository extends JpaRepository<BudgetCategory, UUID> {
    List<BudgetCategory> findByBudgetAndType(Budget budget, CategoryType type);

    Optional<BudgetCategory> findByBudgetAndCategory(Budget budget, Category category);

    boolean existsByBudgetAndCategory(Budget budget, Category category);

    @Modifying
    @Query("DELETE FROM BudgetCategory b WHERE b.id = :id")
    void deleteById(@Param("id") UUID id);
}
