package com.example.personalFinance.service;

import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetService {

    List<Budget> findByUserIdOrderByMonthDesc(UUID userApp);

    Page<Budget> findByUserId(UUID userApp, Pageable pageable);

    List<Budget> findByUserIdAndMonth(UUID id, LocalDate monthLocalDate);

    Budget save(Budget newBudget);

    Optional<Budget> findBudgetAdmin(UUID id);

    Optional<Budget> findBudget(UUID userid, UUID id);

    void deleteBudget(UUID userid, UUID id);

    List<BudgetCategory> findBudgetCategories(UUID id, CategoryType categoryType);

    BigDecimal calculateBudgetTotal(UUID id, CategoryType categoryType);

    List<Category> findCategoriesUnusedInBudget(UUID userId, UUID budgetId, CategoryType categoryType);

    boolean isBudgetCategoryExisted(UUID userId, UUID budgetId, UUID categoryId);

    BudgetCategory saveBudgetCategory(UUID budgetId, BudgetCategory budgetCategory);

    Budget updateBudgetTotals(UUID budgetId);


    Optional<BudgetCategory> findBudgetCategoryById(UUID id);

    void deleteBudgetCategory(UUID budgetId, UUID id);

    Budget cloneBudget(UUID userId, UUID baseBudgetId, LocalDate newMonth);

    Optional<BudgetCategory> getBudgetCategoryByUserIdAndCategoryAndMonth(UUID userId, Category category, LocalDate month);
}
