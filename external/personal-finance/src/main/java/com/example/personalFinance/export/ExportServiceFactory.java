package com.example.personalFinance.export;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportServiceFactory {

    private final List<ExportService> exportServices;

    public ExportedFile export(TabularReportExportModel model, ExportFormat format) {
        return exportServices.stream()
                .filter(service -> service.supports(format))
                .findFirst()
                .map(service -> service.export(model))
                .orElseThrow(() -> new IllegalArgumentException("Export format is not supported: " + format));
    }
}
