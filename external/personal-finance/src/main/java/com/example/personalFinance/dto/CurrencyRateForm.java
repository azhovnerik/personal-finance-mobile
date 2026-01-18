package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class CurrencyRateForm {

    private UUID id;

    @NotNull
    private CurrencyCode currency;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate rateDate;

    @NotNull
    @DecimalMin(value = "0.000001")
    private BigDecimal rate;
}
