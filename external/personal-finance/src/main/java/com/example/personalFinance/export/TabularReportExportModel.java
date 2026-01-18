package com.example.personalFinance.export;

import com.example.personalFinance.export.model.ColumnSpec;
import com.example.personalFinance.export.model.RowData;
import com.example.personalFinance.export.model.ReportParameter;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Data
@Builder
public class TabularReportExportModel {

    @Builder.Default
    private String fileName = "report";

    @Builder.Default
    private String sheetName = "Report";

    @Builder.Default
    private List<ColumnSpec> columns = List.of();

    @Builder.Default
    private List<RowData> rows = List.of();

    private RowData footer;

    @Builder.Default
    private List<ReportParameter> parameters = List.of();

    private Locale locale;

    public List<ColumnSpec> getColumns() {
        return columns == null ? List.of() : columns;
    }

    public List<RowData> getRows() {
        return rows == null ? List.of() : rows;
    }

    public RowData getFooter() {
        return footer;
    }

    public List<ReportParameter> getParameters() {
        return parameters == null ? List.of() : parameters;
    }

    public Locale getLocale() {
        return Optional.ofNullable(locale).orElse(Locale.getDefault());
    }

    public String getSheetName() {
        return Optional.ofNullable(sheetName).filter(name -> !name.isBlank()).orElse("Report");
    }

    public String getFileName() {
        return Optional.ofNullable(fileName).filter(name -> !name.isBlank()).orElse("report");
    }
}
