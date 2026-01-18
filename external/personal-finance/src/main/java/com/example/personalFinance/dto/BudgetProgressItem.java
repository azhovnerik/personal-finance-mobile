package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetProgressItem {

    private UUID budgetId;

    private String monthLabel;

    private BigDecimal plannedExpense;

    private BigDecimal actualExpense;

    private BigDecimal plannedIncome;

    private BigDecimal actualIncome;

    private int expenseCompletionPercent;

    private int incomeCompletionPercent;

    private CurrencyCode baseCurrency;
}
