package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetCategoryDetailedDto;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.TransactionService;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.UUID;


@Mapper(componentModel = "spring")

public abstract class BudgetCategoryDetailedMapper {

    @Mapping(source = "budgetCategory.budget", target = "budgetId")
    @Mapping(source = "budgetCategory.amount", target = "planAmount")
    public abstract BudgetCategoryDetailedDto toDto(BudgetCategory budgetCategory ,
                                                    @Context BudgetService budgetService,
                                                    @Context TransactionService transactionService);

    public abstract List<BudgetCategoryDetailedDto> toDtoList(List<BudgetCategory> budgetCategories,
                                                               @Context BudgetService budgetService,
                                                              @Context TransactionService transactionService);

    @Mapping(source = "budgetId", target = "budget")
    public abstract BudgetCategory toModel(BudgetCategoryDetailedDto budgetCategoryDto, @Context BudgetService budgetService);

    public abstract List<BudgetCategory> toModelList(List<BudgetCategoryDetailedDto> budgetCategoryDtos);

    public static Budget LongToBudget(UUID budgetId, @Context BudgetService budgetService) {
        return budgetService.findBudgetAdmin(budgetId).orElseThrow(() -> new NonExistedException("The budget is not exist!"));
    }

    public static UUID BudgetToLong(Budget budget) {
        return budget.getId();
    }
}
