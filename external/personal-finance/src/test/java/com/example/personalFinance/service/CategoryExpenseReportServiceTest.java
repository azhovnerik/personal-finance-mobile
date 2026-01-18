package com.example.personalFinance.service;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.dto.report.CategoryMonthlyExpenseReport;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.TransactionType;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryExpenseReportServiceTest {

    @Mock
    private TransactionService transactionService;

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryExpenseReportService categoryExpenseReportService;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Test
    void shouldAggregateExpensesByCategoryAndMonth() {
        UUID userId = UUID.randomUUID();
        Category groceries = Category.builder()
                .id(UUID.randomUUID())
                .name("Groceries")
                .type(CategoryType.EXPENSES)
                .build();

        TransactionDto aprilExpense = buildTransaction(groceries, TransactionType.EXPENSE,
                LocalDateTime.of(2024, 4, 5, 12, 0), new BigDecimal("120.00"));
        TransactionDto mayExpense = buildTransaction(groceries, TransactionType.EXPENSE,
                LocalDateTime.of(2024, 5, 3, 18, 0), new BigDecimal("30.00"));

        Category incomeCategory = Category.builder()
                .id(UUID.randomUUID())
                .name("Salary")
                .type(CategoryType.INCOME)
                .build();
        TransactionDto income = buildTransaction(incomeCategory, TransactionType.INCOME,
                LocalDateTime.of(2024, 4, 10, 9, 0), new BigDecimal("500.00"));

        when(transactionService.findByUserIdAndPeriod(eq(userId), anyLong(), anyLong()))
                .thenReturn(List.of(aprilExpense, mayExpense, income));

        CategoryMonthlyExpenseReport report = categoryExpenseReportService.buildCategoryMonthlyReport(
                userId, YearMonth.of(2024, 4), YearMonth.of(2024, 5), null);

        Assertions.assertEquals(List.of(YearMonth.of(2024, 4), YearMonth.of(2024, 5)), report.getMonths());
        Assertions.assertEquals(new BigDecimal("150.00"), report.getGrandTotal());
        Assertions.assertEquals(new BigDecimal("120.00"), report.getTotalsByMonth().get(YearMonth.of(2024, 4)));
        Assertions.assertEquals(new BigDecimal("30.00"), report.getTotalsByMonth().get(YearMonth.of(2024, 5)));
        Assertions.assertEquals(1, report.getRows().size());
        Assertions.assertEquals(new BigDecimal("150.00"), report.getRows().get(0).getTotal());
    }

    @Test
    void shouldIncludeSubcategoriesForFilter() {
        UUID userId = UUID.randomUUID();
        Category parent = Category.builder()
                .id(UUID.randomUUID())
                .name("Home")
                .type(CategoryType.EXPENSES)
                .build();
        Category child = Category.builder()
                .id(UUID.randomUUID())
                .parentId(parent.getId())
                .name("Utilities")
                .type(CategoryType.EXPENSES)
                .build();

        TransactionDto childExpense = buildTransaction(child, TransactionType.EXPENSE,
                LocalDateTime.of(2024, 6, 2, 14, 0), new BigDecimal("75.00"));

        when(transactionService.findByUserIdAndPeriod(eq(userId), anyLong(), anyLong()))
                .thenReturn(List.of(childExpense));
        when(categoryService.findNestedCategories(parent)).thenReturn(List.of(child));
        when(categoryService.findNestedCategories(child)).thenReturn(List.of());

        CategoryMonthlyExpenseReport report = categoryExpenseReportService.buildCategoryMonthlyReport(
                userId, YearMonth.of(2024, 6), YearMonth.of(2024, 6), parent);

        Assertions.assertEquals(1, report.getRows().size());
        Assertions.assertFalse(report.getRows().stream().anyMatch(row -> row.getCategoryId().equals(parent.getId())));
        Assertions.assertTrue(report.getRows().stream().anyMatch(row -> row.getCategoryId().equals(child.getId())));
        Assertions.assertEquals(new BigDecimal("75.00"), report.getGrandTotal());
    }

    @Test
    void shouldRequireValidPeriod() {
        UUID userId = UUID.randomUUID();
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                categoryExpenseReportService.buildCategoryMonthlyReport(userId,
                        YearMonth.of(2024, 7), YearMonth.of(2024, 6), null));
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                categoryExpenseReportService.buildCategoryMonthlyReport(userId, null, YearMonth.of(2024, 6), null));
    }

    private TransactionDto buildTransaction(Category category, TransactionType type, LocalDateTime dateTime, BigDecimal amount) {
        TransactionDto transaction = new TransactionDto();
        transaction.setId(UUID.randomUUID());
        transaction.setCategory(category);
        transaction.setType(type);
        transaction.setDate(dateTime.format(FORMATTER));
        transaction.setAmount(amount);
        transaction.setAmountInBase(amount);
        return transaction;
    }
}
