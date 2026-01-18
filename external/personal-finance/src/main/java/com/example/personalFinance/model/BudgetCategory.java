package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.UUID;

@Entity
@Table(name = "budget_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
//@Transactional
@Builder
public class BudgetCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(targetEntity = Budget.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "budget_id", foreignKey = @ForeignKey(name = "fk_budget"))
    private Budget budget;

    @ManyToOne(targetEntity = Category.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", foreignKey = @ForeignKey(name = "fk_budget_category"))

    @NonNull
    private Category category;

    @Enumerated(EnumType.STRING)
    private CategoryType type;

    private BigDecimal amount;

    private String comment;

    @Convert(converter = CurrencyCodeAttributeConverter.class)
    private CurrencyCode currency;

    public BudgetCategory(Budget budget, Category category, CategoryType type, BigDecimal amount, String comment) {
        this.budget = budget;
        this.category = category;
        this.type = type;
        this.amount = amount;
        this.comment = comment;
        this.currency = budget != null && budget.getUser() != null
                ? budget.getUser().getBaseCurrency()
                : CurrencyCode.USD;
    }

    public BudgetCategory(Budget newBudget, BudgetCategory that) {
        this.budget = newBudget;
        this.type = that.type;
        this.category = that.category;
        this.amount = that.amount;
        this.comment = that.comment;
        this.currency = that.currency;
    }
}
