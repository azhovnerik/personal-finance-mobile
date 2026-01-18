package com.example.personalFinance.dto;

import com.example.personalFinance.validator.ValidPassword;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordChangeForm {

    @NotBlank
    private String currentPassword;

    @NotBlank
    @ValidPassword
    private String newPassword;

    @NotBlank
    private String confirmNewPassword;
}
