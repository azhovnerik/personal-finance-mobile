package com.example.personalFinance.service;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Category;

import java.util.List;
import java.util.UUID;

public interface UserCategoryService {
    List<CategoryDto> getCategoriesByUserAndType(String userEmail, String type, boolean disabled);

    Category addCategory(String userEmail, CategoryDto categoryDto);

    Category findCategoryById(String userEmail, UUID id);

    List<Category> getRootCategoriesByUserAndType(String userEmail, String type);

    boolean save(String userEmail, CategoryDto categoryDto, String newParentId);

    boolean deleteCategory(String userEmail, UUID id);
}
