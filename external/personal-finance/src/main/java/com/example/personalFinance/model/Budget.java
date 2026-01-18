package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;


import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "budget")
@Data
@NoArgsConstructor
@AllArgsConstructor
//@OptimisticLocking(true)
@Builder
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private LocalDate month;

    private BigDecimal totalIncome;

    private BigDecimal totalExpense;

    @ManyToOne(targetEntity = UserApp.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_user"))
    private UserApp user;

    @Convert(converter = CurrencyCodeAttributeConverter.class)
    private CurrencyCode baseCurrency;

    @Enumerated(EnumType.STRING)
    private BudgetStatus status;

    @ToString.Exclude
    @OneToMany(targetEntity = BudgetCategory.class, mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<BudgetCategory> budgetCategory;

    public Budget(UserApp userApp, LocalDate monthLocalDate, BigDecimal totalIncome, BigDecimal totalExpenses, BudgetStatus budgetStatus) {
        this.user = userApp;
        this.month = monthLocalDate;
        this.totalIncome = totalIncome;
        this.totalExpense = totalExpenses;
        this.status = budgetStatus;
        this.baseCurrency = userApp != null ? userApp.getBaseCurrency() : CurrencyCode.USD;
    }

    public Budget(Budget that, LocalDate newMonth) {
        this.budgetCategory = new ArrayList<BudgetCategory>();
        // add a clone of each budgetCategory item (as an example, if you need "deep cloning")
        for (BudgetCategory item:that.budgetCategory) {
            this.budgetCategory.add(new BudgetCategory(this, item));
        }
        this.totalIncome = that.totalIncome;
        this.totalExpense = that.totalExpense;
        this.month = newMonth;
        this.status = that.status;
        this.user = that.user;
        this.baseCurrency = that.baseCurrency;
    }

    public void addBudgetCategory(BudgetCategory budgetCategoryNew) {
        if (budgetCategory == null) budgetCategory = new ArrayList<>();
        budgetCategoryNew.setBudget(this);
        budgetCategory.add(budgetCategoryNew);
    }

    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
}
