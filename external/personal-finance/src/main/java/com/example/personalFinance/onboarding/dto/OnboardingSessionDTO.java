package com.example.personalFinance.onboarding.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.Data;

/**
 * DTO holding onboarding selections during HTTP session.
 */
@Data
public class OnboardingSessionDTO {
    private List<UUID> incomeTemplateIds = new ArrayList<>();
    private List<UUID> expenseTemplateIds = new ArrayList<>();
    private List<CustomCategoryDTO> customCategories = new ArrayList<>();
    private List<AccountInputDTO> accounts = new ArrayList<>();
}
