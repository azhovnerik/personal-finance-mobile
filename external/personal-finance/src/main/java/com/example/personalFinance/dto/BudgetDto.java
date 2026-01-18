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
import java.util.UUID;


@ToString
@Getter
@Setter
public class BudgetDto implements Serializable {

    private UUID id;

    @NotNull
    @NotEmpty
    private String month;

    private BigDecimal totalIncome;

    private BigDecimal totalExpense;

    private UserApp user;

    private CurrencyCode baseCurrency;

    public BudgetDto() {

    }

    public BudgetDto(String month, BigDecimal totalIncome, BigDecimal totalExpense) {
        this.month = month;
        this.totalIncome = totalIncome;
        this.totalExpense = totalExpense;
    }

    public BudgetDto(String month, BigDecimal totalIncome, BigDecimal totalExpense, UserApp user) {
        this.month = month;
        this.totalIncome = totalIncome;
        this.totalExpense = totalExpense;
        this.user = user;
    }
}
