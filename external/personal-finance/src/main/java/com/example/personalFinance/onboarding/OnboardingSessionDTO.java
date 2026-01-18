package com.example.personalFinance.onboarding;

import com.example.personalFinance.model.CurrencyCode;
import lombok.Getter;
import lombok.Setter;
import com.example.personalFinance.onboarding.dto.AccountInputDTO;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class OnboardingSessionDTO implements Serializable {

    private List<UUID> incomeIds = new ArrayList<>();
    private List<UUID> expenseIds = new ArrayList<>();
    private List<AccountInputDTO> accounts = new ArrayList<>();
    private CurrencyCode baseCurrency = CurrencyCode.USD;
    private String interfaceLanguage;
}

