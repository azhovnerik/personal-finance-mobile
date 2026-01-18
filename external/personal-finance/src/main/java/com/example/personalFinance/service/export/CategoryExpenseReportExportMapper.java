package com.example.personalFinance.service.export;

import com.example.personalFinance.dto.report.CategoryMonthlyExpenseReport;
import com.example.personalFinance.dto.report.CategoryMonthlyExpenseRow;
import com.example.personalFinance.export.TabularReportExportModel;
import com.example.personalFinance.export.model.ColumnSpec;
import com.example.personalFinance.export.model.ColumnType;
import com.example.personalFinance.export.model.ReportParameter;
import com.example.personalFinance.export.model.RowData;
import com.example.personalFinance.model.Category;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class CategoryExpenseReportExportMapper {

    private final MessageSource messageSource;

    public CategoryExpenseReportExportMapper(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    private static final String CATEGORY_COLUMN_KEY = "category";

    public TabularReportExportModel toTabularModel(CategoryMonthlyExpenseReport report,
                                                   Locale locale,
                                                   Locale dateLocale,
                                                   String baseCurrency,
                                                   YearMonth startMonth,
                                                   YearMonth endMonth,
                                                   Category selectedCategory) {
        List<ColumnSpec> columns = buildColumns(report, locale, dateLocale);
        List<RowData> rows = buildRows(report);
        RowData footer = buildFooter(report, locale);
        String fileName = buildFileName(startMonth, endMonth, baseCurrency);
        List<ReportParameter> parameters = buildParameters(locale, dateLocale, startMonth, endMonth, selectedCategory);
        return TabularReportExportModel.builder()
                .fileName(fileName)
                .sheetName(messageSource.getMessage("report.categoryExpenses.sheetName", null, locale))
                .columns(columns)
                .rows(rows)
                .footer(footer)
                .locale(locale)
                .parameters(parameters)
                .build();
    }

    private List<ColumnSpec> buildColumns(CategoryMonthlyExpenseReport report, Locale locale, Locale dateLocale) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy", dateLocale);
        List<ColumnSpec> columns = new LinkedList<>();
        columns.add(ColumnSpec.builder()
                .key(CATEGORY_COLUMN_KEY)
                .header(messageSource.getMessage("report.categoryExpenses.table.category", null, locale))
                .alignment(HorizontalAlignment.LEFT)
                .type(ColumnType.STRING)
                .build());
        for (YearMonth month : report.getMonths()) {
            columns.add(ColumnSpec.builder()
                    .key(month.toString())
                    .header(month.atDay(1).format(formatter))
                    .alignment(HorizontalAlignment.RIGHT)
                    .type(ColumnType.DECIMAL)
                    .build());
        }
        columns.add(ColumnSpec.builder()
                .key("total")
                .header(messageSource.getMessage("report.categoryExpenses.table.total", null, locale))
                .alignment(HorizontalAlignment.RIGHT)
                .type(ColumnType.DECIMAL)
                .build());
        return columns;
    }

    private List<RowData> buildRows(CategoryMonthlyExpenseReport report) {
        return report.getRows().stream()
                .map(this::buildRow)
                .collect(Collectors.toList());
    }

    private RowData buildRow(CategoryMonthlyExpenseRow row) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put(CATEGORY_COLUMN_KEY, row.getCategoryName());
        for (YearMonth month : row.getAmountsByMonth().keySet()) {
            values.put(month.toString(), normalize(row.getAmountsByMonth().get(month)));
        }
        values.put("total", normalize(row.getTotal()));
        return RowData.builder().values(values).build();
    }

    private RowData buildFooter(CategoryMonthlyExpenseReport report, Locale locale) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put(CATEGORY_COLUMN_KEY, messageSource.getMessage("report.categoryExpenses.table.total", null, locale));
        for (YearMonth month : report.getMonths()) {
            values.put(month.toString(), normalize(report.getTotalsByMonth().get(month)));
        }
        values.put("total", normalize(report.getGrandTotal()));
        return RowData.builder().values(values).build();
    }

    private BigDecimal normalize(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String buildFileName(YearMonth startMonth, YearMonth endMonth, String baseCurrency) {
        String period = startMonth != null && endMonth != null
                ? startMonth + "_" + endMonth
                : "period";
        String suffix = baseCurrency != null && !baseCurrency.isBlank()
                ? "_" + baseCurrency.toLowerCase(Locale.ROOT)
                : "";
        return "category-expenses_" + period + suffix;
    }

    private List<ReportParameter> buildParameters(Locale locale,
                                                  Locale dateLocale,
                                                  YearMonth startMonth,
                                                  YearMonth endMonth,
                                                  Category selectedCategory) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy", dateLocale);
        String reportLabel = messageSource.getMessage("export.parameters.report", null, locale);
        String periodLabel = messageSource.getMessage("export.parameters.period", null, locale);
        String periodValue = startMonth != null && endMonth != null
                ? formatter.format(startMonth.atDay(1)) + " – " + formatter.format(endMonth.atDay(1))
                : "";
        String categoryLabel = messageSource.getMessage("report.categoryExpenses.filter.category", null, locale);
        String categoryValue = selectedCategory != null
                ? selectedCategory.getName()
                : messageSource.getMessage("report.categoryExpenses.filter.any", null, locale);

        List<ReportParameter> parameters = new LinkedList<>();
        parameters.add(ReportParameter.builder()
                .label(reportLabel)
                .value(messageSource.getMessage("report.categoryExpenses.title", null, locale))
                .build());
        parameters.add(ReportParameter.builder()
                .label(periodLabel)
                .value(periodValue)
                .build());
        parameters.add(ReportParameter.builder()
                .label(categoryLabel)
                .value(categoryValue)
                .build());
        return parameters;
    }
}
