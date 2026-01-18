package com.example.personalFinance.export;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ExportFormat {
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");

    private final String contentType;
    private final String extension;
}
