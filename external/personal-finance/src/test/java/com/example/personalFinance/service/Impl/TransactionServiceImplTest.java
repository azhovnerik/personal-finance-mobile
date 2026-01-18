package com.example.personalFinance.service.Impl;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.mapper.TransactionMapper;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.utils.DateTimeUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.example.personalFinance.service.Impl.TestUtilities.*;


@IntegrationTest
class TransactionServiceImplTest extends IntegrationTestBase {

    @Autowired
    private UserService userService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionMapper transactionMapper;

    @Autowired
    private TransferService transferService;

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
                "transaction",
                "transfer",
                "budget_categories",
                "category",
                "budget",
                "account",
                "onboarding_state",
                "users");
    }

    @Test
    @DisplayName("should save new transaction")
    void save() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Assertions.assertNotNull(transactionResult);
        Assertions.assertEquals(dateTime, transactionResult.getDate());
        Assertions.assertEquals(userApp, transactionResult.getUser());
        Assertions.assertEquals(account, transactionResult.getAccount());
        Assertions.assertEquals(category, transactionResult.getCategory());
        Assertions.assertEquals(BigDecimal.valueOf(600), transactionResult.getAmount());
        Assertions.assertEquals("ATB", transactionResult.getComment());
    }

    @Test
    @DisplayName("shouldn't find transaction by wrong id")
    void shouldntFindTransactionByWrongId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Optional<TransactionDto> transactionFounded = transactionService.findById(UUID.randomUUID());

        Assertions.assertEquals(Optional.empty(), transactionFounded);
    }

    @Test
    @DisplayName("should find transaction by id")
    void shouldFindTransactionById() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 10000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Optional<TransactionDto> transactionFounded = transactionService.findById(transactionResult.getId());

        Assertions.assertNotEquals(Optional.empty(), transactionFounded);
        Assertions.assertEquals(transactionResult, transactionMapper.toModel(transactionFounded.get()));
    }

    @Test
    @DisplayName("shouldn't find transactions for wrong userid")
    void shouldntFindTransactionsByWrongUserid() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserId(UUID.randomUUID());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(0, transactions.size());
    }

    @Test
    @DisplayName("should find transactions by userid")
    void shouldFindTransactionsByUserid() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = -10800L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserId(userApp.getId());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(1, transactions.size());
        Assertions.assertEquals(account, transactions.get(0).getAccount());
        Assertions.assertEquals(category, transactions.get(0).getCategory());
        Assertions.assertEquals(BigDecimal.valueOf(600).setScale(2), transactions.get(0).getAmount());
        Assertions.assertEquals(dateTime, transactionMapper.toModel(transactions.get(0)).getDate());
    }

    @Test
    @DisplayName("should find transactions by userid in case transaction's date in period")
    void shouldFindTransactionsByUseridInPeriod() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = -10800L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserIdAndPeriod(userApp.getId(), -10800L, 2000L);

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(1, transactions.size());
        Assertions.assertEquals(account, transactions.get(0).getAccount());
        Assertions.assertEquals(category, transactions.get(0).getCategory());
        Assertions.assertEquals(BigDecimal.valueOf(600).setScale(2), transactions.get(0).getAmount());
        Assertions.assertEquals(dateTime, transactionMapper.toModel(transactions.get(0)).getDate());
    }

    @Test
    @DisplayName("should paginate transactions by period")
    void shouldPaginateTransactionsByPeriod() {

        UserApp userApp = createUser(userService, "pagination@a.com", "pagination", STRONG_TEST_PASSWORD);
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);

        LocalDate periodStart = LocalDate.of(2023, 1, 1);
        LocalDate periodEnd = periodStart.plusDays(10);

        Long firstDate = DateTimeUtils.getStartOfDay(periodStart.plusDays(1));
        Long secondDate = DateTimeUtils.getStartOfDay(periodStart.plusDays(2));
        Long thirdDate = DateTimeUtils.getStartOfDay(periodStart.plusDays(3));

        createTransaction(transactionService, userApp, firstDate, TransactionType.EXPENSE, category, account,
                TransactionDirection.DECREASE, BigDecimal.valueOf(100), "First");
        createTransaction(transactionService, userApp, secondDate, TransactionType.EXPENSE, category, account,
                TransactionDirection.DECREASE, BigDecimal.valueOf(200), "Second");
        createTransaction(transactionService, userApp, thirdDate, TransactionType.EXPENSE, category, account,
                TransactionDirection.DECREASE, BigDecimal.valueOf(300), "Third");

        Long startEpoch = DateTimeUtils.getStartOfDay(periodStart);
        Long endEpoch = DateTimeUtils.getEndOfDay(periodEnd);

        Page<TransactionDto> firstPage = transactionService.findByUserIdAndPeriod(
                userApp.getId(),
                startEpoch,
                endEpoch,
                null,
                null,
                PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "date"))
        );

        Assertions.assertEquals(2, firstPage.getContent().size());
        Assertions.assertEquals(3, firstPage.getTotalElements());
        Assertions.assertEquals(2, firstPage.getTotalPages());
        Assertions.assertTrue(transactionMapper.toModel(firstPage.getContent().get(0)).getDate()
                >= transactionMapper.toModel(firstPage.getContent().get(1)).getDate());

        Page<TransactionDto> secondPage = transactionService.findByUserIdAndPeriod(
                userApp.getId(),
                startEpoch,
                endEpoch,
                null,
                null,
                PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "date"))
        );

        Assertions.assertEquals(1, secondPage.getContent().size());
        Assertions.assertEquals(3, secondPage.getTotalElements());
        Assertions.assertEquals(2, secondPage.getTotalPages());
    }

    @Test
    @DisplayName("shouldnt find transactions by userid in case transaction's category is not equal to given")
    void shouldntFindTransactionsByUseridAndCategoryId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserIdAndCategoryId(userApp.getId(), UUID.randomUUID());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(0, transactions.size());
    }

    @Test
    @DisplayName("should find transactions by userid in case transaction's category is equal to given")
    void shouldFindTransactionsByUseridAndCategoryId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserIdAndCategoryId(userApp.getId(), category.getId());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(1, transactions.size());
        Assertions.assertEquals(transactionMapper.toDto(transactionResult), transactions.get(0));
    }

    @Test
    @DisplayName("shouldnt find transactions by userid in case transaction's account is not equal to given")
    void shouldntFindTransactionsByUseridAndAccountId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserIdAndAccountId(userApp.getId(), UUID.randomUUID());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(0, transactions.size());
    }

    @Test
    @DisplayName("should find transactions by userid in case transaction's account is  equal to given")
    void shouldFindTransactionsByUseridAndAccountId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        List<TransactionDto> transactions = transactionService.findByUserIdAndAccountId(userApp.getId(), account.getId());

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(1, transactions.size());
        Assertions.assertEquals(transactionMapper.toDto(transactionResult), transactions.get(0));
    }

    @Test
    @DisplayName("shouldnt delete transactions by userid and id in case transaction is not found by id")
    void shouldntDeleteTransactionsByUseridAndId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Boolean operationResult = transactionService.delete(userApp.getId(), UUID.randomUUID());

        Optional<TransactionDto> transactions = transactionService.findById(transactionResult.getId());
        Assertions.assertNotEquals(Optional.empty(), transactions);
        Assertions.assertEquals(transactionMapper.toDto(transactionResult), transactions.get());
        Assertions.assertFalse(operationResult);
    }

    @Test
    @DisplayName("should delete transactions by userid and id in case transaction is found by id")
    void shouldDeleteTransactionsByUseridAndId() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Long dateTime = 1000L;
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, dateTime, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Boolean operationResult = transactionService.delete(userApp.getId(), transactionResult.getId());

        Optional<TransactionDto> transactions = transactionService.findById(transactionResult.getId());
        Assertions.assertEquals(Optional.empty(), transactions);
        Assertions.assertTrue(operationResult);
    }

    @Test
    @DisplayName("should calculate total amount By category id and period")
    void shouldCalculateTotalAmountByCategoryIdAndPeriod() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction1 = createTransaction(transactionService, userApp, 1000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult1 = transactionService.save(transaction1);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800).setScale(2), "Metro");
        Transaction transactionResult2 = transactionService.save(transaction2);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800).setScale(2), "Metro");
        Transaction transactionResult3 = transactionService.save(transaction3);

        Category category2 = createCategory(categoryService, userApp, "alchogol", CategoryType.EXPENSES, "", null, false);
        Transaction transaction4 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category2, account, TransactionDirection.DECREASE, BigDecimal.valueOf(1000).setScale(2), "Metro");
        Transaction transactionResult4 = transactionService.save(transaction2);

        BigDecimal total = transactionService.calculateTotalByCategoryForPeriod(userApp.getId(), category, 1000L, 2000L);
        Assertions.assertEquals(BigDecimal.valueOf(1400).setScale(2), total);

        Category category3 = createCategory(categoryService, userApp, "fuel", CategoryType.EXPENSES, "", null, false);

        total = transactionService.calculateTotalByCategoryForPeriod(userApp.getId(), category3, 1000L, 2000L);
        Assertions.assertEquals(BigDecimal.ZERO.setScale(2), total);
    }

    @Test
    @DisplayName("should calculate total amount By category list and period")
    void shouldCalculateTotalAmountByCategoryListAndPeriod() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction1 = createTransaction(transactionService, userApp, 1000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600).setScale(2), "ATB");
        Transaction transactionResult1 = transactionService.save(transaction1);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800).setScale(2), "Metro");
        Transaction transactionResult2 = transactionService.save(transaction2);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800).setScale(2), "Metro");
        Transaction transactionResult3 = transactionService.save(transaction3);

        Category category2 = createCategory(categoryService, userApp, "alchogol", CategoryType.EXPENSES, "", null, false);
        Transaction transaction4 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category2, account, TransactionDirection.DECREASE, BigDecimal.valueOf(1000).setScale(2), "Metro");
        Transaction transactionResult4 = transactionService.save(transaction2);

        Category category3 = createCategory(categoryService, userApp, "fuel", CategoryType.EXPENSES, "", null, false);

        List<Category> categoryList = List.of(category, category2, category3);

        Map<String, BigDecimal> mapTotal = transactionService.calculateTotalByCategoryListForPeriod(userApp.getId(), categoryList, 1000L, 2000L);

        Assertions.assertEquals(2, mapTotal.entrySet().size());
        Assertions.assertEquals(BigDecimal.valueOf(1400).setScale(2), mapTotal.get(category.getName()));
        Assertions.assertEquals(BigDecimal.valueOf(1000).setScale(2), mapTotal.get(category2.getName()));
    }

    @Test
    @DisplayName("should find transactions by userid and categotyId within period")
    void shouldFindTransactionsByUserIdAndCategoryIdInPeriod() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);
        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);
        Transaction transaction = createTransaction(transactionService, userApp, -10800L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800), "Metro");
        Transaction transactionResult2 = transactionService.save(transaction2);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(700), "Varus");
        Transaction transactionResult3 = transactionService.save(transaction3);

        Category category2 = createCategory(categoryService, userApp, "gas", CategoryType.EXPENSES, "", null, false);
        Transaction transaction4 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category2, account, TransactionDirection.DECREASE, BigDecimal.valueOf(800), "OKKO");
        Transaction transactionResult4 = transactionService.save(transaction4);

        List<TransactionDto> transactions = transactionService.findByUserIdAndCategoryIdAndPeriod(userApp.getId(), category, -10800L, 2000L);

        Assertions.assertNotNull(transactions);
        Assertions.assertEquals(2, transactions.size());

        Assertions.assertEquals(account, transactions.get(0).getAccount());
        Assertions.assertEquals(category, transactions.get(0).getCategory());
        Assertions.assertEquals(BigDecimal.valueOf(800).setScale(2), transactions.get(0).getAmount());
        Assertions.assertEquals(2000L, transactionMapper.toModel(transactions.get(0)).getDate());

        Assertions.assertEquals(account, transactions.get(1).getAccount());
        Assertions.assertEquals(category, transactions.get(1).getCategory());
        Assertions.assertEquals(BigDecimal.valueOf(600).setScale(2), transactions.get(1).getAmount());
        Assertions.assertEquals(-10800L, transactionMapper.toModel(transactions.get(1)).getDate());
    }

    @Test
    @DisplayName("should aggregate totals by category type for period")
    void shouldAggregateTotalsByCategoryTypeForPeriod() {

        UserDto userDto = buildUserDto("a@a.com", "aa");

        UserApp userApp = userService.registerNewUserAccount(userDto);

        Category foodCategory = createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);
        Category transportCategory = createCategory(categoryService, userApp, "Transport", CategoryType.EXPENSES, "Transport", null, false);
        Category salaryCategory = createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);

        Account account = createAccount(accountService, "wallet", AccountType.CASH, userApp);

        transactionService.save(createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 1, 5, 12, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                foodCategory,
                account,
                TransactionDirection.DECREASE,
                BigDecimal.valueOf(150.25),
                "Groceries"));

        transactionService.save(createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 1, 15, 8, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.EXPENSE,
                transportCategory,
                account,
                TransactionDirection.DECREASE,
                BigDecimal.valueOf(75.75),
                "Fuel"));

        transactionService.save(createTransaction(transactionService, userApp,
                LocalDateTime.of(2023, 1, 20, 8, 0).toEpochSecond(ZoneOffset.UTC),
                TransactionType.INCOME,
                salaryCategory,
                account,
                TransactionDirection.INCREASE,
                BigDecimal.valueOf(1000),
                "Salary"));

        Map<Category, BigDecimal> totals = transactionService.calculateTotalsByCategoryTypeForPeriod(
                userApp.getId(),
                CategoryType.EXPENSES,
                DateTimeUtils.getStartOfMonth(LocalDate.of(2023, 1, 1)),
                DateTimeUtils.getEndOfMonth(LocalDate.of(2023, 1, 1)));

        Assertions.assertEquals(2, totals.size());
        Assertions.assertTrue(totals.containsKey(foodCategory));
        Assertions.assertTrue(totals.containsKey(transportCategory));
        Assertions.assertEquals(BigDecimal.valueOf(150.25).setScale(2), totals.get(foodCategory));
        Assertions.assertEquals(BigDecimal.valueOf(75.75).setScale(2), totals.get(transportCategory));
        Assertions.assertFalse(totals.containsKey(salaryCategory));
    }

    @Test
    @DisplayName("should exclude transfer transactions from totals")
    void shouldExcludeTransfersFromTotals() {
        UserDto userDto = buildUserDto("transfer-totals@a.com", "tt");
        UserApp userApp = userService.registerNewUserAccount(userDto);

        Category groceries = createCategory(categoryService, userApp, "Groceries", CategoryType.EXPENSES, "", null, false);
        Category salary = createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "", null, false);

        Account checking = createAccount(accountService, "checking", AccountType.CASH, userApp);
        Account savings = createAccount(accountService, "savings", AccountType.BANK_ACCOUNT, userApp);

        Long periodStart = DateTimeUtils.getStartOfMonth(LocalDate.of(2023, 2, 1));
        Long periodEnd = DateTimeUtils.getEndOfMonth(LocalDate.of(2023, 2, 1));

        createTransaction(transactionService, userApp,
                DateTimeUtils.getStartOfDay(LocalDate.of(2023, 2, 5)),
                TransactionType.EXPENSE,
                groceries,
                checking,
                TransactionDirection.DECREASE,
                BigDecimal.valueOf(200),
                "Food");

        createTransaction(transactionService, userApp,
                DateTimeUtils.getStartOfDay(LocalDate.of(2023, 2, 6)),
                TransactionType.INCOME,
                salary,
                checking,
                TransactionDirection.INCREASE,
                BigDecimal.valueOf(800),
                "Salary");

        createTransfer(transferService, userApp, checking, savings,
                DateTimeUtils.getStartOfDay(LocalDate.of(2023, 2, 10)),
                BigDecimal.valueOf(500),
                "Move savings");

        BigDecimal expenseTotal = transactionService.calculateTotalByCategoryForPeriod(userApp.getId(), groceries, periodStart, periodEnd);
        Assertions.assertEquals(BigDecimal.valueOf(200).setScale(2), expenseTotal);

        Map<String, BigDecimal> totalsByList = transactionService.calculateTotalByCategoryListForPeriod(
                userApp.getId(), List.of(groceries), periodStart, periodEnd);
        Assertions.assertEquals(BigDecimal.valueOf(200).setScale(2), totalsByList.get(groceries.getName()));

        Map<Category, BigDecimal> expenseTotals = transactionService.calculateTotalsByCategoryTypeForPeriod(
                userApp.getId(), CategoryType.EXPENSES, periodStart, periodEnd);
        Assertions.assertEquals(BigDecimal.valueOf(200).setScale(2), expenseTotals.get(groceries));

        Map<Category, BigDecimal> incomeTotals = transactionService.calculateTotalsByCategoryTypeForPeriod(
                userApp.getId(), CategoryType.INCOME, periodStart, periodEnd);
        Assertions.assertEquals(BigDecimal.valueOf(800).setScale(2), incomeTotals.get(salary));
        Assertions.assertEquals(1, expenseTotals.size());
        Assertions.assertEquals(1, incomeTotals.size());
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
