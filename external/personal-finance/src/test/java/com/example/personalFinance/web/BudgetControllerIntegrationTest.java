package com.example.personalFinance.web;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.Impl.TestUtilities;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.jdbc.JdbcTestUtils;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
class BudgetControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private BudgetController budgetController;

    @Autowired
    private UserService userService;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountService accountService;

    @BeforeEach
    void cleanDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "transaction",
                "transfer",
                "budget_categories",
                "account",
                "category",
                "budget",
                "onboarding_state",
                "users");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldDisplayFactOnlyCategoryInBudgetEditView() {
        UserApp user = TestUtilities.createUser(userService, "view@example.com", "viewer", TestUtilities.STRONG_TEST_PASSWORD);
        Budget budget = budgetService.save(Budget.builder()
                .user(user)
                .month(LocalDate.of(2025, 9, 1))
                .status(BudgetStatus.DRAFT)
                .totalIncome(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .build());

        Category salary = TestUtilities.createCategory(categoryService, user, "Salary", CategoryType.INCOME, "Salary", null, false);
        Account account = TestUtilities.createAccount(accountService, "main", AccountType.CASH, user);

        TestUtilities.createTransaction(transactionService,
                user,
                LocalDateTime.of(2025, 9, 19, 16, 49).toEpochSecond(ZoneOffset.UTC),
                TransactionType.INCOME,
                salary,
                account,
                TransactionDirection.INCREASE,
                new BigDecimal("3333.00"),
                "September salary");

        User userDetails = new User(user.getEmail(), user.getPassword(), Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, userDetails.getPassword(), userDetails.getAuthorities()));

        ExtendedModelMap model = new ExtendedModelMap();
        MockHttpServletResponse response = new MockHttpServletResponse();
        String viewName = budgetController.editBudget(budget.getId(), model, response);

        assertThat(viewName).isEqualTo("budget-details");
        assertThat(response.getContentType())
                .as("response should be HTML regardless of charset")
                .isNotNull()
                .startsWith(MediaType.TEXT_HTML_VALUE);

        @SuppressWarnings("unchecked")
        List<BudgetCategory> incomeCategories = (List<BudgetCategory>) model.get("incomeCategoryList");
        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> incomeFactAmountMap = (Map<String, BigDecimal>) model.get("incomeFactAmountMap");
        BigDecimal incomeFactTotal = (BigDecimal) model.get("incomeFactTotal");

        assertThat(incomeCategories)
                .as("income categories should contain the fact-only salary category")
                .anySatisfy(category -> {
                    if (category.getCategory().getId().equals(salary.getId())) {
                        assertThat(category.getId()).isNull();
                        assertThat(category.getAmount()).isEqualByComparingTo(new BigDecimal("0.00"));
                    }
                });

        assertThat(incomeFactAmountMap).containsEntry("Salary", new BigDecimal("3333.00"));
        assertThat(incomeFactTotal).isEqualByComparingTo(new BigDecimal("3333.00"));
    }

    @Test
    void shouldDisplayFactOnlyCategoryAlongsidePlannedCategories() {
        UserApp user = TestUtilities.createUser(userService, "plan@example.com", "planner", TestUtilities.STRONG_TEST_PASSWORD);
        Budget budget = budgetService.save(Budget.builder()
                .user(user)
                .month(LocalDate.of(2025, 9, 1))
                .status(BudgetStatus.DRAFT)
                .totalIncome(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .build());

        Category bonus = TestUtilities.createCategory(categoryService, user, "Bonus", CategoryType.INCOME, "Bonus", null, false);
        Category salary = TestUtilities.createCategory(categoryService, user, "Salary", CategoryType.INCOME, "Salary", null, false);
        Account account = TestUtilities.createAccount(accountService, "main", AccountType.CASH, user);

        budgetService.saveBudgetCategory(budget.getId(), BudgetCategory.builder()
                .budget(budget)
                .category(bonus)
                .type(CategoryType.INCOME)
                .amount(new BigDecimal("100.00"))
                .comment("Bonus plan")
                .build());

        TestUtilities.createTransaction(transactionService,
                user,
                LocalDateTime.of(2025, 9, 19, 16, 49).toEpochSecond(ZoneOffset.UTC),
                TransactionType.INCOME,
                salary,
                account,
                TransactionDirection.INCREASE,
                new BigDecimal("3333.00"),
                "September salary");

        User userDetails = new User(user.getEmail(), user.getPassword(), Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, userDetails.getPassword(), userDetails.getAuthorities()));

        ExtendedModelMap model = new ExtendedModelMap();
        MockHttpServletResponse response = new MockHttpServletResponse();
        String viewName = budgetController.editBudget(budget.getId(), model, response);

        assertThat(viewName).isEqualTo("budget-details");
        assertThat(response.getContentType())
                .as("response should be HTML regardless of charset")
                .isNotNull()
                .startsWith(MediaType.TEXT_HTML_VALUE);

        @SuppressWarnings("unchecked")
        List<BudgetCategory> incomeCategories = (List<BudgetCategory>) model.get("incomeCategoryList");
        assertThat(incomeCategories)
                .extracting(category -> category.getCategory().getName())
                .contains("Bonus", "Salary");
    }
}
