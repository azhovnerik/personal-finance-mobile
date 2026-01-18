package com.example.personalFinance.service.Impl;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.exception.DuplicateBudgetException;
import com.example.personalFinance.exception.DuplicateCategoryException;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.BudgetCategoryMapper;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.UserBudgetService;
import com.example.personalFinance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.example.personalFinance.utils.DateTimeUtils.convertToLocalDate;

@Service
public class UserBudgetServiceImpl implements UserBudgetService {

    @Autowired
    private UserService userService;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private BudgetCategoryMapper budgetCategoryMapper;

    @Override
    public List<Budget> getBudgetsByUser(UserDetails userDetails) {
        Optional<UserApp> user = userService.findByName(userDetails.getUsername());
        if (user.isPresent()) {
            List<Budget> budgetList = budgetService.findByUserIdOrderByMonthDesc(user.get().getId());
            return budgetList;
        }
        return new ArrayList<>();
    }

    @Override
    public Page<Budget> getBudgetsByUser(UserDetails userDetails, Pageable pageable) {
        Optional<UserApp> user = userService.findByName(userDetails.getUsername());
        if (user.isPresent()) {
            return budgetService.findByUserId(user.get().getId(), pageable);
        }
        return new PageImpl<>(Collections.emptyList(), pageable, 0);
    }

    @Override
    public List<Budget> getBudgetsByUserEmail(String userEmail) {
        Optional<UserApp> user = userService.findByEmail(userEmail);
        if (user.isPresent()) {
            List<Budget> budgetList = budgetService.findByUserIdOrderByMonthDesc(user.get().getId());
            return budgetList;
        }
        return new ArrayList<>();
    }

    @Override
    public Budget addBudget(String userEmail, String month, BigDecimal totalIncome, BigDecimal totalExpenses) throws DuplicateBudgetException {
        Optional<UserApp> user = userService.findByEmail(userEmail);
        if (user.isPresent()) {
            LocalDate monthLocalDate = convertToLocalDate(month);
            List<Budget> existingBudget = budgetService.findByUserIdAndMonth(user.get().getId(), monthLocalDate);
            if (!existingBudget.isEmpty()) {
                throw new DuplicateBudgetException("There is existed budget with such month!");
            }
            Budget newBudget = new Budget(user.get(), monthLocalDate, totalIncome, totalExpenses, BudgetStatus.DRAFT);
            return budgetService.save(newBudget);
        }
        return null;
    }

    @Override
    public boolean saveBudget(UserDetails userDetails, UUID id, String month, BigDecimal totalIncome, BigDecimal totalExpenses) {
        Optional<UserApp> userOptional = userService.findByName(userDetails.getUsername());
        userOptional.ifPresent(user -> {
            Optional<Budget> budgetOptional = budgetService.findBudget(user.getId(), id);
            budgetOptional.ifPresentOrElse(budget -> {
                LocalDate monthLocalDate = convertToLocalDate(month);
                if (!monthLocalDate.isEqual(budget.getMonth())) {
                    List<Budget> existingBudget = budgetService.findByUserIdAndMonth(user.getId(), monthLocalDate);
                    if (!existingBudget.isEmpty()) {
                        throw new DuplicateBudgetException("There is existed budget with such month!");
                    }
                }
                budget.setMonth(monthLocalDate);
                budget.setTotalExpense(totalExpenses);
                budget.setTotalIncome(totalIncome);
                budgetService.save(budget);
            }, () -> {
                throw new NonExistedException("The budget is not exist!");
            });
        });
        return true;
    }

    @Override
    public Budget findBudget(UserDetails userDetails, UUID id) {
        Optional<UserApp> userOptional = userService.findByName(userDetails.getUsername());
        if (userOptional.isPresent()) {
            Optional<Budget> budgetOptional = budgetService.findBudget(userOptional.get().getId(), id);
            return budgetOptional.orElseThrow(() -> new NonExistedException("The budget is not exist!"));
        }
        return null;
    }

