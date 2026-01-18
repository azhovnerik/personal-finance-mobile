package com.example.personalFinance.service;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.dto.report.CategoryMonthlyExpenseReport;
import com.example.personalFinance.dto.report.CategoryMonthlyExpenseRow;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.utils.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryExpenseReportService {

    private static final DateTimeFormatter TRANSACTION_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final TransactionService transactionService;
    private final CategoryService categoryService;

    public CategoryMonthlyExpenseReport buildCategoryMonthlyReport(UUID userId,
                                                                   YearMonth startMonth,
                                                                   YearMonth endMonth,
                                                                   Category rootCategory) {
        validatePeriod(startMonth, endMonth);

        List<YearMonth> months = buildMonthRange(startMonth, endMonth);
        long startEpoch = DateTimeUtils.getStartOfMonth(startMonth.atDay(1));
        long endEpoch = DateTimeUtils.getEndOfMonth(endMonth.atDay(1));

        CategorySelection categorySelection = resolveCategorySelection(rootCategory);

        Map<UUID, CategoryMonthlyExpenseRow> rows = new LinkedHashMap<>();
        List<TransactionDto> transactions = transactionService.findByUserIdAndPeriod(userId, startEpoch, endEpoch);
        for (TransactionDto transaction : transactions) {
            if (!isExpenseTransaction(transaction)) {
                continue;
            }
            Category category = transaction.getCategory();
            if (categorySelection.allowedCategoryIds != null
                    && !categorySelection.allowedCategoryIds.contains(category.getId())) {
                continue;
            }

            YearMonth month = parseMonth(transaction.getDate());
            if (month == null) {
                continue;
            }

            CategoryMonthlyExpenseRow row = rows.computeIfAbsent(category.getId(), id ->
                    CategoryMonthlyExpenseRow.builder()
                            .categoryId(category.getId())
                            .categoryName(category.getName())
                            .amountsByMonth(initializeMonthMap(months))
                            .build());

            BigDecimal amount = normalizeAmount(transaction.getAmountInBase(), transaction.getAmount());
            row.addAmount(month, amount);
        }

        if (!categorySelection.categories.isEmpty()) {
            categorySelection.categories.stream()
                    .filter(category -> category.getType() == CategoryType.EXPENSES)
                    .forEach(category -> rows.computeIfAbsent(category.getId(), id ->
                            CategoryMonthlyExpenseRow.builder()
                                    .categoryId(category.getId())
                                    .categoryName(category.getName())
                                    .amountsByMonth(initializeMonthMap(months))
                                    .build()));
        }

        if (rootCategory != null) {
            CategoryMonthlyExpenseRow rootRow = rows.get(rootCategory.getId());
            if (isZeroRow(rootRow)) {
                rows.remove(rootCategory.getId());
            }
        }

        Map<YearMonth, BigDecimal> totalsByMonth = initializeMonthMap(months);
        rows.values().forEach(row -> months.forEach(month ->
                totalsByMonth.merge(month, row.getAmountsByMonth().getOrDefault(month, BigDecimal.ZERO), BigDecimal::add)));

        BigDecimal grandTotal = totalsByMonth.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        return CategoryMonthlyExpenseReport.builder()
                .months(months)
                .rows(new ArrayList<>(rows.values()))
                .totalsByMonth(totalsByMonth)
                .grandTotal(grandTotal)
                .build();
    }

    private void validatePeriod(YearMonth startMonth, YearMonth endMonth) {
        if (startMonth == null || endMonth == null) {
            throw new IllegalArgumentException("Start and end month are required");
        }
        if (endMonth.isBefore(startMonth)) {
            throw new IllegalArgumentException("End month must be after start month");
        }
    }

    private boolean isExpenseTransaction(TransactionDto transaction) {
        return transaction != null
                && transaction.getCategory() != null
                && transaction.getCategory().getType() == CategoryType.EXPENSES
                && (transaction.getType() == null || transaction.getType() != TransactionType.TRANSFER);
    }

    private List<YearMonth> buildMonthRange(YearMonth startMonth, YearMonth endMonth) {
        List<YearMonth> months = new ArrayList<>();
        for (YearMonth month = startMonth; !month.isAfter(endMonth); month = month.plusMonths(1)) {
            months.add(month);
        }
        return months;
    }

    private YearMonth parseMonth(String date) {
        try {
            LocalDateTime dateTime = LocalDateTime.parse(date, TRANSACTION_DATE_FORMATTER);
            return YearMonth.from(dateTime);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Map<YearMonth, BigDecimal> initializeMonthMap(List<YearMonth> months) {
        Map<YearMonth, BigDecimal> map = new LinkedHashMap<>();
        months.forEach(month -> map.put(month, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)));
        return map;
    }

    private BigDecimal normalizeAmount(BigDecimal amountInBase, BigDecimal amount) {
        return Optional.ofNullable(amountInBase)
                .or(() -> Optional.ofNullable(amount))
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private CategorySelection resolveCategorySelection(Category rootCategory) {
        if (rootCategory == null) {
            return new CategorySelection(null, List.of());
        }
        List<Category> categories = collectCategoryTree(rootCategory);
        Set<UUID> categoryIds = categories.stream()
                .map(Category::getId)
                .filter(Objects::nonNull)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
        return new CategorySelection(categoryIds, categories);
    }

    private List<Category> collectCategoryTree(Category rootCategory) {
        List<Category> result = new ArrayList<>();
        ArrayDeque<Category> queue = new ArrayDeque<>();
        queue.add(rootCategory);

        while (!queue.isEmpty()) {
            Category current = queue.poll();
            if (current == null) {
                continue;
            }
            result.add(current);
            List<Category> children = categoryService.findNestedCategories(current);
            if (children != null) {
                children.forEach(queue::add);
            }
        }
        return result;
    }

    private boolean isZeroRow(CategoryMonthlyExpenseRow row) {
        if (row == null) {
            return false;
        }
        return row.getAmountsByMonth().values().stream()
                .allMatch(amount -> amount == null || amount.compareTo(BigDecimal.ZERO) == 0);
    }

    private record CategorySelection(Set<UUID> allowedCategoryIds, List<Category> categories) {
    }
}
