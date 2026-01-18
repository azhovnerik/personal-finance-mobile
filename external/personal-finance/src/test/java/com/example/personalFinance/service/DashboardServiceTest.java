package com.example.personalFinance.service;

import com.example.personalFinance.dto.AccountDto;
import com.example.personalFinance.dto.DashboardSummary;
import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.mapper.AccountMapper;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.UserApp;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AccountService accountService;

    @Mock
    private AccountMapper accountMapper;

    @Mock
    private TransactionService transactionService;

    @Mock
    private BudgetService budgetService;

    @Mock
    private UserService userService;

    @Mock
    private CurrencyConversionService currencyConversionService;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void shouldBuildSummaryWithAggregatedData() {
        UUID userId = UUID.randomUUID();
        LocalDate startDate = LocalDate.of(2024, 4, 1);
        LocalDate endDate = LocalDate.of(2024, 4, 3);

        Account account = Account.builder()
                .id(UUID.randomUUID())
                .name("Wallet")
                .type(AccountType.CASH)
                .userId(userId)
                .build();
        List<Account> accounts = List.of(account);
        when(accountService.findByUserId(userId)).thenReturn(accounts);

        AccountDto accountDto = new AccountDto();
        accountDto.setId(account.getId());
        accountDto.setName(account.getName());
        accountDto.setType(AccountType.CASH);
        accountDto.setBalance(new BigDecimal("500.00"));
        accountDto.setBalanceInBase(new BigDecimal("500.00"));
        accountDto.setCurrency(CurrencyCode.USD);
        when(accountMapper.toDtoList(accounts, accountService, currencyConversionService, userService)).thenReturn(List.of(accountDto));

        UserApp user = UserApp.builder()
                .id(userId)
                .email("user@example.com")
                .baseCurrency(CurrencyCode.USD)
                .build();
        when(userService.findById(userId)).thenReturn(Optional.of(user));

        Category groceries = Category.builder()
                .id(UUID.randomUUID())
                .name("Groceries")
                .type(CategoryType.EXPENSES)
                .build();
        Category salary = Category.builder()
                .id(UUID.randomUUID())
                .name("Salary")
                .type(CategoryType.INCOME)
                .build();

        Map<Category, BigDecimal> expenseTotals = new LinkedHashMap<>();
        expenseTotals.put(groceries, new BigDecimal("120.00"));
        Map<Category, BigDecimal> incomeTotals = new LinkedHashMap<>();
        incomeTotals.put(salary, new BigDecimal("400.00"));

        when(transactionService.calculateTotalsByCategoryTypeForPeriod(eq(userId), eq(CategoryType.EXPENSES), anyLong(), anyLong()))
                .thenReturn(expenseTotals);
        when(transactionService.calculateTotalsByCategoryTypeForPeriod(eq(userId), eq(CategoryType.INCOME), anyLong(), anyLong()))
                .thenReturn(incomeTotals);

        TransactionDto expenseTransaction = new TransactionDto();
        expenseTransaction.setId(UUID.randomUUID());
        expenseTransaction.setDate("2024-04-01 10:00:00");
        expenseTransaction.setCategory(groceries);
        expenseTransaction.setAccount(account);
        expenseTransaction.setAmount(new BigDecimal("25.50"));
        expenseTransaction.setAmountInBase(new BigDecimal("25.50"));
        expenseTransaction.setCurrency(CurrencyCode.USD);
        expenseTransaction.setDirection(TransactionDirection.DECREASE);

        TransactionDto incomeTransaction = new TransactionDto();
        incomeTransaction.setId(UUID.randomUUID());
        incomeTransaction.setDate("2024-04-02 09:00:00");
        incomeTransaction.setCategory(salary);
        incomeTransaction.setAccount(account);
        incomeTransaction.setAmount(new BigDecimal("400.00"));
        incomeTransaction.setAmountInBase(new BigDecimal("400.00"));
        incomeTransaction.setCurrency(CurrencyCode.USD);
        incomeTransaction.setDirection(TransactionDirection.INCREASE);

        when(transactionService.findByUserIdAndPeriod(eq(userId), anyLong(), anyLong()))
                .thenReturn(List.of(expenseTransaction, incomeTransaction));

        BudgetCategory expenseBudgetCategory = BudgetCategory.builder()
                .id(UUID.randomUUID())
                .category(groceries)
                .type(CategoryType.EXPENSES)
                .amount(new BigDecimal("200.00"))
                .build();
        BudgetCategory incomeBudgetCategory = BudgetCategory.builder()
                .id(UUID.randomUUID())
                .category(salary)
                .type(CategoryType.INCOME)
                .amount(new BigDecimal("500.00"))
                .build();
        List<BudgetCategory> budgetCategories = new ArrayList<>();
        budgetCategories.add(expenseBudgetCategory);
        budgetCategories.add(incomeBudgetCategory);

        Budget budget = Budget.builder()
                .id(UUID.randomUUID())
                .month(startDate.withDayOfMonth(1))
                .totalExpense(new BigDecimal("200.00"))
                .totalIncome(new BigDecimal("500.00"))
                .budgetCategory(budgetCategories)
                .build();

        when(budgetService.findByUserIdAndMonth(userId, startDate.withDayOfMonth(1)))
                .thenReturn(List.of(budget));

        when(transactionService.calculateTotalByCategoryListForPeriod(eq(userId), anyList(), anyLong(), anyLong()))
                .thenReturn(Map.of("Groceries", new BigDecimal("150.00")))
                .thenReturn(Map.of("Salary", new BigDecimal("400.00")));

        List<TransactionDto> recentTransactions = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            TransactionDto tx = new TransactionDto();
            tx.setId(UUID.randomUUID());
            tx.setDate(String.format("2024-04-%02d 12:00:00", 6 - i));
            tx.setCategory(groceries);
            tx.setAccount(account);
            tx.setAmount(BigDecimal.valueOf(10L + i));
            tx.setDirection(TransactionDirection.DECREASE);
            recentTransactions.add(tx);
        }
        when(transactionService.findByUserId(userId)).thenReturn(recentTransactions);

        DashboardSummary summary = dashboardService.buildSummary(userId, startDate, endDate);

        Assertions.assertEquals(startDate, summary.getStartDate());
        Assertions.assertEquals(endDate, summary.getEndDate());
        Assertions.assertEquals(new BigDecimal("500.00"), summary.getTotalBalance());
        Assertions.assertEquals(new BigDecimal("400.00"), summary.getTotalIncome());
        Assertions.assertEquals(new BigDecimal("120.00"), summary.getTotalExpenses());
        Assertions.assertEquals(1, summary.getAccounts().size());
        Assertions.assertEquals("Groceries", summary.getExpenseBreakdown().get(0).getName());
        Assertions.assertEquals("Salary", summary.getIncomeBreakdown().get(0).getName());
        Assertions.assertEquals(5, summary.getRecentTransactions().size());
        Assertions.assertEquals("Groceries", summary.getRecentTransactions().get(0).getCategoryName());

        Assertions.assertFalse(summary.getBudgetProgress().isEmpty());
        var budgetProgress = summary.getBudgetProgress().get(0);
        Assertions.assertEquals(new BigDecimal("200.00"), budgetProgress.getPlannedExpense());
        Assertions.assertEquals(new BigDecimal("150.00"), budgetProgress.getActualExpense());
        Assertions.assertEquals(75, budgetProgress.getExpenseCompletionPercent());
        Assertions.assertEquals(80, budgetProgress.getIncomeCompletionPercent());

        Assertions.assertEquals(3, summary.getExpenseTrend().size());
        Assertions.assertEquals(3, summary.getIncomeTrend().size());
    }
}
