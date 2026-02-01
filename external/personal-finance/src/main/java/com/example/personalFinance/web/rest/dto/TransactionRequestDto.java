package com.example.personalFinance.web.rest.dto;

import com.example.personalFinance.dto.TransferDto;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TransactionRequestDto {
    private String date;
    private String timezone;
    private UUID categoryId;
    private UUID accountId;
    private TransactionDirection direction;
    private TransactionType type;
    private UUID changeBalanceId;
    private BigDecimal amount;
    private BigDecimal amountInBase;
    private CurrencyCode currency;
    private String comment;
    private TransferDto transfer;
}
