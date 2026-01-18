package com.example.personalFinance.service.Impl;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;
import static com.example.personalFinance.service.Impl.TestUtilities.createCategory;
import static com.example.personalFinance.service.Impl.TestUtilities.createTransaction;


@IntegrationTest
class AccountServiceImplTest extends IntegrationTestBase {

    @Autowired
    private AccountService accountService;

    @Autowired
    private UserService userService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private ChangeBalanceService changeBalanceService;

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
                "change_balance",
                "account",
                "budget_categories",
                "category",
                "budget",
                "onboarding_state",
                "users");
    }

    @Test
    @DisplayName("should save new account")
    void save() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Account account = new Account();
        account.setName("wallet");
        account.setDescription("wallet");
        account.setType(AccountType.CASH);


        Account accountResult = accountService.save(userApp.getId(), account);


        Assertions.assertNotNull(accountResult);
        Assertions.assertEquals("wallet", accountResult.getName());
        Assertions.assertEquals(userApp.getId(), accountResult.getUserId());
        Assertions.assertEquals("wallet", accountResult.getDescription());
        Assertions.assertFalse(accountResult.getId() == null);
    }

    @Test
    @DisplayName("should save new account")
    void findByUserIdAndNameTest() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Account account = new Account();
        account.setName("wallet");
        account.setDescription("wallet");
        account.setType(AccountType.CASH);

        accountService.save(userApp.getId(), account);
        Optional<Account> accountResult = accountService.findByUserIdAndName(userApp.getId(), "wallet");

        Assertions.assertTrue(accountResult.isPresent());
        Assertions.assertEquals("wallet", accountResult.get().getName());
        Assertions.assertEquals(userApp.getId(), accountResult.get().getUserId());
        Assertions.assertEquals("wallet", accountResult.get().getDescription());
    }

    @Test
    void shouldGetAccountTurnover() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Account account = new Account();
        account.setName("wallet");
        account.setDescription("wallet");
        account.setType(AccountType.CASH);

        Account accountResult = accountService.save(userApp.getId(), account);

        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Transaction transaction = createTransaction(transactionService, userApp, 1000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(1000), "ATB");
        Transaction transactionResult2 = transactionService.save(transaction);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(5000), "ATB");
        Transaction transactionResult3 = transactionService.save(transaction);

        Assertions.assertEquals(BigDecimal.valueOf(1600).setScale(2), accountService.getAccountTurnover(userApp.getId(), account.getId(), TransactionDirection.DECREASE, 2000L));
        Assertions.assertEquals(BigDecimal.ZERO, accountService.getAccountTurnover(userApp.getId(), account.getId(), TransactionDirection.INCREASE, 2000L));
    }

    @Test
    void shouldGetAccountBalance() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Account account = new Account();
        account.setName("wallet");
        account.setDescription("wallet");
        account.setType(AccountType.CASH);

        Account accountResult = accountService.save(userApp.getId(), account);

        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Category category1 = createCategory(categoryService, userApp, "salary", CategoryType.INCOME, "", null, false);
        Transaction transaction = createTransaction(transactionService, userApp, 1000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(1000), "ATB");
        Transaction transactionResult2 = transactionService.save(transaction);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category1, account, TransactionDirection.INCREASE, BigDecimal.valueOf(5000), "ATB");
        Transaction transactionResult3 = transactionService.save(transaction);

        Assertions.assertEquals(BigDecimal.valueOf(3400).setScale(2), accountService.getAccountBalance(userApp.getId(), account.getId(), 3000L));
    }

    @Test
    void shouldChangeAccountBalance() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Account account = new Account();
        account.setName("wallet");
        account.setDescription("wallet");
        account.setType(AccountType.CASH);

        Account accountResult = accountService.save(userApp.getId(), account);

        Category category = createCategory(categoryService, userApp, "food", CategoryType.EXPENSES, "", null, false);
        Category category1 = createCategory(categoryService, userApp, "salary", CategoryType.INCOME, "", null, false);
        Transaction transaction = createTransaction(transactionService, userApp, 1000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(600), "ATB");
        Transaction transactionResult = transactionService.save(transaction);

        Transaction transaction2 = createTransaction(transactionService, userApp, 2000L, TransactionType.EXPENSE, category, account, TransactionDirection.DECREASE, BigDecimal.valueOf(1000), "ATB");
        Transaction transactionResult2 = transactionService.save(transaction);

        Transaction transaction3 = createTransaction(transactionService, userApp, 3000L, TransactionType.EXPENSE, category1, account, TransactionDirection.INCREASE, BigDecimal.valueOf(5000), "ATB");
        Transaction transactionResult3 = transactionService.save(transaction);

        Assertions.assertEquals(BigDecimal.valueOf(3400).setScale(2), accountService.getAccountBalance(userApp.getId(), account.getId(), 3000L));

        Assertions.assertTrue(accountService.createChangeBalance(userApp.getId(), account.getId(), BigDecimal.valueOf(10000), 3000L));
        Assertions.assertEquals(BigDecimal.valueOf(10000).setScale(2), accountService.getAccountBalance(userApp.getId(), account.getId(), 3000L));
        Assertions.assertEquals(BigDecimal.valueOf(-1600).setScale(2), accountService.getAccountBalance(userApp.getId(), account.getId(), 2000L));

        Assertions.assertFalse(accountService.createChangeBalance(userApp.getId(), account.getId(), BigDecimal.valueOf(10000), 3500L));

        Assertions.assertTrue(accountService.createChangeBalance(userApp.getId(), account.getId(), BigDecimal.valueOf(-1000), 4000L));
        Assertions.assertEquals(BigDecimal.valueOf(-1000).setScale(2), accountService.getAccountBalance(userApp.getId(), account.getId(), 4000L));

        List<ChangeBalance> changeBalanceList = changeBalanceService.findByUserId(userApp.getId());
        Assertions.assertEquals(2, changeBalanceList.size());
        Assertions.assertEquals(account, changeBalanceList.get(0).getAccount());
        Assertions.assertEquals(BigDecimal.valueOf(10000).setScale(2), changeBalanceList.get(0).getNewBalance());

        Assertions.assertEquals(account, changeBalanceList.get(1).getAccount());
        Assertions.assertEquals(BigDecimal.valueOf(-1000).setScale(2), changeBalanceList.get(1).getNewBalance());
    }

}
