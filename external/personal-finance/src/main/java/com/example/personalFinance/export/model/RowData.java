package com.example.personalFinance.export.model;

import lombok.Builder;
import lombok.Data;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Builder
public class RowData {

    @Builder.Default
    private Map<String, Object> values = new LinkedHashMap<>();

    public Map<String, Object> getValues() {
        return values == null ? Collections.emptyMap() : Collections.unmodifiableMap(values);
    }
}
