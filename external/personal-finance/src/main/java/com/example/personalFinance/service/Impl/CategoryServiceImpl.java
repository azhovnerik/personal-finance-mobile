package com.example.personalFinance.service.Impl;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.dto.CategoryReactDto;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryProjection;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.repository.CategoryRepository;
import com.example.personalFinance.service.CategoryService;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static java.util.Collections.emptyList;

@Service
public class CategoryServiceImpl implements CategoryService {
    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryMapper categoryMapper;

    @Override
    public List<Category> findByUserAndTypeOrderByParentId(UUID userAppId, CategoryType type, boolean withDisabled) {
        List<Category> categoryList;
        if (withDisabled) {
            categoryList = categoryRepository.findByUserIdAndTypeOrderByParentId(userAppId, type);
        } else {
            categoryList = categoryRepository.findByUserIdAndTypeAndDisabledOrderByParentId(userAppId, type, withDisabled);
        }
        return orderListAsTree(categoryList);
    }

    @Override
    public List<CategoryDto> findByUserAndTypeWithoutParentsOrderByFrequency(UUID userId, CategoryType categoryType, boolean withDisabled) {
        List<CategoryProjection> categoryProjectionList;
        categoryProjectionList = categoryRepository.findByUserIdAndTypeAndDisabledOrderByName(userId, categoryType.name(), withDisabled);
        return categoryProjectionList.stream().map(c -> findByUserIdAndName(userId, c.getName()).get(0))
                .map(c -> categoryMapper.toDto(c, this))
                .filter(c -> !isRootWithNestedSubcategories(c))
                .collect(Collectors.toList());
    }

    @Override
    public Category save(Category category) {

        return categoryRepository.save(category);
    }

    @Override
    public List<Category> findByUserIdAndName(UUID id, String name) {
        return categoryRepository.findByUserIdAndNameIgnoreCase(id, name);
    }

    @Override
    public Optional<Category> findById(UUID userId, UUID id) {
        if (id == null) return Optional.empty();
        return categoryRepository.findByUserIdAndId(userId, id);
    }

    @Override
    public List<Category> getRootCategoriesByUserIdAndType(UUID userId, CategoryType type) {
        return categoryRepository.findByUserIdAndTypeAndParentIdIsNull(userId, type).stream()
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    @Override
    public boolean deleteCategory(UUID userId, UUID id) {
        try {
            categoryRepository.deleteById(id);
            return true;
        } catch (ConstraintViolationException | DataIntegrityViolationException e) {
            return false;
        }
    }

    @Override
    public List<Category> findNestedCategories(Category rootCategory) {
        return categoryRepository.findByParentIdAndDisabledIsFalse(rootCategory.getId());
    }

    @Override
    public boolean hasSubcategories(Category category) {
        return findNestedCategories(category).size() > 0;
    }

    @Override
    public boolean hasSubcategories(CategoryDto category) {
        return findNestedCategories(categoryMapper.toModel(category)).size() > 0;
    }

    @Override
    public boolean isRootCategory(CategoryDto category) {
        return category.getParentId() == null;
    }

    @Override
    public boolean isRootWithNestedSubcategories(CategoryDto category) {
        return isRootCategory(category) && hasSubcategories(category);
    }

    @Override
    public List<CategoryReactDto> getCategoryTree(List<Category> categoryList) {
        List<CategoryReactDto> categoryTree = new ArrayList<>();

        Map<Boolean, List<Category>> grouped = categoryList.stream()
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.partitioningBy(a -> a.getParentId() == null));

        List<Category> rootCat = grouped.get(true);
        rootCat.forEach(c -> {
            categoryTree.add(toCategoryReactDto(c));
        });

        return categoryTree;
    }

    private CategoryReactDto toCategoryReactDto(Category category) {
        CategoryReactDto categoryReactDto = new CategoryReactDto();
        categoryReactDto.setId(category.getId());
        categoryReactDto.setType(category.getType());
        categoryReactDto.setDisabled(category.getDisabled());
        categoryReactDto.setDescription(category.getDescription());
        categoryReactDto.setName(category.getName());
        categoryReactDto.setIcon(category.getIcon());
        categoryReactDto.setCategoryTemplateId(category.getCategoryTemplateId());
        categoryReactDto.setSubcategories(findNestedCategories(category).stream().map(this::toCategoryReactDto).collect(Collectors.toList()));
        return categoryReactDto;
    }



    private List<Category> orderListAsTree(List<Category> categoryList) {
        List<Category> tree = new ArrayList<>();
        Map<Boolean, List<Category>> grouped = categoryList.stream()
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.partitioningBy(a -> a.getParentId() == null));

        List<Category> rootCat = grouped.get(true);
        Map<UUID, List<Category>> subCatMap = grouped.get(false).stream().collect(Collectors.groupingBy(a -> a.getParentId()));

        rootCat.forEach(c -> {
            tree.add(c);
            tree.addAll(subCatMap.getOrDefault(c.getId(), emptyList()));
        });
        return tree;
    }
}
