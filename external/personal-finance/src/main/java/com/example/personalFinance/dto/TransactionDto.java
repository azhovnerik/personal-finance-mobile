package com.example.personalFinance.dto;

import com.example.personalFinance.model.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;


@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Data
public class TransactionDto implements Serializable {

    @EqualsAndHashCode.Include
    private UUID id;

    @NotNull
    @EqualsAndHashCode.Include
    private String date;

    @NotNull
    @EqualsAndHashCode.Include
    private Category category;

    @NotNull
    @EqualsAndHashCode.Include
    private Account account;

    @NotNull
    @EqualsAndHashCode.Include
    private TransactionDirection direction;

    @NotNull
    @EqualsAndHashCode.Include
    private TransactionType type;

    @EqualsAndHashCode.Include
    private UUID changeBalanceId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private BigDecimal amountInBase;

    private CurrencyCode currency;

    private UserApp user;

    private String comment;

    private TransferDto transfer;

    public TransactionDto() {

    }

    public TransactionDto(UserApp userApp, String date, BigDecimal amount, Category category, Account account, String comment) {
        this.user = userApp;
        this.date = date;
        this.amount = amount;
        this.category = category;
        this.account = account;
        this.comment = comment;
    }
}
