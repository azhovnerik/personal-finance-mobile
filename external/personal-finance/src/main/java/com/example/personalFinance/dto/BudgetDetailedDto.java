package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


@ToString
@Getter
@Setter
public class BudgetDetailedDto implements Serializable {

    @NotNull
    private UUID id;

    @NotNull
    @NotEmpty
    private String month;

    private BigDecimal totalIncome;

    private BigDecimal totalExpense;

    private BigDecimal totalIncomeFact;

    private BigDecimal totalIncomeLeftover;

    private BigDecimal totalExpenseFact;

    private BigDecimal totalExpenseLeftover;

    private UserApp user;

    private CurrencyCode baseCurrency;

    private List<BudgetCategoryDetailedDto> incomeBudgetCategories;

    private List<BudgetCategoryDetailedDto> expenseBudgetCategories;

    private List<CategoryDto> incomeCategories;

    private List<CategoryDto> expenseCategories;

    public BudgetDetailedDto() {

    }

    public BudgetDetailedDto(String month, BigDecimal totalIncome, BigDecimal totalExpense) {
        this.month = month;
        this.totalIncome = totalIncome;
        this.totalExpense = totalExpense;
    }
}
