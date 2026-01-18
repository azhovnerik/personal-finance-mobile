package com.example.personalFinance.dto;

import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import jakarta.validation.constraints.DecimalMin;
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
public class BudgetCategoryDto implements Serializable {


    private UUID id;

    @NotNull
    private UUID budgetId;

    @NotNull
    private Category category;

    @NotNull
    private CategoryType type;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private String comment;

    private CurrencyCode currency;

    public BudgetCategoryDto() {

    }
}
