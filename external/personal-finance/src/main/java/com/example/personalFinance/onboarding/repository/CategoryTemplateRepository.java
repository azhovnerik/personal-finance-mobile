package com.example.personalFinance.onboarding.repository;

import com.example.personalFinance.onboarding.CategoryTemplate;
import com.example.personalFinance.model.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoryTemplateRepository extends JpaRepository<CategoryTemplate, UUID> {

    List<CategoryTemplate> findAllByType(CategoryType type);
}
