package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.BudgetCategoryDetailedDto;
import com.example.personalFinance.dto.BudgetDetailedDto;
import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.BudgetService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.TransactionService;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static com.example.personalFinance.utils.DateTimeUtils.getEndOfMonth;
import static com.example.personalFinance.utils.DateTimeUtils.getStartOfMonth;


@Mapper(componentModel = "spring", uses = BudgetCategoryDetailedMapper.class)
public abstract class BudgetDetailedMapper {

    @Autowired
    protected CurrencyConversionService currencyConversionService;

    @Mapping(source = "month", target = "month", qualifiedBy = LocalDateToText.class)
    @Mapping(target = "baseCurrency", expression = "java(budget.getBaseCurrency())")
    @Mapping(target = "incomeBudgetCategories", expression = "java(getFilteredCategories(budget, com.example.personalFinance.model.CategoryType.INCOME, transactionService))")
    @Mapping(target = "expenseBudgetCategories", expression = "java(getFilteredCategories(budget, com.example.personalFinance.model.CategoryType.EXPENSES, transactionService))")
    @Mapping(target = "incomeCategories", expression = "java(getCategories(budget.getUser(), budget.getId(), com.example.personalFinance.model.CategoryType.INCOME, budgetService, categoryService, categoryMapper))")
    @Mapping(target = "expenseCategories", expression = "java(getCategories(budget.getUser(), budget.getId(), com.example.personalFinance.model.CategoryType.EXPENSES, budgetService, categoryService, categoryMapper))")
    public abstract BudgetDetailedDto toDto(Budget budget,
                                            @Context BudgetService budgetService,
                                            @Context TransactionService transactionService,
                                            @Context CategoryService categoryService,
                                            @Context CategoryMapper categoryMapper);

    public abstract List<BudgetDetailedDto> toDtoList(List<Budget> budgets);

    public abstract Budget toModel(BudgetDetailedDto budgetDto);

    public abstract List<Budget> toModelList(List<BudgetDetailedDto> budgetDtoList);

    @LocalDateToText
    public static String localDateToText(LocalDate date) {
        DateTimeFormatter formatters = DateTimeFormatter.ofPattern("MM-yyyy");
        String dateText = date.format(formatters);
        return dateText;
    }

    protected List<BudgetCategoryDetailedDto> getFilteredCategories(Budget budget, CategoryType type,
                                                                    TransactionService transactionService) {
        Long periodStart = getStartOfMonth(budget.getMonth());
        Long periodEnd = getEndOfMonth(budget.getMonth());

        Map<Category, BigDecimal> totalsByCategory = transactionService.calculateTotalsByCategoryTypeForPeriod(
                budget.getUser().getId(),
                type,
                periodStart,
                periodEnd);

        Map<UUID, BigDecimal> factAmountsByCategoryId = totalsByCategory.entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .collect(Collectors.toMap(entry -> entry.getKey().getId(),
                        Map.Entry::getValue,
                        BigDecimal::add,
                        LinkedHashMap::new));

        List<BudgetCategoryDetailedDto> result = new ArrayList<>();
        Set<UUID> plannedCategoryIds = new HashSet<>();
        LocalDate rateDate = budget.getMonth() != null ? budget.getMonth().withDayOfMonth(1) : LocalDate.now();

        for (BudgetCategory budgetCategory : budget.getBudgetCategory()) {
            if (!budgetCategory.getType().equals(type)) {
                continue;
            }
            UUID categoryId = budgetCategory.getCategory().getId();
            plannedCategoryIds.add(categoryId);
            BigDecimal planAmountOriginal = Optional.ofNullable(budgetCategory.getAmount()).orElse(BigDecimal.ZERO);
            BigDecimal planAmountBase = currencyConversionService.convertToBase(budget.getUser(),
                    budgetCategory.getCurrency(), planAmountOriginal, rateDate);
            BigDecimal factAmount = factAmountsByCategoryId.getOrDefault(categoryId, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            BigDecimal leftoverBase = planAmountBase.subtract(factAmount);
            result.add(BudgetCategoryDetailedDto.builder()
                    .id(budgetCategory.getId())
                    .budgetId(budgetCategory.getBudget().getId())
                    .category(budgetCategory.getCategory())
                    .type(budgetCategory.getType())
                    .planAmount(planAmountBase.setScale(2, RoundingMode.HALF_UP))
                    .factAmount(factAmount)
                    .leftover(leftoverBase.setScale(2, RoundingMode.HALF_UP))
                    .planAmountInBase(planAmountBase.setScale(2, RoundingMode.HALF_UP))
                    .factAmountInBase(factAmount)
                    .leftoverInBase(leftoverBase.setScale(2, RoundingMode.HALF_UP))
                    .currency(budgetCategory.getCurrency())
                    .planAmountOriginal(planAmountOriginal.setScale(2, RoundingMode.HALF_UP))
                    .comment(budgetCategory.getComment())
                    .build());
        }

        for (Map.Entry<Category, BigDecimal> entry : totalsByCategory.entrySet()) {
            Category category = entry.getKey();
            if (category == null || plannedCategoryIds.contains(category.getId())) {
                continue;
            }
            BigDecimal factAmount = entry.getValue().setScale(2, RoundingMode.HALF_UP);
            BigDecimal planAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            result.add(BudgetCategoryDetailedDto.builder()
                    .id(null)
                    .budgetId(budget.getId())
                    .category(category)
                    .type(category.getType())
                    .planAmount(planAmount)
                    .factAmount(factAmount)
                    .leftover(planAmount.subtract(factAmount))
                    .planAmountInBase(planAmount)
                    .factAmountInBase(factAmount)
                    .leftoverInBase(planAmount.subtract(factAmount))
                    .currency(budget.getBaseCurrency())
                    .planAmountOriginal(planAmount)
                    .comment(null)
                    .build());
        }

        return result;
    }

    List<CategoryDto> getCategories(UserApp userApp, UUID budgetId, CategoryType type, BudgetService budgetService, CategoryService categoryService, CategoryMapper categoryMapper) {
        return categoryMapper.toDtoList(budgetService.findCategoriesUnusedInBudget(userApp.getId(), budgetId, type), categoryService);
    }

    @AfterMapping
    void setBalanceAfterMapping(@MappingTarget BudgetDetailedDto budgetDetailedDto) {

        budgetDetailedDto.setTotalIncome(budgetDetailedDto.getIncomeBudgetCategories().stream().map(bc -> bc.getPlanAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        budgetDetailedDto.setTotalIncomeFact(budgetDetailedDto.getIncomeBudgetCategories().stream().map(bc -> bc.getFactAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        budgetDetailedDto.setTotalIncomeLeftover(budgetDetailedDto.getIncomeBudgetCategories().stream().map(bc -> bc.getLeftover()).reduce(BigDecimal.ZERO, BigDecimal::add));
        budgetDetailedDto.setTotalExpense(budgetDetailedDto.getExpenseBudgetCategories().stream().map(bc -> bc.getPlanAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        budgetDetailedDto.setTotalExpenseFact(budgetDetailedDto.getExpenseBudgetCategories().stream().map(bc -> bc.getFactAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        budgetDetailedDto.setTotalExpenseLeftover(budgetDetailedDto.getExpenseBudgetCategories().stream().map(bc -> bc.getLeftover()).reduce(BigDecimal.ZERO, BigDecimal::add));
        if (budgetDetailedDto.getBaseCurrency() == null && budgetDetailedDto.getUser() != null) {
            budgetDetailedDto.setBaseCurrency(budgetDetailedDto.getUser().getBaseCurrency());
        }
    }
}
