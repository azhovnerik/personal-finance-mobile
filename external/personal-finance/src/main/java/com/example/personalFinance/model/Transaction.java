package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "transaction")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private Long date;

    private BigDecimal amount;

    private String comment;

    @ManyToOne(targetEntity = UserApp.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_user"))
    private UserApp user;

    @ManyToOne(targetEntity = Category.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", foreignKey = @ForeignKey(name = "fk_category"))
    private Category category;

    @ManyToOne(targetEntity = Account.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "account_id", foreignKey = @ForeignKey(name = "fk_account"))
    private Account account;

    @ManyToOne(targetEntity = ChangeBalance.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "change_balance_id", foreignKey = @ForeignKey(name = "fk_source_document"))
    private ChangeBalance changeBalance;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    private TransactionDirection direction;

    @Convert(converter = CurrencyCodeAttributeConverter.class)
    private CurrencyCode currency;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transfer_id", foreignKey = @ForeignKey(name = "fk_transfer"))
    private Transfer transfer;

    public Transaction(UserApp userApp, Long date, BigDecimal amount, Category category, Account account, ChangeBalance changeBalance, String comment) {
        this.user = userApp;
        this.date = date;
        this.amount = amount;
        this.category = category;
        this.account = account;
        this.changeBalance = changeBalance;
        this.comment = comment;
        this.currency = account != null ? account.getCurrency() : null;
    }

    public Transaction(UserApp userApp, Long date, BigDecimal amount, Account account, ChangeBalance changeBalance, TransactionType type, TransactionDirection direction, String comment) {
        this.user = userApp;
        this.date = date;
        this.amount = amount;
        this.account = account;
        this.changeBalance = changeBalance;
        this.type = type;
        this.direction = direction;
        this.comment = comment;
        this.currency = account != null ? account.getCurrency() : null;
    }
}
