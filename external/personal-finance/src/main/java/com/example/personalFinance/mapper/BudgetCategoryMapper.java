package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.service.BudgetService;
import org.mapstruct.AfterMapping;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.UUID;


@Mapper(componentModel = "spring")
public abstract class BudgetCategoryMapper {

    @Mapping(source = "budget", target = "budgetId")
    public abstract BudgetCategoryDto toDto(BudgetCategory budgetCategory, @Context BudgetService budgetService);

    public abstract List<BudgetCategoryDto> toDtoList(List<BudgetCategory> budgetCategories);

    @Mapping(source = "budgetId", target = "budget")
    public abstract BudgetCategory toModel(BudgetCategoryDto budgetCategoryDto, @Context BudgetService budgetService);

    public abstract List<BudgetCategory> toModelList(List<BudgetCategoryDto> budgetCategoryDtos);

    public static Budget UUIDToBudget(UUID budgetId, @Context BudgetService budgetService) {
        return budgetService.findBudgetAdmin(budgetId).orElseThrow(() -> new NonExistedException("The budget is not exist!"));
    }

    public static UUID BudgetToUUID(Budget budget, @Context BudgetService budgetService) {
        return budget.getId();
    }

    @AfterMapping
    protected void setCurrency(@MappingTarget BudgetCategory budgetCategory) {
        if (budgetCategory.getCurrency() == null && budgetCategory.getBudget() != null
                && budgetCategory.getBudget().getBaseCurrency() != null) {
            budgetCategory.setCurrency(budgetCategory.getBudget().getBaseCurrency());
        }
    }

}
