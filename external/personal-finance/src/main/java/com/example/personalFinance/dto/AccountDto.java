package com.example.personalFinance.dto;

import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.validator.EnumNamePattern;
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
public class AccountDto implements Serializable {

    private UUID id;

    private UUID userId;

    @NotNull
    @NotEmpty
    private String name;

    private String description;

    @EnumNamePattern
    private AccountType type;

    private BigDecimal balance;

    private BigDecimal balanceInBase;

    private CurrencyCode currency;

    public AccountDto() {

    }
}
