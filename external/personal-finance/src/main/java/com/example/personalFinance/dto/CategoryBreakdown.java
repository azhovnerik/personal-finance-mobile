package com.example.personalFinance.dto;

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
public class CategoryBreakdown {

    private UUID categoryId;

    private String name;

    private String icon;

    private BigDecimal amount;
}
