package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetDetailedDto;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.TransactionService;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
public class BudgetDetailedMapperImpl extends BudgetDetailedMapper {

    @Override
    public BudgetDetailedDto toDto(Budget budget, BudgetService budgetService, TransactionService transactionService, CategoryService categoryService, CategoryMapper categoryMapper) {
        if ( budget == null ) {
            return null;
        }

        BudgetDetailedDto budgetDetailedDto = new BudgetDetailedDto();

        budgetDetailedDto.setMonth( BudgetDetailedMapper.localDateToText( budget.getMonth() ) );
        budgetDetailedDto.setId( budget.getId() );
        budgetDetailedDto.setTotalIncome( budget.getTotalIncome() );
        budgetDetailedDto.setTotalExpense( budget.getTotalExpense() );
        budgetDetailedDto.setUser( budget.getUser() );

        budgetDetailedDto.setBaseCurrency( budget.getBaseCurrency() );
        budgetDetailedDto.setIncomeBudgetCategories( getFilteredCategories(budget, com.example.personalFinance.model.CategoryType.INCOME, transactionService) );
        budgetDetailedDto.setExpenseBudgetCategories( getFilteredCategories(budget, com.example.personalFinance.model.CategoryType.EXPENSES, transactionService) );
        budgetDetailedDto.setIncomeCategories( getCategories(budget.getUser(), budget.getId(), com.example.personalFinance.model.CategoryType.INCOME, budgetService, categoryService, categoryMapper) );
        budgetDetailedDto.setExpenseCategories( getCategories(budget.getUser(), budget.getId(), com.example.personalFinance.model.CategoryType.EXPENSES, budgetService, categoryService, categoryMapper) );

        setBalanceAfterMapping( budgetDetailedDto );

        return budgetDetailedDto;
    }

    @Override
    public List<BudgetDetailedDto> toDtoList(List<Budget> budgets) {
        if ( budgets == null ) {
            return null;
        }

        List<BudgetDetailedDto> list = new ArrayList<BudgetDetailedDto>( budgets.size() );
        for ( Budget budget : budgets ) {
            list.add( budgetToBudgetDetailedDto( budget ) );
        }

        return list;
    }

    @Override
    public Budget toModel(BudgetDetailedDto budgetDto) {
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
    public List<Budget> toModelList(List<BudgetDetailedDto> budgetDtoList) {
        if ( budgetDtoList == null ) {
            return null;
        }

        List<Budget> list = new ArrayList<Budget>( budgetDtoList.size() );
        for ( BudgetDetailedDto budgetDetailedDto : budgetDtoList ) {
            list.add( toModel( budgetDetailedDto ) );
        }

        return list;
    }

    protected BudgetDetailedDto budgetToBudgetDetailedDto(Budget budget) {
        if ( budget == null ) {
            return null;
        }

        BudgetDetailedDto budgetDetailedDto = new BudgetDetailedDto();

        budgetDetailedDto.setId( budget.getId() );
        if ( budget.getMonth() != null ) {
            budgetDetailedDto.setMonth( DateTimeFormatter.ISO_LOCAL_DATE.format( budget.getMonth() ) );
        }
        budgetDetailedDto.setTotalIncome( budget.getTotalIncome() );
        budgetDetailedDto.setTotalExpense( budget.getTotalExpense() );
        budgetDetailedDto.setUser( budget.getUser() );
        budgetDetailedDto.setBaseCurrency( budget.getBaseCurrency() );

        setBalanceAfterMapping( budgetDetailedDto );

        return budgetDetailedDto;
    }
}
