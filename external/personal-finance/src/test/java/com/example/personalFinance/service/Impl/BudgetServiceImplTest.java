package com.example.personalFinance.service.Impl;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.dto.BudgetCategoryDetailedDto;
import com.example.personalFinance.dto.BudgetDetailedDto;
import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.mapper.BudgetDetailedMapper;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.repository.CurrencyRateRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;
import static com.example.personalFinance.service.Impl.TestUtilities.createAccount;
import static com.example.personalFinance.service.Impl.TestUtilities.createCategory;
import static com.example.personalFinance.service.Impl.TestUtilities.createTransaction;
import static com.example.personalFinance.service.Impl.TestUtilities.createUser;

@IntegrationTest
class BudgetServiceImplTest extends IntegrationTestBase {

    @Autowired
    private UserService userService;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransferService transferService;

    @Autowired
    private CurrencyRateRepository currencyRateRepository;

    @Autowired
    private BudgetDetailedMapper budgetDetailedMapper;

    @Test
    @DisplayName("Test context up")
    public void testContext() {
        assert true;
    }

    @BeforeEach
    void clearDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "currency_rate",
                "budget_categories",
                "transaction",
                "transfer",
                "account",
                "category",
                "budget",
                "onboarding_state",
                "users");
    }

    @Test
    void save() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BigDecimal.valueOf(112), BigDecimal.valueOf(110), BudgetStatus.DRAFT);

        Assertions.assertNotNull(budgetResult);
        Assertions.assertEquals(BudgetStatus.DRAFT, budgetResult.getStatus());
        Assertions.assertEquals(userApp, budgetResult.getUser());
    }

    private Budget createBudget(UserApp userApp, LocalDate month, BigDecimal totalIncome, BigDecimal totalExpenses, BudgetStatus status) {
        Budget budget = Budget.builder()
                .user(userApp)
                .month(month)
                .totalIncome(totalIncome)
                .totalExpense(totalExpenses)
                .status(status)
                .build();

        Budget budgetResult = budgetService.save(budget);
        return budgetResult;
    }

    private Budget createBudget(UserApp userApp, LocalDate month, BudgetStatus status) {
        Budget budget = Budget.builder()
                .user(userApp)
                .month(month)
                .status(status)
                .totalIncome(BigDecimal.ZERO)
                .totalExpense(BigDecimal.ZERO)
                .build();

        Budget budgetResult = budgetService.save(budget);
        return budgetResult;
    }

    @Test
    @Transactional
    void findBudgetByUserId() {
        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        userDto = buildUserDto("b@b.com", "bb");

        UserApp userApp2 = userService.registerNewUserAccount(userDto);

        Budget budget1 = createBudget(userApp, LocalDate.of(2023, 1, 1), BigDecimal.valueOf(112.0), BigDecimal.valueOf(110.0), BudgetStatus.DRAFT);

        Budget budget2 = createBudget(userApp, LocalDate.of(2023, 2, 1), BigDecimal.valueOf(120.0), BigDecimal.valueOf(115.0), BudgetStatus.DRAFT);

        Budget budget3 = createBudget(userApp2, LocalDate.of(2023, 1, 1), BigDecimal.valueOf(1200.0), BigDecimal.valueOf(1150.0), BudgetStatus.DRAFT);

        List<Budget> budgetListExpected = Arrays.asList(budget2, budget1);

        List<Budget> budgetListResult = budgetService.findByUserIdOrderByMonthDesc(userApp.getId());
        Assertions.assertNotNull(budgetListResult);
        Assertions.assertEquals(budgetListExpected.size(), budgetListResult.size());
        Assertions.assertEquals(budgetListExpected.get(0).getId(), budgetListResult.get(0).getId());
        Assertions.assertEquals(budgetListExpected.get(1).getId(), budgetListResult.get(1).getId());

        userDto = buildUserDto("c@c.com", "cc");

        UserApp userApp3 = userService.registerNewUserAccount(userDto);
        budgetListResult = budgetService.findByUserIdOrderByMonthDesc(userApp3.getId());
        Assertions.assertEquals(0, budgetListResult.size());


    }

    @Test
    @Transactional
    void findBudgetByUserIdAndMonth() {
        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Budget budget1 = createBudget(userApp, LocalDate.of(2023, 1, 1), BigDecimal.valueOf(112.0), BigDecimal.valueOf(110.0), BudgetStatus.DRAFT);

        Budget budget2 = createBudget(userApp, LocalDate.of(2023, 2, 1), BigDecimal.valueOf(120.0), BigDecimal.valueOf(115.0), BudgetStatus.DRAFT);

        List<Budget> budgetListExpected = Arrays.asList(budget2);
        List<Budget> budgetListResult = budgetService.findByUserIdAndMonth(userApp.getId(), LocalDate.of(2023, 2, 1));
        Assertions.assertNotNull(budgetListResult);
        Assertions.assertEquals(budgetListExpected.size(), budgetListResult.size());
        Assertions.assertEquals(budgetListExpected.get(0).getId(), budgetListResult.get(0).getId());
    }

    @Test
    void deleteBudget() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Budget budget = Budget.builder()
                .user(userApp)
                .month(LocalDate.of(2023, 1, 1))
                .totalIncome(BigDecimal.valueOf(0.0))
                .totalExpense(BigDecimal.valueOf(0.0))
                .status(BudgetStatus.DRAFT)
                .build();


        Budget budgetResult = budgetService.save(budget);

        Assertions.assertNotNull(budgetResult);
        Assertions.assertEquals(BudgetStatus.DRAFT, budgetResult.getStatus());
        Assertions.assertEquals(userApp, budgetResult.getUser());
        Assertions.assertEquals(BigDecimal.valueOf(0.00).setScale(2), budgetResult.getTotalIncome());
        Assertions.assertEquals(BigDecimal.valueOf(0.00).setScale(2), budgetResult.getTotalExpense());


        budgetService.deleteBudget(userApp.getId(), budgetResult.getId());
        Optional<Budget> budgetOptional = budgetService.findBudget(userApp.getId(), budgetResult.getId());
        Assertions.assertFalse(budgetOptional.isPresent());
    }

    @Test
    void addCategoryToBudget() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category category = new Category();
        category.setName("Food");
        category.setDescription("Food");
        category.setType(CategoryType.EXPENSES);
        category.setDisabled(false);
        category.setUserId(userApp.getId());

        Category categoryResult = categoryService.save(category);
        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult, categoryResult.getType(), BigDecimal.valueOf(6000), "food from shop");
        BudgetCategory budgetCategoryResult = budgetService.saveBudgetCategory(budgetCategory.getBudget().getId(), budgetCategory);
        budgetResult = budgetService.updateBudgetTotals(budgetResult.getId());

        Assertions.assertTrue(budgetService.isBudgetCategoryExisted(userApp.getId(), budgetResult.getId(), categoryResult.getId()));
        Assertions.assertFalse(budgetService.isBudgetCategoryExisted(userApp.getId(), budgetResult.getId(), UUID.randomUUID()));
        Assertions.assertEquals(BigDecimal.valueOf(6000).setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.EXPENSES));
        Assertions.assertEquals(BigDecimal.ZERO.setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.INCOME));
        Assertions.assertEquals(BigDecimal.ZERO.setScale(2), budgetResult.getTotalIncome());
        Assertions.assertEquals(BigDecimal.valueOf(6000).setScale(2), budgetResult.getTotalExpense());
    }

    @Test
    void editCategoryInBudget() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category category = new Category();
        category.setName("Food");
        category.setDescription("Food");
        category.setType(CategoryType.EXPENSES);
        category.setDisabled(false);
        category.setUserId(userApp.getId());

        Category categoryResult = categoryService.save(category);
        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult, categoryResult.getType(), BigDecimal.valueOf(6000), "food from shop");
        BudgetCategory budgetCategoryResult = budgetService.saveBudgetCategory(budgetCategory.getBudget().getId(), budgetCategory);
        budgetResult = budgetService.updateBudgetTotals(budgetResult.getId());

        Category category2 = new Category();
        category2.setName("Alcohol");
        category2.setDescription("Alcohol");
        category2.setType(CategoryType.EXPENSES);
        category2.setDisabled(false);
        category2.setUserId(userApp.getId());
        Category categoryResult2 = categoryService.save(category2);

        budgetCategoryResult.setCategory(category2);
        budgetCategoryResult.setAmount(BigDecimal.valueOf(4000).setScale(2));
        budgetCategoryResult.setComment("No alcohol no party");
        budgetCategoryResult = budgetService.saveBudgetCategory(budgetCategoryResult.getBudget().getId(), budgetCategoryResult);
        budgetResult = budgetService.updateBudgetTotals(budgetResult.getId());

        Assertions.assertTrue(budgetService.isBudgetCategoryExisted(userApp.getId(), budgetResult.getId(), categoryResult2.getId()));
        Assertions.assertFalse(budgetService.isBudgetCategoryExisted(userApp.getId(), budgetResult.getId(), categoryResult.getId()));
        Assertions.assertEquals(1, budgetService.findBudgetCategories(budgetResult.getId(), CategoryType.EXPENSES).size());
        Assertions.assertEquals(BigDecimal.valueOf(4000).setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.EXPENSES));
        Assertions.assertEquals(BigDecimal.ZERO.setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.INCOME));
        Assertions.assertEquals(BigDecimal.ZERO.setScale(2), budgetResult.getTotalIncome());
        Assertions.assertEquals(BigDecimal.valueOf(4000).setScale(2), budgetResult.getTotalExpense());
        Assertions.assertEquals(BigDecimal.valueOf(4000).setScale(2), budgetCategoryResult.getAmount());
        Assertions.assertEquals("No alcohol no party", budgetCategoryResult.getComment());
        Assertions.assertEquals(category2, budgetCategoryResult.getCategory());
    }

    @Test
    void findBudgetCategories_getCategoriesUsedInBudget() {
        UserApp userApp = createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category categoryRoot = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category categoryRootResult = categoryService.save(categoryRoot);

        Category category2 = TestUtilities.createCategory(categoryService, userApp, "Beer", CategoryType.EXPENSES, "Beer", categoryRootResult.getId(), false);
        Category categoryResult2 = categoryService.save(category2);

        Category categoryRoot2 = TestUtilities.createCategory(categoryService, userApp, "Clothes", CategoryType.EXPENSES, "Clothes", null, false);
        Category categoryRootResult2 = categoryService.save(categoryRoot2);

        Category categoryIncome = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);
        Category categoryIncomeResult = categoryService.save(categoryIncome);

        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult2, CategoryType.EXPENSES, BigDecimal.valueOf(1000).setScale(2), "Beer");
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory);

        BudgetCategory budgetCategory2 = new BudgetCategory(budgetResult, categoryRootResult2, CategoryType.EXPENSES, BigDecimal.valueOf(5000).setScale(2), "Clothes");
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory2);

        BudgetCategory budgetCategory3 = new BudgetCategory(budgetResult, categoryIncomeResult, CategoryType.INCOME, BigDecimal.valueOf(100000).setScale(2), "Salary");
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory3);

        Assertions.assertEquals(2, budgetService.findBudgetCategories(budgetResult.getId(), CategoryType.EXPENSES).size());
        Assertions.assertEquals(1, budgetService.findBudgetCategories(budgetResult.getId(), CategoryType.INCOME).size());

        Assertions.assertEquals(BigDecimal.valueOf(6000).setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.EXPENSES));
        Assertions.assertEquals(BigDecimal.valueOf(100000).setScale(2), budgetService.calculateBudgetTotal(budgetResult.getId(), CategoryType.INCOME));
    }

    @Test
    void findBudgetCategoriesToChooseFrom_getCategoriesUnusedInBudget() {
        UserApp userApp = createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category categoryRoot = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category categoryRootResult = categoryService.save(categoryRoot);

        Category category2 = TestUtilities.createCategory(categoryService, userApp, "Beer", CategoryType.EXPENSES, "Beer", categoryRootResult.getId(), false);
        Category categoryResult2 = categoryService.save(category2);

        Category category3 = TestUtilities.createCategory(categoryService, userApp, "Milk", CategoryType.EXPENSES, "Milk", categoryRootResult.getId(), false);
        Category categoryResult3 = categoryService.save(category3);

        Category categoryRoot2 = TestUtilities.createCategory(categoryService, userApp, "Clothes", CategoryType.EXPENSES, "Clothes", null, false);
        Category categoryRootResult2 = categoryService.save(categoryRoot2);

        Category categoryRoot3 = TestUtilities.createCategory(categoryService, userApp, "Utilities", CategoryType.EXPENSES, "Utilities", null, false);
        Category categoryRootResult3 = categoryService.save(categoryRoot3);

        Category categoryIncome = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);
        Category categoryIncomeResult = categoryService.save(categoryIncome);

        List<Category> categoriesUnusedInBudget = budgetService.findCategoriesUnusedInBudget(userApp.getId(), budgetResult.getId(), CategoryType.EXPENSES);
        Assertions.assertEquals(5, categoriesUnusedInBudget.size());

        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult2, CategoryType.EXPENSES, BigDecimal.valueOf(1000).setScale(2), "Beer");
        BudgetCategory budgetCategory2 = new BudgetCategory(budgetResult, categoryRootResult2, CategoryType.EXPENSES, BigDecimal.valueOf(5000).setScale(2), "Clothes");
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory);
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory2);
        categoriesUnusedInBudget = budgetService.findCategoriesUnusedInBudget(userApp.getId(), budgetResult.getId(), CategoryType.EXPENSES);
        Assertions.assertEquals(3, categoriesUnusedInBudget.size());
        Assertions.assertFalse(categoriesUnusedInBudget.contains(categoryResult2));
        Assertions.assertFalse(categoriesUnusedInBudget.contains(categoryRootResult2));

        BudgetCategory budgetCategory3 = new BudgetCategory(budgetResult, categoryResult3, CategoryType.EXPENSES, BigDecimal.valueOf(500).setScale(2), "Milk");
        budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory3);
        categoriesUnusedInBudget = budgetService.findCategoriesUnusedInBudget(userApp.getId(), budgetResult.getId(), CategoryType.EXPENSES);
        Assertions.assertEquals(2, categoriesUnusedInBudget.size());
        Assertions.assertFalse(categoriesUnusedInBudget.contains(categoryResult3));
    }

    @Test
    void shouldFindBudgetCategoryByUserIdAndCategoryAndMonth() {
        UserApp userApp = createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category categoryRoot = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category categoryRootResult = categoryService.save(categoryRoot);

        Category category2 = TestUtilities.createCategory(categoryService, userApp, "Beer", CategoryType.EXPENSES, "Beer", categoryRootResult.getId(), false);
        Category categoryResult2 = categoryService.save(category2);

        Category category3 = TestUtilities.createCategory(categoryService, userApp, "Milk", CategoryType.EXPENSES, "Milk", categoryRootResult.getId(), false);
        Category categoryResult3 = categoryService.save(category3);


        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult2, CategoryType.EXPENSES, BigDecimal.valueOf(1000).setScale(2), "Beer");
        budgetCategory = budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory);

        BudgetCategory budgetCategory3 = new BudgetCategory(budgetResult, categoryResult3, CategoryType.EXPENSES, BigDecimal.valueOf(500).setScale(2), "Milk");
        budgetCategory3 = budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory3);

        Optional<BudgetCategory> maybeBudgetCategory = budgetService.getBudgetCategoryByUserIdAndCategoryAndMonth(userApp.getId(), category3, LocalDate.of(2023, 1, 1));
        Assertions.assertTrue(maybeBudgetCategory.isPresent());
        Assertions.assertEquals(budgetCategory3.getCategory(), maybeBudgetCategory.get().getCategory());
        Assertions.assertEquals(budgetCategory3.getBudget().getId(), maybeBudgetCategory.get().getBudget().getId());
    }

    @Test
    void shouldExposeFactOnlyCategoryInBudgetDetails() {
        UserApp userApp = createUser(userService, "facts@a.com", "facts", STRONG_TEST_PASSWORD);
        Budget budget = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category groceries = TestUtilities.createCategory(categoryService, userApp, "Groceries", CategoryType.EXPENSES, "Groceries", null, false);
        Category taxi = TestUtilities.createCategory(categoryService, userApp, "Taxi", CategoryType.EXPENSES, "Taxi", null, false);

        BudgetCategory plannedCategory = new BudgetCategory(budget, groceries, CategoryType.EXPENSES, new BigDecimal("400.00"), "Groceries plan");
        budgetService.saveBudgetCategory(budget.getId(), plannedCategory);

        Account account = TestUtilities.createAccount(accountService, "wallet", AccountType.CASH, userApp);

        TestUtilities.createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 1, 5, 9, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                groceries,
                account,
                TransactionDirection.DECREASE,
                new BigDecimal("150.00"),
                "Food");

        TestUtilities.createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 1, 12, 18, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                taxi,
                account,
                TransactionDirection.DECREASE,
                new BigDecimal("80.50"),
                "Taxi");

        Budget refreshedBudget = budgetService.findBudget(userApp.getId(), budget.getId()).orElseThrow();
        BudgetDetailedDto detailedDto = budgetDetailedMapper.toDto(refreshedBudget, budgetService, transactionService, categoryService, categoryMapper);

        List<BudgetCategoryDetailedDto> expenseBudgetCategories = detailedDto.getExpenseBudgetCategories();
        Assertions.assertEquals(2, expenseBudgetCategories.size());

        BudgetCategoryDetailedDto groceriesDto = expenseBudgetCategories.stream()
                .filter(dto -> dto.getCategory().getId().equals(groceries.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(new BigDecimal("400.00"), groceriesDto.getPlanAmount());
        Assertions.assertEquals(new BigDecimal("150.00"), groceriesDto.getFactAmount());
        Assertions.assertEquals(new BigDecimal("250.00"), groceriesDto.getLeftover());

        BudgetCategoryDetailedDto taxiDto = expenseBudgetCategories.stream()
                .filter(dto -> dto.getCategory().getId().equals(taxi.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(new BigDecimal("0.00"), taxiDto.getPlanAmount());
        Assertions.assertEquals(new BigDecimal("80.50"), taxiDto.getFactAmount());
        Assertions.assertEquals(new BigDecimal("-80.50"), taxiDto.getLeftover());
    }

    @Test
    void shouldExcludeTransfersFromBudgetFacts() {
        UserApp userApp = createUser(userService, "budget-transfer@a.com", "bt", STRONG_TEST_PASSWORD);
        Budget budget = createBudget(userApp, LocalDate.of(2023, 3, 1), BudgetStatus.DRAFT);

        Category expenseCategory = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category incomeCategory = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);

        BudgetCategory expensePlan = BudgetCategory.builder()
                .budget(budget)
                .category(expenseCategory)
                .type(CategoryType.EXPENSES)
                .amount(new BigDecimal("500.00"))
                .currency(userApp.getBaseCurrency())
                .comment("Food plan")
                .build();
        budgetService.saveBudgetCategory(budget.getId(), expensePlan);

        BudgetCategory incomePlan = BudgetCategory.builder()
                .budget(budget)
                .category(incomeCategory)
                .type(CategoryType.INCOME)
                .amount(new BigDecimal("1000.00"))
                .currency(userApp.getBaseCurrency())
                .comment("Salary plan")
                .build();
        budgetService.saveBudgetCategory(budget.getId(), incomePlan);

        Account checking = TestUtilities.createAccount(accountService, "checking", AccountType.CASH, userApp);
        Account savings = TestUtilities.createAccount(accountService, "savings", AccountType.BANK_ACCOUNT, userApp);

        TestUtilities.createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 3, 5, 10, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                expenseCategory,
                checking,
                TransactionDirection.DECREASE,
                new BigDecimal("150.00"),
                "Groceries");

        TestUtilities.createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 3, 6, 9, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.INCOME,
                incomeCategory,
                checking,
                TransactionDirection.INCREASE,
                new BigDecimal("900.00"),
                "Salary");

        TestUtilities.createTransfer(transferService, userApp, checking, savings,
                LocalDateTime.of(2023, 3, 10, 12, 0).toEpochSecond(ZoneOffset.UTC),
                new BigDecimal("400.00"),
                "Move to savings");

        Budget refreshedBudget = budgetService.findBudget(userApp.getId(), budget.getId()).orElseThrow();
        BudgetDetailedDto detailedDto = budgetDetailedMapper.toDto(refreshedBudget, budgetService, transactionService, categoryService, categoryMapper);

        BudgetCategoryDetailedDto expenseDto = detailedDto.getExpenseBudgetCategories().stream()
                .filter(dto -> dto.getCategory().getId().equals(expenseCategory.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(new BigDecimal("500.00"), expenseDto.getPlanAmount());
        Assertions.assertEquals(new BigDecimal("150.00"), expenseDto.getFactAmount());
        Assertions.assertEquals(new BigDecimal("350.00"), expenseDto.getLeftover());

        BudgetCategoryDetailedDto incomeDto = detailedDto.getIncomeBudgetCategories().stream()
                .filter(dto -> dto.getCategory().getId().equals(incomeCategory.getId()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(new BigDecimal("1000.00"), incomeDto.getPlanAmount());
        Assertions.assertEquals(new BigDecimal("900.00"), incomeDto.getFactAmount());
        Assertions.assertEquals(new BigDecimal("100.00"), incomeDto.getLeftover());

        Assertions.assertEquals(1, detailedDto.getExpenseBudgetCategories().size());
        Assertions.assertEquals(1, detailedDto.getIncomeBudgetCategories().size());
        Assertions.assertEquals(new BigDecimal("150.00"), detailedDto.getTotalExpenseFact());
        Assertions.assertEquals(new BigDecimal("900.00"), detailedDto.getTotalIncomeFact());
    }

    @Test
    void shouldCreateNewBudgetIdenticalToSourceBudget() {

        UserApp userApp = createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Budget budgetResult = createBudget(userApp, LocalDate.of(2023, 1, 1), BudgetStatus.DRAFT);

        Category categoryRoot = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category categoryRootResult = categoryService.save(categoryRoot);

        Category category2 = TestUtilities.createCategory(categoryService, userApp, "Beer", CategoryType.EXPENSES, "Beer", categoryRootResult.getId(), false);
        Category categoryResult2 = categoryService.save(category2);

        Category category3 = TestUtilities.createCategory(categoryService, userApp, "Milk", CategoryType.EXPENSES, "Milk", categoryRootResult.getId(), false);
        Category categoryResult3 = categoryService.save(category3);

        Category categoryRoot2 = TestUtilities.createCategory(categoryService, userApp, "Clothes", CategoryType.EXPENSES, "Clothes", null, false);
        Category categoryRootResult2 = categoryService.save(categoryRoot2);

        Category categoryRoot3 = TestUtilities.createCategory(categoryService, userApp, "Utilities", CategoryType.EXPENSES, "Utilities", null, false);
        Category categoryRootResult3 = categoryService.save(categoryRoot3);

        Category categoryIncome = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);
        Category categoryIncomeResult = categoryService.save(categoryIncome);

        BudgetCategory budgetCategory = new BudgetCategory(budgetResult, categoryResult2, CategoryType.EXPENSES, BigDecimal.valueOf(1000).setScale(2), "Beer");
        BudgetCategory budgetCategory2 = new BudgetCategory(budgetResult, categoryRootResult2, CategoryType.EXPENSES, BigDecimal.valueOf(5000).setScale(2), "Clothes");
        // BudgetCategory budgetCategoryResult = budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory);
        budgetResult.addBudgetCategory(budgetCategory);
        //  BudgetCategory budgetCategoryResult2 = budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory2);
        budgetResult.addBudgetCategory(budgetCategory2);
        BudgetCategory budgetCategory3 = new BudgetCategory(budgetResult, categoryResult3, CategoryType.EXPENSES, BigDecimal.valueOf(500).setScale(2), "Milk");
        //  BudgetCategory budgetCategoryResult3 = budgetService.saveBudgetCategory(budgetResult.getId(), budgetCategory3);
        budgetResult.addBudgetCategory(budgetCategory3);
        budgetResult = budgetService.save(budgetResult);
        // budgetResult = budgetService.findBudgetAdmin(budgetResult.getId()).get();
        Budget copyBudget = budgetService.cloneBudget(userApp.getId(), budgetResult.getId(), LocalDate.of(2023, 2, 1));

        Assertions.assertEquals(budgetResult.getStatus(), copyBudget.getStatus());
        Assertions.assertEquals(copyBudget.getMonth(), LocalDate.of(2023, 2, 1));
        Assertions.assertEquals(budgetResult.getTotalExpense(), copyBudget.getTotalExpense());
        Assertions.assertEquals(budgetResult.getTotalIncome(), copyBudget.getTotalIncome());
        Assertions.assertEquals(budgetResult.getUser(), copyBudget.getUser());
        Assertions.assertNotEquals(budgetResult.getId(), copyBudget.getId());

        Assertions.assertEquals(budgetResult.getBudgetCategory().size(), copyBudget.getBudgetCategory().size());

        for (int i = 0; i < budgetResult.getBudgetCategory().size(); i++) {
            Assertions.assertEquals(copyBudget.getBudgetCategory().get(i).getBudget(), copyBudget);
            Assertions.assertEquals(copyBudget.getBudgetCategory().get(i).getCategory(), budgetResult.getBudgetCategory().get(i).getCategory());
            Assertions.assertEquals(copyBudget.getBudgetCategory().get(i).getAmount(), budgetResult.getBudgetCategory().get(i).getAmount());
            Assertions.assertEquals(copyBudget.getBudgetCategory().get(i).getComment(), budgetResult.getBudgetCategory().get(i).getComment());
            Assertions.assertNotEquals(copyBudget.getBudgetCategory().get(i).getId(), budgetResult.getBudgetCategory().get(i).getId());
            Assertions.assertEquals(copyBudget.getBudgetCategory().get(i).getType(), budgetResult.getBudgetCategory().get(i).getType());
        }
    }

    @Test
    void calculateBudgetTotalConvertsForeignCurrency() {
        UserDto userDto = buildUserDto("fx@test.com", "fx");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        CurrencyRate rate = CurrencyRate.builder()
                .user(userApp)
                .currency(CurrencyCode.EUR)
                .rateDate(LocalDate.of(2024, 1, 1))
                .rate(new BigDecimal("1.10"))
                .manual(true)
                .source("test")
                .build();
        currencyRateRepository.save(rate);

        Budget budget = createBudget(userApp, LocalDate.of(2024, 1, 1), BudgetStatus.DRAFT);

        Category category = new Category();
        category.setName("Travel");
        category.setDescription("Travel");
        category.setType(CategoryType.EXPENSES);
        category.setDisabled(false);
        category.setUserId(userApp.getId());
        Category savedCategory = categoryService.save(category);

        BudgetCategory budgetCategory = BudgetCategory.builder()
                .budget(budget)
                .category(savedCategory)
                .type(CategoryType.EXPENSES)
                .amount(new BigDecimal("100"))
                .currency(CurrencyCode.EUR)
                .comment("Trip")
                .build();
        budgetService.saveBudgetCategory(budget.getId(), budgetCategory);

        BigDecimal total = budgetService.calculateBudgetTotal(budget.getId(), CategoryType.EXPENSES);

        Assertions.assertEquals(new BigDecimal("110.00"), total);
    }

    private UserDto buildUserDto(String email, String name) {
        UserDto userDto = new UserDto();
        userDto.setEmail(email);
        userDto.setName(name);
        userDto.setPassword(STRONG_TEST_PASSWORD);
        userDto.setMatchingPassword(STRONG_TEST_PASSWORD);
        return userDto;
    }
}
