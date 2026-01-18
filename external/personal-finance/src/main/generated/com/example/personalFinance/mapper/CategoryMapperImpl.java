package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.service.CategoryService;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2025-12-29T16:59:21+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.13 (Amazon.com Inc.)"
)
@Component
public class CategoryMapperImpl extends CategoryMapper {

    @Override
    public CategoryDto toDto(Category category, CategoryService categoryService) {
        if ( category == null ) {
            return null;
        }

        CategoryDto categoryDto = new CategoryDto();

        categoryDto.setId( category.getId() );
        categoryDto.setParentId( category.getParentId() );
        categoryDto.setName( category.getName() );
        categoryDto.setDescription( category.getDescription() );
        categoryDto.setUserId( category.getUserId() );
        categoryDto.setType( category.getType() );
        categoryDto.setDisabled( category.getDisabled() );
        categoryDto.setIcon( category.getIcon() );
        categoryDto.setCategoryTemplateId( category.getCategoryTemplateId() );

        setParentNameAfterMapping( categoryDto, categoryService );

        return categoryDto;
    }

    @Override
    public List<CategoryDto> toDtoList(List<Category> categoryList, CategoryService categoryService) {
        if ( categoryList == null ) {
            return null;
        }

        List<CategoryDto> list = new ArrayList<CategoryDto>( categoryList.size() );
        for ( Category category : categoryList ) {
            list.add( toDto( category, categoryService ) );
        }

        return list;
    }

    @Override
    public Category toModel(CategoryDto categoryDto) {
        if ( categoryDto == null ) {
            return null;
        }

        Category.CategoryBuilder category = Category.builder();

        category.id( categoryDto.getId() );
        category.parentId( categoryDto.getParentId() );
        category.name( categoryDto.getName() );
        category.description( categoryDto.getDescription() );
        category.userId( categoryDto.getUserId() );
        category.type( categoryDto.getType() );
        category.disabled( categoryDto.getDisabled() );
        category.icon( categoryDto.getIcon() );
        category.categoryTemplateId( categoryDto.getCategoryTemplateId() );

        return category.build();
    }

    @Override
    public List<Category> toModelList(List<CategoryDto> categoryDtoList) {
        if ( categoryDtoList == null ) {
            return null;
        }

        List<Category> list = new ArrayList<Category>( categoryDtoList.size() );
        for ( CategoryDto categoryDto : categoryDtoList ) {
            list.add( toModel( categoryDto ) );
        }

        return list;
    }
}
