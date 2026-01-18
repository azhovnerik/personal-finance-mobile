package com.example.personalFinance.service.Impl;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.exception.DuplicateCategoryException;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.UserCategoryService;
import com.example.personalFinance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserCategoryServiceImpl implements UserCategoryService {

    @Autowired
    CategoryService categoryService;

    @Autowired
    UserService userService;

    @Autowired
    CategoryMapper categoryMapper;

    @Override
    public List<CategoryDto> getCategoriesByUserAndType(String userEmail, String type, boolean disabled) {
        Optional<UserApp> user = userService.findByName(userEmail);
        CategoryType categoryType;
        try {
            categoryType = CategoryType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return new ArrayList<>();
        }

        if (user.isPresent()) {
            List<CategoryDto> categoryList = categoryMapper.toDtoList(categoryService.findByUserAndTypeOrderByParentId(user.get().getId(), categoryType, disabled), categoryService);
            return categoryList;
        }
        return new ArrayList<>();
    }

    @Override
    public Category addCategory(String userEmail, CategoryDto categoryDto) {
        Optional<UserApp> user = userService.findByName(userEmail);
        if (user.isPresent()) {
            List<Category> existingCategory = categoryService.findByUserIdAndName(user.get().getId(), categoryDto.getName());
            if (!existingCategory.isEmpty()) {
                throw new DuplicateCategoryException("There is existed category with such name!");
            }
            categoryDto.setUserId(user.get().getId());
            Category category = categoryMapper.toModel(categoryDto);

            return categoryService.save(category);
        } else {
            throw new NonExistedException("The user is not exist!");
        }
    }

    @Override
    public Category findCategoryById(String userEmail, UUID id) {
        Optional<UserApp> user = userService.findByName(userEmail);
        if (user.isPresent()) {
            Optional<Category> categoryOptional = categoryService.findById(user.get().getId(), id);
            return categoryOptional.orElseThrow(() -> new NonExistedException("The category is not exist!"));
        } else {
            throw new NonExistedException("The user is not exist!");
        }
    }

    @Override
    public List<Category> getRootCategoriesByUserAndType(String userEmail, String type) {
        Optional<UserApp> user = userService.findByName(userEmail);
        CategoryType categoryType;
        try {
            categoryType = CategoryType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return new ArrayList<>();
        }
        if (user.isPresent()) {
            return categoryService.getRootCategoriesByUserIdAndType(user.get().getId(), categoryType);
        }
        return new ArrayList<>();
    }

    @Override
    public boolean save(String userEmail, CategoryDto categoryDto, String newParentId) {
        Optional<UserApp> userOptional = userService.findByName(userEmail);
        userOptional.ifPresent(user -> {
            Optional<Category> categoryOptional = categoryService.findById(user.getId(), categoryDto.getId());
            categoryOptional.ifPresentOrElse(category -> {
                if (!category.getName().equals(categoryDto.getName())) {
                    List<Category> existingCategory = categoryService.findByUserIdAndName(user.getId(), categoryDto.getName());
                    if (!existingCategory.isEmpty()) {
                        throw new DuplicateCategoryException("There is existed category with such name!");
                    }
                }
                category.setName(categoryDto.getName());
                category.setDescription(categoryDto.getDescription());
                category.setParentId(newParentId.equals("null") ? null : UUID.fromString(newParentId));
                category.setDisabled(categoryDto.getDisabled());
                category.setIcon(categoryDto.getIcon());
                category.setCategoryTemplateId(categoryDto.getCategoryTemplateId());
                categoryService.save(category);

            }, () -> {
                throw new NonExistedException("The category is not exist!");
            });
        });
        return true;
    }

    @Override
    public boolean deleteCategory(String userEmail, UUID id) {
        Optional<UserApp> userOptional = userService.findByName(userEmail);
        if (userOptional.isPresent()) {
            Category category = categoryService.findById(userOptional.get().getId(), id)
                    .orElseThrow(() -> new NonExistedException("The category is not exist!"));
            return categoryService.deleteCategory(userOptional.get().getId(), category.getId());
        }
        return false;
    }
}
