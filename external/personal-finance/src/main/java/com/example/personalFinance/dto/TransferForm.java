package com.example.personalFinance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TransferForm {
    private UUID id;

    @NotBlank
    private String date;

    private String comment;

    @NotNull
    private UUID fromAccountId;

    @NotNull
    private UUID toAccountId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;
}
