package com.example.personalFinance.onboarding.dto;

import com.example.personalFinance.model.CurrencyCode;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing account info supplied during onboarding.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountInputDTO {
    private String name;
    /** CASH|DEBIT_CARD|CREDIT_CARD|BANK|OTHER */
    private String type;
    private String description;
    private CurrencyCode currency;
    private BigDecimal initialBalance = BigDecimal.ZERO;
}
