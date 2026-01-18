package com.example.personalFinance.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class CategoryMonthlyExpenseRow {

    private UUID categoryId;

    private String categoryName;

    @Builder.Default
    private Map<YearMonth, BigDecimal> amountsByMonth = new LinkedHashMap<>();

    public void addAmount(YearMonth month, BigDecimal amount) {
        if (month == null || amount == null) {
            return;
        }
        BigDecimal normalized = amount.setScale(2, RoundingMode.HALF_UP);
        amountsByMonth.merge(month, normalized, BigDecimal::add);
    }

    public BigDecimal getTotal() {
        return amountsByMonth.values().stream()
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
