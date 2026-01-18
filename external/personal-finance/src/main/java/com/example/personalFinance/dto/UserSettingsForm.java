package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserSettingsForm {

    @NotBlank
    private String name;

    @Email
    private String email;

    private String telegramName;

    private CurrencyCode baseCurrency;

    @NotBlank
    private String interfaceLanguage;
}
