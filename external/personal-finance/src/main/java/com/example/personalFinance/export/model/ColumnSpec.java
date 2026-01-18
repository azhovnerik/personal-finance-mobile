package com.example.personalFinance.export.model;

import lombok.Builder;
import lombok.Data;
import org.apache.poi.ss.usermodel.HorizontalAlignment;

@Data
@Builder
public class ColumnSpec {

    private String key;
    private String header;
    @Builder.Default
    private ColumnType type = ColumnType.STRING;
    @Builder.Default
    private String format = null;
    @Builder.Default
    private HorizontalAlignment alignment = HorizontalAlignment.LEFT;
    private Integer width;
}
