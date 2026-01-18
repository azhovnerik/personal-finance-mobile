package com.example.personalFinance.onboarding.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a custom category supplied during onboarding.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomCategoryDTO {
    private String name;
    private String description;
    /** INCOME or EXPENSE */
    private String type;
}
