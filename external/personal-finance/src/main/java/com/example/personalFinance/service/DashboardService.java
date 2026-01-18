package com.example.personalFinance.service;

import com.example.personalFinance.dto.AccountDto;
import com.example.personalFinance.dto.AccountSummary;
import com.example.personalFinance.dto.BudgetProgressItem;
import com.example.personalFinance.dto.CategoryBreakdown;
import com.example.personalFinance.dto.DashboardSummary;
import com.example.personalFinance.dto.RecentTransactionItem;
import com.example.personalFinance.dto.TrendPoint;
import com.example.personalFinance.mapper.AccountMapper;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.utils.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter TRANSACTION_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter TREND_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final DateTimeFormatter RECENT_LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);

    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final TransactionService transactionService;
    private final BudgetService budgetService;
    private final UserService userService;
    private final CurrencyConversionService currencyConversionService;

    public DashboardSummary buildSummary(UUID userId, LocalDate startDate, LocalDate endDate) {
        long startEpoch = DateTimeUtils.getStartOfDay(startDate);
        long endEpoch = DateTimeUtils.getEndOfDay(endDate);

        UserApp user = userService.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<AccountSummary> accounts = buildAccountSummaries(userId, user);
        Map<Category, BigDecimal> expenseTotals = transactionService.calculateTotalsByCategoryTypeForPeriod(userId,
                CategoryType.EXPENSES, startEpoch, endEpoch);
        Map<Category, BigDecimal> incomeTotals = transactionService.calculateTotalsByCategoryTypeForPeriod(userId,
                CategoryType.INCOME, startEpoch, endEpoch);

        List<CategoryBreakdown> expenseBreakdown = toBreakdown(expenseTotals);
        List<CategoryBreakdown> incomeBreakdown = toBreakdown(incomeTotals);
        List<CategoryBreakdown> topExpenseCategories = expenseBreakdown.stream()
                .limit(5)
                .collect(Collectors.toList());

        List<TransactionDto> transactionsInPeriod = transactionService.findByUserIdAndPeriod(userId, startEpoch, endEpoch);

        List<TrendPoint> expenseTrend = buildTrend(transactionsInPeriod, CategoryType.EXPENSES, startDate, endDate);
        List<TrendPoint> incomeTrend = buildTrend(transactionsInPeriod, CategoryType.INCOME, startDate, endDate);

        List<BudgetProgressItem> budgetProgress = buildBudgetProgress(userId, startDate, endDate);
        List<RecentTransactionItem> recentTransactions = buildRecentTransactions(userId);

        return DashboardSummary.builder()
                .startDate(startDate)
                .endDate(endDate)
                .accounts(accounts)
                .totalBalance(sumAccountBalances(accounts))
                .totalExpenses(sumBreakdown(expenseBreakdown))
                .totalIncome(sumBreakdown(incomeBreakdown))
                .expenseBreakdown(expenseBreakdown)
                .incomeBreakdown(incomeBreakdown)
                .topExpenseCategories(topExpenseCategories)
                .expenseTrend(expenseTrend)
                .incomeTrend(incomeTrend)
                .budgetProgress(budgetProgress)
                .recentTransactions(recentTransactions)
                .baseCurrency(user.getBaseCurrency())
                .build();
    }

    private List<AccountSummary> buildAccountSummaries(UUID userId, UserApp user) {
        List<Account> accounts = accountService.findByUserId(userId);
        if (accounts.isEmpty()) {
            return List.of();
        }
        List<AccountDto> accountDtos = accountMapper.toDtoList(accounts, accountService, currencyConversionService, userService);
        return accountDtos.stream()
                .map(dto -> AccountSummary.builder()
                        .id(dto.getId())
                        .name(dto.getName())
                        .type(dto.getType())
                        .balance(normalize(dto.getBalance()))
                        .balanceInBase(normalize(dto.getBalanceInBase()))
                        .currency(dto.getCurrency())
                        .build())
                .sorted(Comparator.comparing(AccountSummary::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    private List<CategoryBreakdown> toBreakdown(Map<Category, BigDecimal> totals) {
        if (totals == null || totals.isEmpty()) {
            return List.of();
        }
        return totals.entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .map(entry -> CategoryBreakdown.builder()
                        .categoryId(entry.getKey().getId())
                        .name(entry.getKey().getName())
                        .icon(entry.getKey().getIcon())
                        .amount(normalize(entry.getValue()))
                        .build())
                .sorted(Comparator.comparing(CategoryBreakdown::getAmount, Comparator.reverseOrder())
                        .thenComparing(CategoryBreakdown::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    private List<TrendPoint> buildTrend(List<TransactionDto> transactions, CategoryType type,
                                        LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, BigDecimal> totalsByDay = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            totalsByDay.put(date, BigDecimal.ZERO);
        }

        if (transactions != null) {
            transactions.stream()
                    .filter(transaction -> transaction.getCategory() != null)
                    .filter(transaction -> transaction.getCategory().getType() == type)
                    .forEach(transaction -> {
                        LocalDateTime dateTime = LocalDateTime.parse(transaction.getDate(), TRANSACTION_DATE_FORMATTER);
                        LocalDate date = dateTime.toLocalDate();
                        if (date.isBefore(startDate) || date.isAfter(endDate)) {
                            return;
                        }
                        totalsByDay.merge(date, normalize(transaction.getAmountInBase()), BigDecimal::add);
                    });
        }

        return totalsByDay.entrySet().stream()
                .map(entry -> TrendPoint.builder()
                        .label(entry.getKey().format(TREND_LABEL_FORMATTER))
                        .amount(normalize(entry.getValue()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<BudgetProgressItem> buildBudgetProgress(UUID userId, LocalDate startDate, LocalDate endDate) {
        LocalDate month = startDate.withDayOfMonth(1);
        List<Budget> budgets = budgetService.findByUserIdAndMonth(userId, month);
        if (budgets == null || budgets.isEmpty()) {
            return List.of();
        }
        long startEpoch = DateTimeUtils.getStartOfDay(startDate);
        long endEpoch = DateTimeUtils.getEndOfDay(endDate);

        return budgets.stream()
                .limit(3)
                .map(budget -> buildBudgetProgressItem(userId, startEpoch, endEpoch, budget))
                .collect(Collectors.toList());
    }

    private BudgetProgressItem buildBudgetProgressItem(UUID userId, long startEpoch, long endEpoch, Budget budget) {
        List<BudgetCategory> categories = Optional.ofNullable(budget.getBudgetCategory()).orElse(List.of());
        List<Category> expenseCategories = categories.stream()
                .filter(category -> category.getType() == CategoryType.EXPENSES)
                .map(BudgetCategory::getCategory)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<Category> incomeCategories = categories.stream()
                .filter(category -> category.getType() == CategoryType.INCOME)
                .map(BudgetCategory::getCategory)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        BigDecimal actualExpense = calculateActualForCategories(userId, expenseCategories, startEpoch, endEpoch);
        BigDecimal actualIncome = calculateActualForCategories(userId, incomeCategories, startEpoch, endEpoch);

        BigDecimal plannedExpense = normalize(budget.getTotalExpense());
        BigDecimal plannedIncome = normalize(budget.getTotalIncome());

        return BudgetProgressItem.builder()
                .budgetId(budget.getId())
                .monthLabel(budget.getMonth() != null
                        ? budget.getMonth().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + budget.getMonth().getYear()
                        : "Current")
                .plannedExpense(plannedExpense)
                .actualExpense(actualExpense)
                .plannedIncome(plannedIncome)
                .actualIncome(actualIncome)
                .expenseCompletionPercent(calculatePercent(actualExpense, plannedExpense))
                .incomeCompletionPercent(calculatePercent(actualIncome, plannedIncome))
                .baseCurrency(budget.getBaseCurrency())
                .build();
    }

    private BigDecimal calculateActualForCategories(UUID userId, List<Category> categories, long start, long end) {
        if (categories.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        Map<String, BigDecimal> totals = transactionService.calculateTotalByCategoryListForPeriod(userId, categories, start, end);
        return normalize(sumValues(totals != null ? totals.values() : List.of()));
    }

    private int calculatePercent(BigDecimal actual, BigDecimal planned) {
        if (planned == null || planned.compareTo(BigDecimal.ZERO) <= 0) {
            return actual != null && actual.compareTo(BigDecimal.ZERO) > 0 ? 100 : 0;
        }
        int percent = actual.multiply(BigDecimal.valueOf(100))
                .divide(planned, 0, RoundingMode.HALF_UP)
                .intValue();
        return Math.min(100, Math.max(0, percent));
    }

    private List<RecentTransactionItem> buildRecentTransactions(UUID userId) {
        List<TransactionDto> transactions = transactionService.findByUserId(userId);
        if (transactions == null || transactions.isEmpty()) {
            return List.of();
        }
        return transactions.stream()
                .filter(transaction -> transaction.getCategory() != null && transaction.getAccount() != null)
                .limit(5)
                .map(transaction -> {
                    LocalDateTime dateTime = LocalDateTime.parse(transaction.getDate(), TRANSACTION_DATE_FORMATTER);
                    return RecentTransactionItem.builder()
                            .id(transaction.getId())
                            .dateLabel(dateTime.format(RECENT_LABEL_FORMATTER))
                            .categoryName(transaction.getCategory().getName())
                            .accountName(transaction.getAccount().getName())
                            .amount(normalize(transaction.getAmount()))
                            .amountInBase(normalize(transaction.getAmountInBase()))
                            .currency(transaction.getCurrency())
                            .direction(transaction.getDirection())
                            .categoryType(transaction.getCategory().getType())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private BigDecimal sumAccountBalances(List<AccountSummary> accounts) {
        return normalize(accounts.stream()
                .map(AccountSummary::getBalanceInBase)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private BigDecimal sumBreakdown(List<CategoryBreakdown> breakdown) {
        return normalize(breakdown.stream()
                .map(CategoryBreakdown::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private BigDecimal sumValues(Collection<BigDecimal> values) {
        return values.stream()
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
