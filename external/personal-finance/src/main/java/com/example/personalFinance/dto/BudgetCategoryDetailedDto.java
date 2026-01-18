package com.example.personalFinance.dto;

import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;


@ToString
@Getter
@Setter
@Builder
public class BudgetCategoryDetailedDto implements Serializable {


    private UUID id;

    @NotNull
    private UUID budgetId;

    @NotNull
    private Category category;

    @NotNull
    private CategoryType type;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal planAmount;

    @DecimalMin(value = "0.01")
    private BigDecimal factAmount;

    private BigDecimal leftover;

    private String comment;

    private CurrencyCode currency;

    private BigDecimal planAmountInBase;

    private BigDecimal factAmountInBase;

    private BigDecimal leftoverInBase;

    private BigDecimal planAmountOriginal;

    public BudgetCategoryDetailedDto() {

    }

    public BudgetCategoryDetailedDto(UUID id, UUID budgetId, Category category, CategoryType type, BigDecimal planAmount, BigDecimal factAmount, BigDecimal leftover, String comment,
                                     CurrencyCode currency, BigDecimal planAmountInBase, BigDecimal factAmountInBase,
                                     BigDecimal leftoverInBase, BigDecimal planAmountOriginal) {
        this.id = id;
        this.budgetId = budgetId;
        this.category = category;
        this.type = type;
        this.planAmount = planAmount;
        this.factAmount = factAmount;
        this.leftover = leftover;
        this.comment = comment;
        this.currency = currency;
        this.planAmountInBase = planAmountInBase;
        this.factAmountInBase = factAmountInBase;
        this.leftoverInBase = leftoverInBase;
        this.planAmountOriginal = planAmountOriginal;
    }
}
