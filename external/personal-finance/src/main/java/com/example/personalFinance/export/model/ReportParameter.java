package com.example.personalFinance.export.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ReportParameter {

    String label;
    String value;
}

