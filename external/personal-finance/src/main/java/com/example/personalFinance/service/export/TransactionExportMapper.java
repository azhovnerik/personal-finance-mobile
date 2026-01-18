package com.example.personalFinance.service.export;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.export.TabularReportExportModel;
import com.example.personalFinance.export.model.ColumnSpec;
import com.example.personalFinance.export.model.ColumnType;
import com.example.personalFinance.export.model.RowData;
import com.example.personalFinance.model.TransactionType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class TransactionExportMapper {

    private static final String DATE_COLUMN_KEY = "date";
    private static final String ACCOUNT_COLUMN_KEY = "account";
    private static final String CATEGORY_COLUMN_KEY = "category";
    private static final String CURRENCY_COLUMN_KEY = "currency";
    private static final String AMOUNT_COLUMN_KEY = "amount";
    private static final String AMOUNT_BASE_COLUMN_KEY = "amountBase";
    private static final String TYPE_COLUMN_KEY = "type";
    private static final String DIRECTION_COLUMN_KEY = "direction";
    private static final String COMMENT_COLUMN_KEY = "comment";

    private final MessageSource messageSource;

    public TransactionExportMapper(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public TabularReportExportModel toTabularModel(List<TransactionDto> transactions,
                                                   Locale locale,
                                                   String baseCurrency,
                                                   LocalDate startDate,
                                                   LocalDate endDate) {
        List<ColumnSpec> columns = buildColumns(locale, baseCurrency);
        List<RowData> rows = buildRows(transactions, locale);
        return TabularReportExportModel.builder()
                .fileName(buildFileName(startDate, endDate))
                .sheetName(messageSource.getMessage("transactions.title", null, locale))
                .columns(columns)
                .rows(rows)
                .locale(locale)
                .build();
    }

    private List<ColumnSpec> buildColumns(Locale locale, String baseCurrency) {
        return List.of(
                ColumnSpec.builder()
                        .key(DATE_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.date", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(ACCOUNT_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.account", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(CATEGORY_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.category", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(CURRENCY_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.currency", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(AMOUNT_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.amount", null, locale))
                        .alignment(HorizontalAlignment.RIGHT)
                        .type(ColumnType.DECIMAL)
                        .build(),
                ColumnSpec.builder()
                        .key(AMOUNT_BASE_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.amountBase", new Object[]{baseCurrency}, locale))
                        .alignment(HorizontalAlignment.RIGHT)
                        .type(ColumnType.DECIMAL)
                        .build(),
                ColumnSpec.builder()
                        .key(TYPE_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.type", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(DIRECTION_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.direction", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build(),
                ColumnSpec.builder()
                        .key(COMMENT_COLUMN_KEY)
                        .header(messageSource.getMessage("transactions.table.comment", null, locale))
                        .alignment(HorizontalAlignment.LEFT)
                        .type(ColumnType.STRING)
                        .build()
        );
    }

    private List<RowData> buildRows(List<TransactionDto> transactions, Locale locale) {
        return transactions.stream()
                .map(transaction -> buildRow(transaction, locale))
                .collect(Collectors.toList());
    }

    private RowData buildRow(TransactionDto transaction, Locale locale) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put(DATE_COLUMN_KEY, normalizeDate(transaction.getDate()));
        values.put(ACCOUNT_COLUMN_KEY, Optional.ofNullable(transaction.getAccount())
                .map(account -> account.getName())
                .orElse(""));
        values.put(CATEGORY_COLUMN_KEY, Optional.ofNullable(transaction.getCategory())
                .map(category -> category.getName())
                .orElse(""));
        values.put(CURRENCY_COLUMN_KEY, Optional.ofNullable(transaction.getCurrency())
                .map(Object::toString)
                .orElse(""));
        values.put(AMOUNT_COLUMN_KEY, transaction.getAmount());
        values.put(AMOUNT_BASE_COLUMN_KEY, transaction.getAmountInBase());
        values.put(TYPE_COLUMN_KEY, resolveTransactionType(transaction.getType(), locale));
        values.put(DIRECTION_COLUMN_KEY, Optional.ofNullable(transaction.getDirection())
                .map(Object::toString)
                .orElse(""));
        values.put(COMMENT_COLUMN_KEY, Optional.ofNullable(transaction.getComment()).orElse(""));
        return RowData.builder().values(values).build();
    }

    private String buildFileName(LocalDate startDate, LocalDate endDate) {
        String period = startDate != null && endDate != null
                ? startDate + "_" + endDate
                : "period";
        return "transactions_" + period;
    }

    private String normalizeDate(String rawDate) {
        if (rawDate == null) {
            return "";
        }
        return rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
    }

    private String resolveTransactionType(TransactionType type, Locale locale) {
        if (type == null) {
            return "";
        }
        return messageSource.getMessage("transactions.type." + type.name(), null, type.name(), locale);
    }
}
