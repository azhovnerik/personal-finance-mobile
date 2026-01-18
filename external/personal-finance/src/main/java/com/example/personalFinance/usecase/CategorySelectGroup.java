package com.example.personalFinance.usecase;

import com.example.personalFinance.dto.CategoryDto;

import java.util.List;

public record CategorySelectGroup(String label, List<CategoryDto> categories) {

    public CategorySelectGroup {
        categories = List.copyOf(categories);
    }

    public boolean hasLabel() {
        return label != null && !label.isBlank();
    }

    public String sortKey() {
        return hasLabel() ? label : categories.get(0).getName();
    }
}
