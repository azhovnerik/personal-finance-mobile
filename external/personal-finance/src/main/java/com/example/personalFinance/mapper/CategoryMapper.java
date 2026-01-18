package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.service.CategoryService;
import org.mapstruct.AfterMapping;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.Optional;


@Mapper(componentModel = "spring")
public abstract class CategoryMapper {

    public abstract CategoryDto toDto(Category category, @Context CategoryService categoryService);

    public abstract List<CategoryDto> toDtoList(List<Category> categoryList, @Context CategoryService categoryService);

    public abstract Category toModel(CategoryDto categoryDto);

    public abstract List<Category> toModelList(List<CategoryDto> categoryDtoList);

    @AfterMapping
    protected void setParentNameAfterMapping(@MappingTarget CategoryDto categoryDto, @Context CategoryService categoryService) {
        if (categoryDto.getParentId() == null) {
            categoryDto.setParentName("");
            return;
        }
        Optional<Category> category = categoryService.findById(categoryDto.getUserId(), categoryDto.getParentId());
        category.ifPresent(c ->categoryDto.setParentName(c.getName()));
    }
}
