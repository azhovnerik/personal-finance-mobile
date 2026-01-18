package com.example.personalFinance.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class CategoryMonthlyExpenseReport {

    @Builder.Default
    private List<YearMonth> months = List.of();

    @Builder.Default
    private List<CategoryMonthlyExpenseRow> rows = List.of();

    @Builder.Default
    private Map<YearMonth, BigDecimal> totalsByMonth = Collections.emptyMap();

    @Builder.Default
    private BigDecimal grandTotal = BigDecimal.ZERO;

    public Map<YearMonth, BigDecimal> getTotalsByMonth() {
        return totalsByMonth == null ? Collections.emptyMap() : Collections.unmodifiableMap(totalsByMonth);
    }

    public List<CategoryMonthlyExpenseRow> getRows() {
        return rows == null ? List.of() : rows;
    }

    public List<YearMonth> getMonths() {
        return months == null ? List.of() : months;
    }
}
