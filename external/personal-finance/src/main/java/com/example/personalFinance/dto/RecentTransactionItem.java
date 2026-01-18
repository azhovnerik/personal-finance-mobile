package com.example.personalFinance.dto;

import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.TransactionDirection;
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
public class RecentTransactionItem {

    private UUID id;

    private String dateLabel;

    private String categoryName;

    private String accountName;

    private BigDecimal amount;

    private TransactionDirection direction;

    private CategoryType categoryType;

    private CurrencyCode currency;

    private BigDecimal amountInBase;
}
