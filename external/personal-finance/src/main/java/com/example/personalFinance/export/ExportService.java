package com.example.personalFinance.export;

public interface ExportService {

    boolean supports(ExportFormat format);

    ExportedFile export(TabularReportExportModel model);
}