    @Override
    public Budget findBudget(String userEmail, UUID id) {
        Optional<UserApp> user = userService.findByEmail(userEmail);
        if (user.isPresent()) {
            Optional<Budget> budgetOptional = budgetService.findBudget(user.get().getId(), id);
            return budgetOptional.orElseThrow(() -> new NonExistedException("The budget is not exist!"));
        }
        return null;
    }

    @Override
    public void deleteBudget(UserDetails userDetails, UUID id) {
        Optional<UserApp> userOptional = userService.findByName(userDetails.getUsername());
        userOptional.ifPresent(userApp -> {
            Budget budget = budgetService.findBudget(userOptional.get().getId(), id)
                    .orElseThrow(() -> new NonExistedException("The budget is not exist!"));
            budgetService.deleteBudget(userApp.getId(), budget.getId());
        });
    }

    @Override
    public void deleteBudget(String userEmail, UUID id) {
        Optional<UserApp> userOptional = userService.findByEmail(userEmail);
        userOptional.ifPresent(userApp -> {
            Budget budget = budgetService.findBudget(userOptional.get().getId(), id)
                    .orElseThrow(() -> new NonExistedException("The budget is not exist!"));
            budgetService.deleteBudget(userApp.getId(), budget.getId());
        });
    }

    @Override
    public List<Category> findCategoriesUnusedInBudget(UserDetails userDetails, UUID budgetId, CategoryType categoryType) {
        Optional<UserApp> userOptional = userService.findByName(userDetails.getUsername());
        if (userOptional.isPresent()) {
            List<Category> categoriesUnusedInBudget = budgetService.findCategoriesUnusedInBudget(userOptional.get().getId(), budgetId, categoryType);
            return categoriesUnusedInBudget;
        }
        return null;
    }

    @Override
    public BudgetCategory addBudgetCategory(UserDetails userDetails, BudgetCategoryDto budgetCategoryDto) {
        Optional<UserApp> user = userService.findByName(userDetails.getUsername());
        if (user.isPresent()) {
            if (budgetService.isBudgetCategoryExisted(user.get().getId(),
                    budgetCategoryDto.getBudgetId(),
                    budgetCategoryDto.getCategory().getId())) {
                throw new DuplicateCategoryException("There is existed budget category in this budget!");
            }
            if (budgetCategoryDto.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new NumberFormatException("It's impossible to add zero amount!");
            }

            BudgetCategory budgetCategory = budgetCategoryMapper.toModel(budgetCategoryDto, budgetService);

            return budgetService.saveBudgetCategory(budgetCategoryDto.getBudgetId(), budgetCategory);
        } else {
            throw new NonExistedException("The user is not exist!");
        }

    }

    @Override
    public BudgetCategory findBudgetCategoryById(UUID id) {

        Optional<BudgetCategory> budgetOptional = budgetService.findBudgetCategoryById(id);
        return budgetOptional.orElseThrow(() -> new NonExistedException("The budget category doesn't exist!"));
    }

    @Override
    public boolean deleteBudgetCategory(UserDetails userDetails, UUID budgetId, UUID id) {

        Optional<UserApp> user = userService.findByName(userDetails.getUsername());
        Optional<BudgetCategory> budgetCategory = budgetService.findBudgetCategoryById(id);
        if (user.isPresent() && budgetCategory.isPresent()) {
            if (!budgetService.isBudgetCategoryExisted(user.get().getId(),
                    budgetId,
                    budgetCategory.get().getCategory().getId())) {
                return false;
            }
            budgetService.deleteBudgetCategory(budgetId, id);
            return true;
        }
        return false;
    }

    @Override
    public boolean deleteBudgetCategory(String userEmail, UUID budgetId, UUID id) {
        Optional<UserApp> user = userService.findByEmail(userEmail);
        Optional<BudgetCategory> budgetCategory = budgetService.findBudgetCategoryById(id);
        if (user.isPresent() && budgetCategory.isPresent()) {
            if (!budgetService.isBudgetCategoryExisted(user.get().getId(),
                    budgetId,
                    budgetCategory.get().getCategory().getId())) {
                throw new NonExistedException("Budget category is not existed!");
            }
            budgetService.deleteBudgetCategory(budgetId, id);
            return true;
        }
        return false;
    }
}
