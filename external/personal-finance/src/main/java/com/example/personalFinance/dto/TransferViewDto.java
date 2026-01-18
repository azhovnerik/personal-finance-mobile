package com.example.personalFinance.dto;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.CurrencyCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferViewDto {
    private UUID id;
    private Long date;
    private String formattedDate;
    private String comment;
    private Account fromAccount;
    private Account toAccount;
    private BigDecimal amount;
    private CurrencyCode currency;
    private BigDecimal amountInBase;
}
