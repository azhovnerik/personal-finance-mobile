package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetDto;
import com.example.personalFinance.model.Budget;
import java.time.LocalDate;
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
public class BudgetMapperImpl implements BudgetMapper {

    @Override
    public BudgetDto toDto(Budget budget) {
        if ( budget == null ) {
            return null;
        }

        BudgetDto budgetDto = new BudgetDto();

        budgetDto.setMonth( BudgetMapper.localDateToText( budget.getMonth() ) );
        budgetDto.setId( budget.getId() );
        budgetDto.setTotalIncome( budget.getTotalIncome() );
        budgetDto.setTotalExpense( budget.getTotalExpense() );
        budgetDto.setUser( budget.getUser() );
        budgetDto.setBaseCurrency( budget.getBaseCurrency() );

        return budgetDto;
    }

    @Override
    public List<BudgetDto> toDtoList(List<Budget> budgets) {
        if ( budgets == null ) {
            return null;
        }

        List<BudgetDto> list = new ArrayList<BudgetDto>( budgets.size() );
        for ( Budget budget : budgets ) {
            list.add( toDto( budget ) );
        }

        return list;
    }

    @Override
    public Budget toModel(BudgetDto budgetDto) {
        if ( budgetDto == null ) {
            return null;
        }

        Budget.BudgetBuilder budget = Budget.builder();

        budget.id( budgetDto.getId() );
        if ( budgetDto.getMonth() != null ) {
            budget.month( LocalDate.parse( budgetDto.getMonth() ) );
        }
        budget.totalIncome( budgetDto.getTotalIncome() );
        budget.totalExpense( budgetDto.getTotalExpense() );
        budget.user( budgetDto.getUser() );
        budget.baseCurrency( budgetDto.getBaseCurrency() );

        return budget.build();
    }

    @Override
    public List<Budget> toModelList(List<BudgetDto> budgetDtoList) {
        if ( budgetDtoList == null ) {
            return null;
        }

        List<Budget> list = new ArrayList<Budget>( budgetDtoList.size() );
        for ( BudgetDto budgetDto : budgetDtoList ) {
            list.add( toModel( budgetDto ) );
        }

        return list;
    }
}
