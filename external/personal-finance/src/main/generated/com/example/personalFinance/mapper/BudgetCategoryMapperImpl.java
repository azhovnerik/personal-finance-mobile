package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.service.BudgetService;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-06T17:15:13+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.13 (Amazon.com Inc.)"
)
@Component
public class BudgetCategoryMapperImpl extends BudgetCategoryMapper {

    @Override
    public BudgetCategoryDto toDto(BudgetCategory budgetCategory, BudgetService budgetService) {
        if ( budgetCategory == null ) {
            return null;
        }

        BudgetCategoryDto budgetCategoryDto = new BudgetCategoryDto();

        budgetCategoryDto.setBudgetId( BudgetCategoryMapper.BudgetToUUID( budgetCategory.getBudget(), budgetService ) );
        budgetCategoryDto.setId( budgetCategory.getId() );
        budgetCategoryDto.setCategory( budgetCategory.getCategory() );
        budgetCategoryDto.setType( budgetCategory.getType() );
        budgetCategoryDto.setAmount( budgetCategory.getAmount() );
        budgetCategoryDto.setComment( budgetCategory.getComment() );
        budgetCategoryDto.setCurrency( budgetCategory.getCurrency() );

        return budgetCategoryDto;
    }

    @Override
    public List<BudgetCategoryDto> toDtoList(List<BudgetCategory> budgetCategories) {
        if ( budgetCategories == null ) {
            return null;
        }

        List<BudgetCategoryDto> list = new ArrayList<BudgetCategoryDto>( budgetCategories.size() );
        for ( BudgetCategory budgetCategory : budgetCategories ) {
            list.add( budgetCategoryToBudgetCategoryDto( budgetCategory ) );
        }

        return list;
    }

    @Override
    public BudgetCategory toModel(BudgetCategoryDto budgetCategoryDto, BudgetService budgetService) {
        if ( budgetCategoryDto == null ) {
            return null;
        }

        BudgetCategory.BudgetCategoryBuilder budgetCategory = BudgetCategory.builder();

        budgetCategory.budget( BudgetCategoryMapper.UUIDToBudget( budgetCategoryDto.getBudgetId(), budgetService ) );
        budgetCategory.id( budgetCategoryDto.getId() );
        budgetCategory.category( budgetCategoryDto.getCategory() );
        budgetCategory.type( budgetCategoryDto.getType() );
        budgetCategory.amount( budgetCategoryDto.getAmount() );
        budgetCategory.comment( budgetCategoryDto.getComment() );
        budgetCategory.currency( budgetCategoryDto.getCurrency() );

        return budgetCategory.build();
    }

    @Override
    public List<BudgetCategory> toModelList(List<BudgetCategoryDto> budgetCategoryDtos) {
        if ( budgetCategoryDtos == null ) {
            return null;
        }

        List<BudgetCategory> list = new ArrayList<BudgetCategory>( budgetCategoryDtos.size() );
        for ( BudgetCategoryDto budgetCategoryDto : budgetCategoryDtos ) {
            list.add( budgetCategoryDtoToBudgetCategory( budgetCategoryDto ) );
        }

        return list;
    }

    protected BudgetCategoryDto budgetCategoryToBudgetCategoryDto(BudgetCategory budgetCategory) {
        if ( budgetCategory == null ) {
            return null;
        }

        BudgetCategoryDto budgetCategoryDto = new BudgetCategoryDto();

        budgetCategoryDto.setId( budgetCategory.getId() );
        budgetCategoryDto.setCategory( budgetCategory.getCategory() );
        budgetCategoryDto.setType( budgetCategory.getType() );
        budgetCategoryDto.setAmount( budgetCategory.getAmount() );
        budgetCategoryDto.setComment( budgetCategory.getComment() );
        budgetCategoryDto.setCurrency( budgetCategory.getCurrency() );

        return budgetCategoryDto;
    }

    protected BudgetCategory budgetCategoryDtoToBudgetCategory(BudgetCategoryDto budgetCategoryDto) {
        if ( budgetCategoryDto == null ) {
            return null;
        }

        BudgetCategory.BudgetCategoryBuilder budgetCategory = BudgetCategory.builder();

        budgetCategory.id( budgetCategoryDto.getId() );
        budgetCategory.category( budgetCategoryDto.getCategory() );
        budgetCategory.type( budgetCategoryDto.getType() );
        budgetCategory.amount( budgetCategoryDto.getAmount() );
        budgetCategory.comment( budgetCategoryDto.getComment() );
        budgetCategory.currency( budgetCategoryDto.getCurrency() );

        return budgetCategory.build();
    }
}
