package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetDto;
import com.example.personalFinance.model.Budget;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.LocalDate;
import java.util.List;
import java.time.format.DateTimeFormatter;


@Mapper(componentModel = "spring")
public interface BudgetMapper {

    @Mapping(source = "month", target = "month", qualifiedBy = LocalDateToText.class)
    BudgetDto toDto(Budget budget);

    List<BudgetDto> toDtoList(List<Budget> budgets);

    Budget toModel(BudgetDto budgetDto);

    List<Budget> toModelList(List<BudgetDto> budgetDtoList);

    @LocalDateToText
    public static String localDateToText(LocalDate date) {
        DateTimeFormatter formatters = DateTimeFormatter.ofPattern("MM-yyyy");
        String dateText = date.format(formatters);
        return dateText;
    }
}
