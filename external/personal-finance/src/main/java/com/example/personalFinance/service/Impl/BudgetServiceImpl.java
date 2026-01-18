package com.example.personalFinance.service.Impl;

import com.example.personalFinance.exception.DuplicateBudgetException;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.BudgeCategoryRepository;
import com.example.personalFinance.repository.BudgetRepository;
import com.example.personalFinance.repository.UserRepository;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BudgetServiceImpl implements BudgetService {
    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private BudgeCategoryRepository budgeCategoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private CurrencyConversionService currencyConversionService;

    @Autowired
    private UserService userService;

    @Override
    public List<Budget> findByUserIdOrderByMonthDesc(UUID userAppId) {
        return budgetRepository.findBudgetByUserOrderByMonthDesc(userRepository.findById(userAppId).get());
    }

    @Override
    public Page<Budget> findByUserId(UUID userAppId, Pageable pageable) {
        return budgetRepository.findByUser(userRepository.findById(userAppId).get(), pageable);
    }

    @Override
    public List<Budget> findByUserIdAndMonth(UUID userId, LocalDate monthLocalDate) {
        return budgetRepository.findBudgetByUserAndMonth(userRepository.findById(userId).get(), monthLocalDate);
    }

    @Override
    public Budget save(Budget budget) {
        if (budget.getUser() != null && budget.getBaseCurrency() == null) {
            budget.setBaseCurrency(budget.getUser().getBaseCurrency());
        }
        budget = budgetRepository.save(budget);
        return updateBudgetTotals(budget.getId());
    }

    @Override
    public Optional<Budget> findBudgetAdmin(UUID id) {
        return budgetRepository.findById(id);
    }

    @Override
    public Optional<Budget> findBudget(UUID userId, UUID id) {
        return budgetRepository.findBudgetByUserAndId(userRepository.findById(userId).get(), id);
    }

    @Override
    public void deleteBudget(UUID userId, UUID id) {
        budgetRepository.deleteById(id);
    }

    @Override
    public List<BudgetCategory> findBudgetCategories(UUID budgetId, CategoryType categoryType) {
        Optional<Budget> budgetOptional = budgetRepository.findById(budgetId);
        if (budgetOptional.isPresent()) {
            return budgeCategoryRepository.findByBudgetAndType(budgetOptional.get(), categoryType);
        }
        return new ArrayList<>();
    }

    @Override
    public BigDecimal calculateBudgetTotal(UUID id, CategoryType categoryType) {
        return findBudgetCategories(id, categoryType).stream()
                .map(this::convertPlanToBase)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public List<Category> findCategoriesUnusedInBudget(UUID userId, UUID budgetId, CategoryType categoryType) {
        List<Category> userCategoryList = getCategoriesByUserIdAndType(userId, categoryType);
        List<Category> categoriesUsedInBudget = getCategoriesUsedInBudget(budgetId, categoryType);
        userCategoryList.removeAll(categoriesUsedInBudget);
        return userCategoryList;
    }

    private List<Category> getCategoriesUsedInBudget(UUID budgetId, CategoryType categoryType) {
        List<Category> budgetCategories = findBudgetCategories(budgetId, categoryType).stream().map(bc -> bc.getCategory()).collect(Collectors.toList());
        return budgetCategories;
    }

    private List<Category> getCategoriesByUserIdAndType(UUID userId, CategoryType categoryType) {
        return categoryService.findByUserAndTypeOrderByParentId(userId, categoryType, false);
    }

    @Override
    public boolean isBudgetCategoryExisted(UUID userId, UUID budgetId, UUID categoryId) {
        Optional<Budget> budgetOptional = budgetRepository.findById(budgetId);
        Optional<Category> categoryOptional = categoryService.findById(userId, categoryId);
        if (budgetOptional.isPresent() && categoryOptional.isPresent()) {
            return budgeCategoryRepository.existsByBudgetAndCategory(budgetOptional.get(), categoryOptional.get());
        }
        return false;
    }

    @Override
    public BudgetCategory saveBudgetCategory(UUID budgetId, BudgetCategory budgetCategory) {
        if (budgetCategory.getCurrency() == null) {
            budgetCategory.setCurrency(resolveCurrency(budgetId, budgetCategory));
        }
        BudgetCategory budgetCategoryResult = budgeCategoryRepository.save(budgetCategory);
        budgetCategoryResult.setBudget(updateBudgetTotals(budgetId));
        return budgetCategoryResult;
    }

    private CurrencyCode resolveCurrency(UUID budgetId, BudgetCategory budgetCategory) {
        Budget budget = budgetCategory.getBudget();
        if (budget == null && budgetId != null) {
            budget = budgetRepository.findById(budgetId).orElse(null);
            if (budget != null) {
                budgetCategory.setBudget(budget);
            }
        }
        if (budget != null) {
            CurrencyCode currency = budget.getBaseCurrency();
            if (currency != null) {
                return currency;
            }
            if (budget.getUser() != null && budget.getUser().getBaseCurrency() != null) {
                return budget.getUser().getBaseCurrency();
            }
        }
        Optional<UserApp> user = Optional.ofNullable(budgetCategory.getBudget())
                .map(Budget::getUser);
        if (user.isPresent() && user.get().getBaseCurrency() != null) {
            return user.get().getBaseCurrency();
        }
        return CurrencyCode.USD;
    }

    @Override
    public Budget updateBudgetTotals(UUID budgetId) {
        Optional<Budget> budgetOptional = budgetRepository.findById(budgetId);
        if (budgetOptional.isPresent()) {
            Budget budget = budgetOptional.get();
            BigDecimal totalIncome = calculateBudgetTotal(budgetId, CategoryType.INCOME);
            BigDecimal totalExpenses = calculateBudgetTotal(budgetId, CategoryType.EXPENSES);
            budget.setTotalIncome(totalIncome);
            budget.setTotalExpense(totalExpenses);
            if (budget.getUser() != null) {
                budget.setBaseCurrency(budget.getUser().getBaseCurrency());
            }
            return budgetRepository.save(budget);
        }
        return null;
    }

    @Override
    public Optional<BudgetCategory> findBudgetCategoryById(UUID id) {
        return budgeCategoryRepository.findById(id);
    }

    @Override
    public void deleteBudgetCategory(UUID budgetId, UUID id) {
        budgeCategoryRepository.deleteById(id);
        updateBudgetTotals(budgetId);
    }

    @Override
    //@Transactional(propagation= Propagation.REQUIRED, readOnly=true, noRollbackFor=Exception.class)
    public Budget cloneBudget(UUID userId, UUID baseBudgetId, LocalDate newMonth) {
        Optional<Budget> maybeBaseBudget = findBudget(userId, baseBudgetId);
        if (maybeBaseBudget.isPresent()) {
            List<Budget> existingBudget = findByUserIdAndMonth(userId, newMonth);
            if (!existingBudget.isEmpty()) {
                throw new DuplicateBudgetException("There is existed budget with such month!");
            }
            Budget baseBudget = maybeBaseBudget.get();
            Budget clonedBudget = new Budget(baseBudget, newMonth);
            return budgetRepository.save(clonedBudget);
        }
        return null;
    }

    @Override
    public Optional<BudgetCategory> getBudgetCategoryByUserIdAndCategoryAndMonth(UUID userId, Category category, LocalDate month) {
        List<Budget> budgetList = findByUserIdAndMonth(userId, month);
        if (budgetList.size() > 0) {
            Budget budget = budgetList.get(0);
            List<BudgetCategory> budgetCategoryList = budget.getBudgetCategory().stream().filter(c -> c.getCategory().equals(category)).collect(Collectors.toList());
            if (budgetCategoryList.size() > 0) {
                return Optional.of(budgetCategoryList.get(0));
            }
            return Optional.empty();
        }
        return Optional.empty();
    }

    private BigDecimal convertPlanToBase(BudgetCategory budgetCategory) {
        Budget budget = budgetCategory.getBudget();
        if (budget == null) {
            return BigDecimal.ZERO;
        }
        UserApp user = budget.getUser();
        if (user == null && budget.getUser() != null) {
            user = userService.findById(budget.getUser().getId()).orElse(null);
        }
        if (user == null) {
            return Optional.ofNullable(budgetCategory.getAmount()).orElse(BigDecimal.ZERO);
        }
        LocalDate rateDate = budget.getMonth() != null ? budget.getMonth().withDayOfMonth(1) : LocalDate.now();
        BigDecimal amount = Optional.ofNullable(budgetCategory.getAmount()).orElse(BigDecimal.ZERO);
        return currencyConversionService.convertToBase(user,
                budgetCategory.getCurrency() != null ? budgetCategory.getCurrency() : user.getBaseCurrency(),
                amount, rateDate);
    }
}

