package com.example.personalFinance.mapper;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.dto.BudgetCategoryDetailedDto;
import com.example.personalFinance.dto.BudgetDetailedDto;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;
import static com.example.personalFinance.service.Impl.TestUtilities.createAccount;
import static com.example.personalFinance.service.Impl.TestUtilities.createCategory;
import static com.example.personalFinance.service.Impl.TestUtilities.createTransaction;
import static com.example.personalFinance.service.Impl.TestUtilities.createUser;
import static org.junit.jupiter.api.Assertions.*;

@IntegrationTest
class BudgetDetailedMapperTest extends IntegrationTestBase {

    @Autowired
    private BudgetDetailedMapper budgetDetailedMapper;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private UserService userService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private CategoryMapper categoryMapper;

    @BeforeEach
    void clearDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "transfer",
                "transaction",
                "budget_categories",
                "category",
                "budget",
                "account",
                "onboarding_state",
                "users");
    }

    @Test
    @DisplayName("should include fact-only categories when mapping budget details")
    void shouldIncludeFactOnlyCategoriesWhenMappingBudgetDetails() {
        UserApp user = createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Budget budget = Budget.builder()
                .user(user)
                .month(LocalDate.of(2023, 1, 1))
                .status(BudgetStatus.DRAFT)
                .totalIncome(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .build();
        budget = budgetService.save(budget);

        Category food = createCategory(categoryService, user, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category transport = createCategory(categoryService, user, "Transport", CategoryType.EXPENSES, "Transport", null, false);

        BudgetCategory budgetCategory = new BudgetCategory(budget, food, CategoryType.EXPENSES, new BigDecimal("500.00"), "Plan for food");
        budgetService.saveBudgetCategory(budget.getId(), budgetCategory);

        Account account = createAccount(accountService, "wallet", AccountType.CASH, user);

        createTransaction(transactionService, user,
                LocalDateTime.of(2023, 1, 10, 12, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                food,
                account,
                TransactionDirection.DECREASE,
                new BigDecimal("200.00"),
                "Groceries");

        createTransaction(transactionService, user,
                LocalDateTime.of(2023, 1, 15, 9, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                transport,
                account,
                TransactionDirection.DECREASE,
                new BigDecimal("150.50"),
                "Fuel");

        Budget refreshedBudget = budgetService.findBudget(user.getId(), budget.getId()).orElseThrow();

        BudgetDetailedDto budgetDetailedDto = budgetDetailedMapper.toDto(refreshedBudget, budgetService, transactionService, categoryService, categoryMapper);
        List<BudgetCategoryDetailedDto> expenseCategories = budgetDetailedDto.getExpenseBudgetCategories();

        assertEquals(2, expenseCategories.size());

        Optional<BudgetCategoryDetailedDto> foodCategoryDto = expenseCategories.stream()
                .filter(dto -> dto.getCategory().getId().equals(food.getId()))
                .findFirst();
        assertTrue(foodCategoryDto.isPresent());
        assertEquals(new BigDecimal("500.00"), foodCategoryDto.get().getPlanAmount());
        assertEquals(new BigDecimal("200.00"), foodCategoryDto.get().getFactAmount());
        assertEquals(new BigDecimal("300.00"), foodCategoryDto.get().getLeftover());

        Optional<BudgetCategoryDetailedDto> transportCategoryDto = expenseCategories.stream()
                .filter(dto -> dto.getCategory().getId().equals(transport.getId()))
                .findFirst();
        assertTrue(transportCategoryDto.isPresent());
        assertEquals(new BigDecimal("0.00"), transportCategoryDto.get().getPlanAmount());
        assertEquals(new BigDecimal("150.50"), transportCategoryDto.get().getFactAmount());
        assertEquals(new BigDecimal("-150.50"), transportCategoryDto.get().getLeftover());
    }
}
