package com.example.personalFinance.dto;

import com.example.personalFinance.model.AccountType;
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
public class AccountSummary {

    private UUID id;

    private String name;

    private AccountType type;

    private BigDecimal balance;

    private BigDecimal balanceInBase;

    private CurrencyCode currency;
}
