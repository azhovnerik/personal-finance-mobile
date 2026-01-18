package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummary {

    private LocalDate startDate;

    private LocalDate endDate;

    private List<AccountSummary> accounts;

    private BigDecimal totalBalance;

    private BigDecimal totalIncome;

    private BigDecimal totalExpenses;

    private List<CategoryBreakdown> expenseBreakdown;

    private List<CategoryBreakdown> incomeBreakdown;

    private List<CategoryBreakdown> topExpenseCategories;

    private List<TrendPoint> expenseTrend;

    private List<TrendPoint> incomeTrend;

    private List<BudgetProgressItem> budgetProgress;

    private List<RecentTransactionItem> recentTransactions;

    private CurrencyCode baseCurrency;
}
