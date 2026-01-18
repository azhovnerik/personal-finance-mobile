package com.example.personalFinance.service;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface UserBudgetService {
    List<Budget> getBudgetsByUser(UserDetails userDetails);

    Page<Budget> getBudgetsByUser(UserDetails userDetails, Pageable pageable);

    List<Budget> getBudgetsByUserEmail(String userEmail);

    Budget addBudget(String userEmail, String month, BigDecimal totalIncome, BigDecimal totalExpenses);

    boolean saveBudget(UserDetails userDetail, UUID id, String month, BigDecimal totalIncome, BigDecimal totalExpenses);

    Budget findBudget(UserDetails userDetail, UUID id);

    Budget findBudget(String userEmail, UUID id);

    void deleteBudget(UserDetails userDetail, UUID id);

    void deleteBudget(String userEmail, UUID id);

    List<Category> findCategoriesUnusedInBudget(UserDetails userDetails, UUID budgetId, CategoryType categoryType);

    BudgetCategory addBudgetCategory(UserDetails userDetails, BudgetCategoryDto budgetCategoryDto);

    BudgetCategory findBudgetCategoryById(UUID id);

    boolean deleteBudgetCategory(UserDetails userDetails, UUID budgetId, UUID id);

    boolean deleteBudgetCategory(String userEmail, UUID budgetId, UUID id);
}
