package com.example.personalFinance.dto;

import com.example.personalFinance.model.CurrencyCode;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserSettingsView {
    String email;
    String name;
    String telegramName;
    boolean verified;
    String pendingEmail;
    LocalDateTime pendingEmailRequestedAt;
    boolean hasPassword;
    CurrencyCode baseCurrency;
    String interfaceLanguage;
}
