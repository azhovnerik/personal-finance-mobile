package com.example.personalFinance.service;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.dto.CategoryReactDto;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryService {

    List<Category> findByUserAndTypeOrderByParentId(UUID userId, CategoryType expenses, boolean disabled);

    List<CategoryDto> findByUserAndTypeWithoutParentsOrderByFrequency(UUID userId, CategoryType expenses, boolean disabled);

    Category save(Category category);

    List<Category> findByUserIdAndName(UUID id, String name);

    Optional<Category> findById(UUID userId, @NotNull UUID id);

    List<Category> getRootCategoriesByUserIdAndType(UUID userId, CategoryType type);

    boolean deleteCategory(UUID userId, UUID id);

    List<Category> findNestedCategories(Category rootCategory);

    boolean hasSubcategories(Category category);

    boolean hasSubcategories(CategoryDto category);

    boolean isRootCategory(CategoryDto category);

    boolean isRootWithNestedSubcategories(CategoryDto category);

    List<CategoryReactDto> getCategoryTree(List<Category> categoryList);
}
