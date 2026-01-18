package com.example.personalFinance.web;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.dto.BudgetDetailedDto;
import com.example.personalFinance.dto.BudgetDto;
import com.example.personalFinance.exception.DuplicateBudgetException;
import com.example.personalFinance.exception.DuplicateCategoryException;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.BudgetCategoryMapper;
import com.example.personalFinance.mapper.BudgetDetailedMapper;
import com.example.personalFinance.mapper.BudgetMapper;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.*;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.*;
import com.example.personalFinance.usecase.GetCategorySelectListForBudgetUseCase;
import com.example.personalFinance.utils.DateTimeUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.example.personalFinance.utils.DateTimeUtils.*;

@Controller
public class BudgetController {
    @Autowired
    UserBudgetService userBudgetService;

    @Autowired
    BudgetService budgetService;

    @Autowired
    TransactionService transactionService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    SecurityService securityService;

    @Autowired
    UserService userService;

    @Autowired
    BudgetMapper budgetMapper;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    BudgetCategoryMapper budgetCategoryMapper;

    @Autowired
    BudgetDetailedMapper budgetDetailedMapper;

    @Autowired
    GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;


    private static final int BUDGETS_PAGE_SIZE = 20;

    @GetMapping("/budgets")
    public String showBudgets(@RequestParam(value = "page", defaultValue = "1") int page, Model model) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        int pageIndex = Math.max(page - 1, 0);
        PageRequest pageRequest = PageRequest.of(pageIndex, BUDGETS_PAGE_SIZE, Sort.by("month").descending());
        Page<Budget> budgetsPage = userBudgetService.getBudgetsByUser(currentUserDetails, pageRequest);
        if (budgetsPage.getTotalPages() > 0 && pageIndex >= budgetsPage.getTotalPages()) {
            pageIndex = budgetsPage.getTotalPages() - 1;
            pageRequest = PageRequest.of(pageIndex, BUDGETS_PAGE_SIZE, Sort.by("month").descending());
            budgetsPage = userBudgetService.getBudgetsByUser(currentUserDetails, pageRequest);
        }
        model.addAttribute("budgetsPage", budgetsPage);
        model.addAttribute("budgets", budgetsPage.getContent());
        model.addAttribute("currentPage", pageIndex + 1);
        model.addAttribute("totalPages", budgetsPage.getTotalPages());
        return "budgets";
    }

    @GetMapping("/budgets/add")
    public String addBudget(Model model) {
        if (!model.containsAttribute("budget")) {
            model.addAttribute("budget", new BudgetDto());
        }
        return "budget-add";
    }

    @GetMapping("/budgets/{id}/copy")
    public String addCopyBudget(Model model, @PathVariable(value = "id") String id) {
        if (!model.containsAttribute("baseBudget")) {
            UserDetails userDetail = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> maybeUser = userService.findByName(userDetail.getUsername());
            Budget baseBudget = userBudgetService.findBudget(userDetail, UUID.fromString(id));
            BudgetDto baseBudgetDto = budgetMapper.toDto(baseBudget);
            model.addAttribute("baseBudget", baseBudgetDto);
            model.addAttribute("baseMonth", baseBudgetDto.getMonth());
            model.addAttribute("newMonth", convertLocalDateToString(LocalDate.now()));
        }
        return "budget-copy-add";
    }

    @GetMapping("/budgets/{id}")
    public String editBudget(@PathVariable(value = "id") UUID id, Model model, HttpServletResponse response) {
        response.setContentType(MediaType.TEXT_HTML_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        populateBudgetDetails(id, model);
        if (model.containsAttribute("message")) {
            return "error";
        }
        return "budget-details";
    }

    @GetMapping("/budget/category/{id}")
    public String editBudgetCategory(@PathVariable(value = "id") String id, Model model) {
        if (!model.containsAttribute("errorMessage")) {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            BudgetCategory budgetCategory;
            try {
                budgetCategory = userBudgetService.findBudgetCategoryById(UUID.fromString(id));
                model.addAttribute("budgetCategory", budgetCategoryMapper.toDto(budgetCategory, budgetService));
                List<Category> categoriesToChoose = userBudgetService.findCategoriesUnusedInBudget(currentUserDetails,
                        budgetCategory.getBudget().getId(), budgetCategory.getCategory().getType());
                categoriesToChoose.add(budgetCategory.getCategory());

                model.addAttribute("categoriesToChoose", getCategorySelectListForBudgetUseCase.getCategorySelectListForBudgetUseCase(currentUserDetails,
                        categoriesToChoose));
                model.addAttribute("currentCategory", budgetCategory.getCategory());
                model.addAttribute("baseCurrency", budgetCategory.getBudget().getBaseCurrency());
            } catch (NonExistedException e) {
                model.addAttribute("message", "There is no budget category with such id!");
                return "error";
            }
        }
        Object attr = model.asMap().get("budgetCategory");
        if (attr instanceof BudgetCategoryDto dto) {
            budgetService.findBudgetAdmin(dto.getBudgetId())
                    .map(Budget::getBaseCurrency)
                    .ifPresent(currency -> model.addAttribute("baseCurrency", currency));
        }
        model.addAttribute("currencies", CurrencyCode.values());
        return "budget-category-details";
    }

    @PostMapping("/budgets")
    public String saveNewBudget(@Valid @ModelAttribute("budget") BudgetDto budgetDto, BindingResult result, @RequestParam String month,
                                RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("budget", budgetDto);
            return "budget-add";
        }
        Budget budget;
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            budget = userBudgetService.addBudget(currentUserDetails.getUsername(), month, BigDecimal.ZERO, BigDecimal.ZERO);
        } catch (DuplicateBudgetException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "The budget is existed within this month! New budget couldn't be saved!");
            redirectAttributes.addFlashAttribute("budget", new BudgetDto(month, BigDecimal.ZERO, BigDecimal.ZERO));
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/budgets/" + budget.getId();
    }

    @PutMapping("/budgets/{id}")
    public String saveBudgetChanges(
            @PathVariable(value = "id") String id, @ModelAttribute("budget") BudgetDto budgetDto,
            BindingResult result, @RequestParam String month,
            @RequestParam double totalIncome, @RequestParam double totalExpense
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("budget", budgetDto);
            populateBudgetDetails(UUID.fromString(id), model);
            return "budget-details";
        }
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            userBudgetService.saveBudget(currentUserDetails, UUID.fromString(id), month, BigDecimal.valueOf(totalIncome), BigDecimal.valueOf(totalExpense));
        } catch (DuplicateBudgetException e) {
            budgetDto.setMonth(month);
            budgetDto.setTotalIncome(BigDecimal.valueOf(totalIncome));
            budgetDto.setTotalExpense(BigDecimal.valueOf(totalExpense));
            redirectAttributes.addFlashAttribute("errorMessage", "The budget is existed within this month! Changes to budget couldn't be saved!");
            redirectAttributes.addFlashAttribute("budget", budgetDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        } catch (NonExistedException e) {
            budgetDto.setMonth(month);
            budgetDto.setTotalIncome(BigDecimal.valueOf(totalIncome));
            budgetDto.setTotalExpense(BigDecimal.valueOf(totalExpense));
            redirectAttributes.addFlashAttribute("errorMessage", "The budget is not exist!");
            redirectAttributes.addFlashAttribute("budget", budgetDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/budgets";
    }

    @PostMapping("/budgets/{id}/copy")
    public String cloneBudget(
            @PathVariable(value = "id") UUID id, @ModelAttribute("baseBudget") BudgetDto baseBudget,
            BindingResult result, @RequestParam String newMonth,
            RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> userOptional = userService.findByName(currentUserDetails.getUsername());
        if (userOptional.isPresent()) {
            try {
                budgetService.cloneBudget(userOptional.get().getId(), baseBudget.getId(), DateTimeUtils.convertStringToLocalDate(newMonth));
            } catch (DuplicateBudgetException e) {
                redirectAttributes.addFlashAttribute("errorMessage", "The budget is existed within this month! New budget couldn't be saved!");
                redirectAttributes.addFlashAttribute("baseBudget", baseBudget);
                redirectAttributes.addFlashAttribute("newMonth", newMonth);
                String referer = request.getHeader("Referer");
                return "redirect:" + referer;
            }
        }
        return "redirect:/budgets";
    }

    @PutMapping("/budget/categories/{id}")
    public String saveBudgetChanges(
            @PathVariable(value = "id") UUID id, @ModelAttribute("budgetCategory") BudgetCategoryDto budgetCategoryDto,
            BindingResult result
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("budgetCategory", budgetCategoryDto);
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            List<Category> categoriesToChoose = userBudgetService.findCategoriesUnusedInBudget(currentUserDetails,
                    budgetCategoryDto.getBudgetId(), budgetCategoryDto.getType());
            if (budgetCategoryDto.getCategory() != null && categoriesToChoose.stream().noneMatch(c -> c.getId().equals(budgetCategoryDto.getCategory().getId()))) {
                categoriesToChoose.add(budgetCategoryDto.getCategory());
            }
            model.addAttribute("categoriesToChoose", getCategorySelectListForBudgetUseCase.getCategorySelectListForBudgetUseCase(currentUserDetails,
                    categoriesToChoose));
            model.addAttribute("currentCategory", budgetCategoryDto.getCategory());
            model.addAttribute("currencies", CurrencyCode.values());
            budgetService.findBudgetAdmin(budgetCategoryDto.getBudgetId())
                    .map(Budget::getBaseCurrency)
                    .ifPresent(currency -> model.addAttribute("baseCurrency", currency));
            return "budget-category-details";
        }
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        budgetService.saveBudgetCategory(budgetCategoryDto.getBudgetId(), budgetCategoryMapper.toModel(budgetCategoryDto, budgetService));
        return "redirect:/budgets/" + budgetCategoryDto.getBudgetId();
    }

    @DeleteMapping("/budgets/{id}")
    public String deleteBudget(@PathVariable(value = "id") String id) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        userBudgetService.deleteBudget(currentUserDetails, UUID.fromString(id));
        return "redirect:/budgets";
    }

    @GetMapping("/budget/categories/add")
    public String addCategoryToBudget(Model model, @RequestParam(value = "budgetId") String budgetId,
                                      @RequestParam(value = "type") String type,
                                      @RequestParam(value = "categoryId", required = false) String categoryId) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        BudgetCategoryDto budgetCategoryDto = new BudgetCategoryDto();
        budgetCategoryDto.setBudgetId(UUID.fromString(budgetId));
        budgetCategoryDto.setType(CategoryType.valueOf(type));
        if (categoryId != null) {
            Optional<UserApp> maybeUser = userService.findByName(currentUserDetails.getUsername());
            maybeUser.flatMap(user -> categoryService.findById(user.getId(), UUID.fromString(categoryId)))
                    .ifPresent(budgetCategoryDto::setCategory);
        }
        try {
            Budget budget = userBudgetService.findBudget(currentUserDetails, UUID.fromString(budgetId));
            if (budget != null && budget.getBaseCurrency() != null) {
                budgetCategoryDto.setCurrency(budget.getBaseCurrency());
                model.addAttribute("baseCurrency", budget.getBaseCurrency());
            }
        } catch (NonExistedException e) {
            model.addAttribute("message", "There is no budget with such id!");
            return "error";
        }
        model.addAttribute("budgetCategory", budgetCategoryDto);
        List<Category> categoriesToChoose = userBudgetService.findCategoriesUnusedInBudget(currentUserDetails, UUID.fromString(budgetId), CategoryType.valueOf(type));
        if (budgetCategoryDto.getCategory() != null && categoriesToChoose.stream().noneMatch(c -> c.getId().equals(budgetCategoryDto.getCategory().getId()))) {
            categoriesToChoose.add(budgetCategoryDto.getCategory());
        }

        model.addAttribute("categoriesToChoose", getCategorySelectListForBudgetUseCase.getCategorySelectListForBudgetUseCase(currentUserDetails,
                categoriesToChoose));
        model.addAttribute("currencies", CurrencyCode.values());
        return "budget-category-add";
    }

    @PostMapping("/budget/categories")
    public String saveNewBudgetCategory(@Valid @ModelAttribute("budgetCategory") BudgetCategoryDto budgetCategoryDto, BindingResult result
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("budgetCategory", budgetCategoryDto);
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            List<Category> categoriesToChoose = userBudgetService.findCategoriesUnusedInBudget(currentUserDetails,
                    budgetCategoryDto.getBudgetId(), budgetCategoryDto.getType());
            model.addAttribute("categoriesToChoose", getCategorySelectListForBudgetUseCase.getCategorySelectListForBudgetUseCase(currentUserDetails,
                    categoriesToChoose));
            model.addAttribute("currencies", CurrencyCode.values());
            budgetService.findBudgetAdmin(budgetCategoryDto.getBudgetId())
                    .map(Budget::getBaseCurrency)
                    .ifPresent(currency -> model.addAttribute("baseCurrency", currency));
            return "budget-category-add";
        }
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            userBudgetService.addBudgetCategory(currentUserDetails, budgetCategoryDto);

        } catch (DuplicateCategoryException e) {
            redirectAttributes.addFlashAttribute("errorMessage"
                    , "The budget category with this name is existed! Duplicated category couldn't be saved!");
            redirectAttributes.addFlashAttribute("budgetCategory", budgetCategoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        } catch (NumberFormatException e) {
            redirectAttributes.addFlashAttribute("errorMessage"
                    , "It's impossible to add zero amount to budget!");
            redirectAttributes.addFlashAttribute("budgetCategory", budgetCategoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }

        return "redirect:/budgets/" + budgetCategoryDto.getBudgetId();
    }

    @DeleteMapping("/budget/categories/{id}")
    public String deleteBudgetCategory(@PathVariable(value = "id") String id
            , RedirectAttributes redirectAttributes, HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        BudgetCategory budgetCategory = userBudgetService.findBudgetCategoryById(UUID.fromString(id));
        Budget budget = budgetCategory.getBudget();
        boolean success = userBudgetService.deleteBudgetCategory(currentUserDetails, budget.getId(), UUID.fromString(id));
        if (!success) {

            BudgetCategoryDto budgetCategoryDto = budgetCategoryMapper.toDto(budgetCategory, budgetService);
            redirectAttributes.addFlashAttribute("errorMessage", "Error is happened during deleting budget category!");
            redirectAttributes.addFlashAttribute("budgetCategory", budgetCategoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/budgets/" + budget.getId();
    }

    private void populateBudgetDetails(UUID id, Model model) {
        UserDetails userDetail = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            Budget budget = userBudgetService.findBudget(userDetail, id);
            BudgetDetailedDto budgetDetailedDto = budgetDetailedMapper.toDto(budget, budgetService,
                    transactionService, categoryService, categoryMapper);
            if (!model.containsAttribute("budget")) {
                model.addAttribute("budget", budgetMapper.toDto(budget));
            }
            model.addAttribute("budgetDetails", budgetDetailedDto);
            model.addAttribute("baseCurrency", budgetDetailedDto.getBaseCurrency());
            model.addAttribute("totalIncome", budgetDetailedDto.getTotalIncome());
            model.addAttribute("totalExpenses", budgetDetailedDto.getTotalExpense());
            model.addAttribute("incomeFactTotal", budgetDetailedDto.getTotalIncomeFact());
            model.addAttribute("expenseFactTotal", budgetDetailedDto.getTotalExpenseFact());

            List<BudgetCategory> incomeCategoryList = new ArrayList<>(budgetService.findBudgetCategories(id, CategoryType.INCOME));
            List<BudgetCategory> expensesCategoryList = new ArrayList<>(budgetService.findBudgetCategories(id, CategoryType.EXPENSES));

            UUID userId = budget.getUser().getId();
            Long periodStart = getStartOfMonth(budget.getMonth());
            Long periodEnd = getEndOfMonth(budget.getMonth());

            Map<Category, BigDecimal> incomeFacts = transactionService.calculateTotalsByCategoryTypeForPeriod(userId,
                    CategoryType.INCOME,
                    periodStart,
                    periodEnd);

            Map<Category, BigDecimal> expenseFacts = transactionService.calculateTotalsByCategoryTypeForPeriod(userId,
                    CategoryType.EXPENSES,
                    periodStart,
                    periodEnd);

            augmentWithFactOnlyCategories(budget, incomeCategoryList, incomeFacts);
            augmentWithFactOnlyCategories(budget, expensesCategoryList, expenseFacts);

            model.addAttribute("incomeCategoryList", incomeCategoryList);
            model.addAttribute("expensesCategoryList", expensesCategoryList);
            model.addAttribute("incomeFactAmountMap", buildFactMapByName(incomeFacts));
            model.addAttribute("expenseFactAmountMap", buildFactMapByName(expenseFacts));

            model.addAttribute("incomeFactTotal", incomeFacts.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP));
            model.addAttribute("expenseFactTotal", expenseFacts.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP));
            model.addAttribute("totalIncome", budgetService.calculateBudgetTotal(id, CategoryType.INCOME));
            model.addAttribute("totalExpenses", budgetService.calculateBudgetTotal(id, CategoryType.EXPENSES));
            model.addAttribute("mapExpenses", budgetService.calculateBudgetTotal(id, CategoryType.EXPENSES));
        } catch (NonExistedException e) {
            model.addAttribute("message", "There is no budget with such id!");
        }
    }

    private void augmentWithFactOnlyCategories(Budget budget,
                                               List<BudgetCategory> plannedCategories,
                                               Map<Category, BigDecimal> factTotals) {
        Set<UUID> plannedCategoryIds = plannedCategories.stream()
                .map(budgetCategory -> budgetCategory.getCategory().getId())
                .collect(Collectors.toSet());

        factTotals.forEach((category, total) -> {
            if (category != null && !plannedCategoryIds.contains(category.getId())) {
                CurrencyCode displayCurrency = Optional.ofNullable(budget.getBaseCurrency())
                        .orElseGet(() -> budget.getUser() != null && budget.getUser().getBaseCurrency() != null
                                ? budget.getUser().getBaseCurrency()
                                : CurrencyCode.USD);
                plannedCategories.add(BudgetCategory.builder()
                        .budget(budget)
                        .category(category)
                        .type(category.getType())
                        .amount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .comment(null)
                        .currency(displayCurrency)
                        .build());
            }
        });

        plannedCategories.sort(Comparator.comparing(budgetCategory -> budgetCategory.getCategory().getName(), String.CASE_INSENSITIVE_ORDER));
    }

    private Map<String, BigDecimal> buildFactMapByName(Map<Category, BigDecimal> factTotals) {
        return factTotals.entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .collect(Collectors.toMap(entry -> entry.getKey().getName(),
                        Map.Entry::getValue,
                        BigDecimal::add,
                        LinkedHashMap::new));
    }
}
