package com.example.personalFinance.export.xlsx;

import com.example.personalFinance.export.ExportFormat;
import com.example.personalFinance.export.ExportService;
import com.example.personalFinance.export.ExportedFile;
import com.example.personalFinance.export.TabularReportExportModel;
import com.example.personalFinance.export.model.ColumnSpec;
import com.example.personalFinance.export.model.ColumnType;
import com.example.personalFinance.export.model.ReportParameter;
import com.example.personalFinance.export.model.RowData;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.temporal.TemporalAccessor;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class XlsxExportService implements ExportService {

    @Override
    public boolean supports(ExportFormat format) {
        return ExportFormat.XLSX == format;
    }

    @Override
    public ExportedFile export(TabularReportExportModel model) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(model.getSheetName());

            Map<String, CellStyle> dataStyles = buildDataStyles(workbook, model);
            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle footerStyle = buildFooterStyle(workbook, dataStyles);
            CellStyle parameterLabelStyle = buildParameterLabelStyle(workbook);
            CellStyle parameterValueStyle = buildParameterValueStyle(workbook);

            int rowIndex = writeParameters(sheet, model, parameterLabelStyle, parameterValueStyle);
            int headerRowIndex = writeHeaderRow(sheet, model, headerStyle, rowIndex);
            rowIndex = headerRowIndex + 1;
            rowIndex = writeDataRows(sheet, model, dataStyles, rowIndex);
            writeFooterRow(sheet, model, footerStyle, rowIndex);

            autoSizeColumns(sheet, model);
            freezeHeader(sheet, headerRowIndex, model);

            workbook.write(outputStream);
            String fileName = ensureExtension(model.getFileName(), ExportFormat.XLSX.getExtension());
            return new ExportedFile(outputStream.toByteArray(), fileName, ExportFormat.XLSX.getContentType());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to export report to XLSX", ex);
        }
    }

    private int writeParameters(Sheet sheet,
                                TabularReportExportModel model,
                                CellStyle labelStyle,
                                CellStyle valueStyle) {
        int rowIndex = 0;
        for (ReportParameter parameter : model.getParameters()) {
            Row row = sheet.createRow(rowIndex++);
            Cell labelCell = row.createCell(0);
            labelCell.setCellValue(parameter.getLabel());
            labelCell.setCellStyle(labelStyle);

            Cell valueCell = row.createCell(1);
            valueCell.setCellValue(parameter.getValue());
            valueCell.setCellStyle(valueStyle);
        }
        return model.getParameters().isEmpty() ? 0 : rowIndex + 1;
    }

    private int writeHeaderRow(Sheet sheet, TabularReportExportModel model, CellStyle headerStyle, int rowIndex) {
        Row headerRow = sheet.createRow(rowIndex);
        int colIndex = 0;
        for (ColumnSpec column : model.getColumns()) {
            Cell cell = headerRow.createCell(colIndex++);
            cell.setCellValue(column.getHeader());
            cell.setCellStyle(headerStyle);
        }
        return rowIndex;
    }

    private int writeDataRows(Sheet sheet,
                              TabularReportExportModel model,
                              Map<String, CellStyle> dataStyles,
                              int startRowIndex) {
        int rowIndex = startRowIndex;
        for (RowData rowData : model.getRows()) {
            Row row = sheet.createRow(rowIndex++);
            int colIndex = 0;
            for (ColumnSpec column : model.getColumns()) {
                Cell cell = row.createCell(colIndex++);
                applyValue(cell, rowData.getValues().get(column.getKey()), column, dataStyles);
            }
        }
        return rowIndex;
    }

    private void writeFooterRow(Sheet sheet, TabularReportExportModel model, CellStyle footerStyle, int startRowIndex) {
        RowData footer = model.getFooter();
        if (footer == null || footer.getValues().isEmpty()) {
            return;
        }
        int footerRowIndex = startRowIndex;
        Row footerRow = sheet.createRow(footerRowIndex);
        int colIndex = 0;
        for (ColumnSpec column : model.getColumns()) {
            Cell cell = footerRow.createCell(colIndex++);
            cell.setCellStyle(footerStyle);
            applyValue(cell, footer.getValues().get(column.getKey()), column, null);
        }
    }

    private Map<String, CellStyle> buildDataStyles(Workbook workbook, TabularReportExportModel model) {
        Map<String, CellStyle> styles = new HashMap<>();
        CreationHelper helper = workbook.getCreationHelper();
        for (ColumnSpec column : model.getColumns()) {
            CellStyle style = workbook.createCellStyle();
            style.setAlignment(column.getAlignment());
            style.setWrapText(false);
            applyBorders(style);
            if (column.getFormat() != null && !column.getFormat().isBlank()) {
                style.setDataFormat(helper.createDataFormat().getFormat(column.getFormat()));
            } else {
                String defaultFormat = resolveDefaultFormat(column.getType());
                if (defaultFormat != null) {
                    style.setDataFormat(helper.createDataFormat().getFormat(defaultFormat));
                }
            }
            styles.put(column.getKey(), style);
        }
        return styles;
    }

    private CellStyle buildHeaderStyle(Workbook workbook) {
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setAlignment(HorizontalAlignment.LEFT);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setWrapText(true);
        applyBorders(headerStyle);
        var font = workbook.createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        return headerStyle;
    }

    private CellStyle buildFooterStyle(Workbook workbook, Map<String, CellStyle> dataStyles) {
        CellStyle footerStyle = workbook.createCellStyle();
        footerStyle.cloneStyleFrom(dataStyles.values().stream().findFirst().orElse(workbook.createCellStyle()));
        footerStyle.setAlignment(HorizontalAlignment.LEFT);
        applyBorders(footerStyle);
        var font = workbook.createFont();
        font.setBold(true);
        footerStyle.setFont(font);
        footerStyle.setWrapText(false);
        return footerStyle;
    }

    private CellStyle buildParameterLabelStyle(Workbook workbook) {
        CellStyle labelStyle = workbook.createCellStyle();
        var font = workbook.createFont();
        font.setBold(true);
        labelStyle.setFont(font);
        labelStyle.setWrapText(false);
        return labelStyle;
    }

    private CellStyle buildParameterValueStyle(Workbook workbook) {
        CellStyle valueStyle = workbook.createCellStyle();
        valueStyle.setWrapText(false);
        return valueStyle;
    }

    private void applyValue(Cell cell, Object value, ColumnSpec column, Map<String, CellStyle> dataStyles) {
        if (dataStyles != null) {
            cell.setCellStyle(dataStyles.get(column.getKey()));
        }
        if (value == null) {
            return;
        }
        if (value instanceof BigDecimal bigDecimal) {
            cell.setCellValue(bigDecimal.doubleValue());
            return;
        }
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            return;
        }
        if (value instanceof TemporalAccessor temporalAccessor) {
            cell.setCellValue(Objects.toString(temporalAccessor));
            return;
        }
        cell.setCellValue(value.toString());
    }

    private void autoSizeColumns(Sheet sheet, TabularReportExportModel model) {
        int colIndex = 0;
        for (ColumnSpec column : model.getColumns()) {
            if (column.getWidth() != null) {
                sheet.setColumnWidth(colIndex++, column.getWidth());
            } else {
                sheet.autoSizeColumn(colIndex++);
            }
        }
    }

    private void freezeHeader(Sheet sheet, int headerRowIndex, TabularReportExportModel model) {
        if (!model.getColumns().isEmpty()) {
            sheet.createFreezePane(0, headerRowIndex + 1);
        }
    }

    private void applyBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private String resolveDefaultFormat(ColumnType type) {
        return switch (type) {
            case DECIMAL -> "#,##0.00";
            case INTEGER -> "#,##0";
            case DATE -> "yyyy-mm-dd";
            default -> null;
        };
    }

    private String ensureExtension(String fileName, String extension) {
        if (fileName == null || fileName.isBlank()) {
            return "report." + extension;
        }
        String normalized = fileName.trim();
        if (normalized.toLowerCase().endsWith("." + extension)) {
            return normalized;
        }
        return normalized + "." + extension;
    }
}
