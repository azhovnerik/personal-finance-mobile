package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetCategoryDetailedDto;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.TransactionService;
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
public class BudgetCategoryDetailedMapperImpl extends BudgetCategoryDetailedMapper {

    @Override
    public BudgetCategoryDetailedDto toDto(BudgetCategory budgetCategory, BudgetService budgetService, TransactionService transactionService) {
        if ( budgetCategory == null ) {
            return null;
        }

        BudgetCategoryDetailedDto.BudgetCategoryDetailedDtoBuilder budgetCategoryDetailedDto = BudgetCategoryDetailedDto.builder();

        budgetCategoryDetailedDto.budgetId( BudgetCategoryDetailedMapper.BudgetToLong( budgetCategory.getBudget() ) );
        budgetCategoryDetailedDto.planAmount( budgetCategory.getAmount() );
        budgetCategoryDetailedDto.id( budgetCategory.getId() );
        budgetCategoryDetailedDto.category( budgetCategory.getCategory() );
        budgetCategoryDetailedDto.type( budgetCategory.getType() );
        budgetCategoryDetailedDto.comment( budgetCategory.getComment() );
        budgetCategoryDetailedDto.currency( budgetCategory.getCurrency() );

        return budgetCategoryDetailedDto.build();
    }

    @Override
    public List<BudgetCategoryDetailedDto> toDtoList(List<BudgetCategory> budgetCategories, BudgetService budgetService, TransactionService transactionService) {
        if ( budgetCategories == null ) {
            return null;
        }

        List<BudgetCategoryDetailedDto> list = new ArrayList<BudgetCategoryDetailedDto>( budgetCategories.size() );
        for ( BudgetCategory budgetCategory : budgetCategories ) {
            list.add( toDto( budgetCategory, budgetService, transactionService ) );
        }

        return list;
    }

    @Override
    public BudgetCategory toModel(BudgetCategoryDetailedDto budgetCategoryDto, BudgetService budgetService) {
        if ( budgetCategoryDto == null ) {
            return null;
        }

        BudgetCategory.BudgetCategoryBuilder budgetCategory = BudgetCategory.builder();

        budgetCategory.budget( BudgetCategoryDetailedMapper.LongToBudget( budgetCategoryDto.getBudgetId(), budgetService ) );
        budgetCategory.id( budgetCategoryDto.getId() );
        budgetCategory.category( budgetCategoryDto.getCategory() );
        budgetCategory.type( budgetCategoryDto.getType() );
        budgetCategory.comment( budgetCategoryDto.getComment() );
        budgetCategory.currency( budgetCategoryDto.getCurrency() );

        return budgetCategory.build();
    }

    @Override
    public List<BudgetCategory> toModelList(List<BudgetCategoryDetailedDto> budgetCategoryDtos) {
        if ( budgetCategoryDtos == null ) {
            return null;
        }

        List<BudgetCategory> list = new ArrayList<BudgetCategory>( budgetCategoryDtos.size() );
        for ( BudgetCategoryDetailedDto budgetCategoryDetailedDto : budgetCategoryDtos ) {
            list.add( budgetCategoryDetailedDtoToBudgetCategory( budgetCategoryDetailedDto ) );
        }

        return list;
    }

    protected BudgetCategory budgetCategoryDetailedDtoToBudgetCategory(BudgetCategoryDetailedDto budgetCategoryDetailedDto) {
        if ( budgetCategoryDetailedDto == null ) {
            return null;
        }

        BudgetCategory.BudgetCategoryBuilder budgetCategory = BudgetCategory.builder();

        budgetCategory.id( budgetCategoryDetailedDto.getId() );
        budgetCategory.category( budgetCategoryDetailedDto.getCategory() );
        budgetCategory.type( budgetCategoryDetailedDto.getType() );
        budgetCategory.comment( budgetCategoryDetailedDto.getComment() );
        budgetCategory.currency( budgetCategoryDetailedDto.getCurrency() );

        return budgetCategory.build();
    }
}
