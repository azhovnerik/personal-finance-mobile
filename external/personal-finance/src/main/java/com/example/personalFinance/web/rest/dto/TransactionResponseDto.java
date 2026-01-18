package com.example.personalFinance.web.rest.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransactionResponseDto {
    private String id;
    private String userId;
    private BigDecimal amount;
    private String currency;
    private String category;
    private String description;
    private String occurredAt;
}
