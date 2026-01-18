package com.example.personalFinance.onboarding.repository;

import com.example.personalFinance.onboarding.CategoryTemplateI18n;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CategoryTemplateI18nRepository extends JpaRepository<CategoryTemplateI18n, UUID> {

    List<CategoryTemplateI18n> findAllByCategoryTemplateIdInAndLocaleIgnoreCase(Collection<UUID> templateIds, String locale);
}
