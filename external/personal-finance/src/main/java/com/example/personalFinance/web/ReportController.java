package com.example.personalFinance.web;

import com.example.personalFinance.dto.report.CategoryMonthlyExpenseReport;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.CategoryExpenseReportService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.export.CategoryExpenseReportExportMapper;
import com.example.personalFinance.export.ExportFormat;
import com.example.personalFinance.export.ExportServiceFactory;
import com.example.personalFinance.export.ExportedFile;
import com.example.personalFinance.export.TabularReportExportModel;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.util.UriUtils;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Locale;
import java.nio.charset.StandardCharsets;

@Controller
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final SecurityService securityService;
    private final UserService userService;
    private final CategoryService categoryService;
    private final CategoryExpenseReportService categoryExpenseReportService;
    private final LocalizationService localizationService;
    private final ExportServiceFactory exportServiceFactory;
    private final CategoryExpenseReportExportMapper categoryExpenseReportExportMapper;

    @GetMapping
    public String reportsIndex() {
        return "reports";
    }

    @GetMapping("/category-expenses")
    public String categoryExpensesReport(Model model,
                                         @RequestParam(value = "startMonth", required = false)
                                         @DateTimeFormat(pattern = "yyyy-MM") YearMonth startMonth,
                                         @RequestParam(value = "endMonth", required = false)
                                         @DateTimeFormat(pattern = "yyyy-MM") YearMonth endMonth,
                                         @RequestParam(value = "categoryId", required = false) UUID categoryId) {
        Optional<UserApp> maybeUser = userService.findByName(securityService.getCurrentUser());
        if (maybeUser.isEmpty()) {
            model.addAttribute("message", "User is not authorized!");
            return "error";
        }

        UserApp user = maybeUser.get();
        UUID userId = user.getId();
        Locale userLocale = localizationService.resolveLocale(user.getInterfaceLanguage());
        List<Category> categories = categoryService.findByUserAndTypeOrderByParentId(userId, CategoryType.EXPENSES, false);
        model.addAttribute("categoryOptions", buildCategoryOptions(categories));
        model.addAttribute("baseCurrency", user.getBaseCurrency());

        Category selectedCategory = null;
        if (categoryId != null) {
            selectedCategory = categoryService.findById(userId, categoryId).orElse(null);
            if (selectedCategory == null) {
                model.addAttribute("reportErrorMessage", "reports.categoryNotFound");
            }
        }

        model.addAttribute("selectedCategoryId", categoryId);
        model.addAttribute("startMonth", startMonth);
        model.addAttribute("endMonth", endMonth);
        Locale monthLocale = localizationService.resolveDateLocale(userLocale);
        model.addAttribute("monthLocale", monthLocale);

        boolean filtersProvided = startMonth != null || endMonth != null || categoryId != null;
        if (filtersProvided) {
            if (startMonth == null || endMonth == null) {
                model.addAttribute("reportErrorMessage", "reports.periodRequired");
            } else if (selectedCategory != null || categoryId == null) {
                try {
                    CategoryMonthlyExpenseReport report = categoryExpenseReportService
                            .buildCategoryMonthlyReport(userId, startMonth, endMonth, selectedCategory);
                    model.addAttribute("report", report);
                } catch (IllegalArgumentException ex) {
                    model.addAttribute("reportErrorMessage", "reports.periodInvalid");
                }
            }
        }

        return "report-category-expenses";
    }

    @GetMapping("/category-expenses/export")
    public ResponseEntity<ByteArrayResource> exportCategoryExpenses(@RequestParam(value = "startMonth", required = false)
                                                                    @DateTimeFormat(pattern = "yyyy-MM") YearMonth startMonth,
                                                                    @RequestParam(value = "endMonth", required = false)
                                                                    @DateTimeFormat(pattern = "yyyy-MM") YearMonth endMonth,
                                                                    @RequestParam(value = "categoryId", required = false) UUID categoryId,
                                                                    @RequestParam(value = "format", required = false, defaultValue = "XLSX") String formatParam) {
        Optional<UserApp> maybeUser = userService.findByName(securityService.getCurrentUser());
        if (maybeUser.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        ExportFormat format = resolveFormat(formatParam);
        if (format == null) {
            return ResponseEntity.badRequest().build();
        }

        if (startMonth == null || endMonth == null) {
            return ResponseEntity.badRequest().build();
        }

        UserApp user = maybeUser.get();
        UUID userId = user.getId();
        Category selectedCategory = null;
        if (categoryId != null) {
            selectedCategory = categoryService.findById(userId, categoryId).orElse(null);
            if (selectedCategory == null) {
                return ResponseEntity.notFound().build();
            }
        }

        try {
            CategoryMonthlyExpenseReport report = categoryExpenseReportService
                    .buildCategoryMonthlyReport(userId, startMonth, endMonth, selectedCategory);
            Locale userLocale = localizationService.resolveLocale(user.getInterfaceLanguage());
            Locale monthLocale = localizationService.resolveDateLocale(userLocale);
            TabularReportExportModel exportModel = categoryExpenseReportExportMapper
                    .toTabularModel(report,
                            userLocale,
                            monthLocale,
                            String.valueOf(user.getBaseCurrency()),
                            startMonth,
                            endMonth,
                            selectedCategory);
            ExportedFile exportedFile = exportServiceFactory.export(exportModel, format);
            ByteArrayResource resource = new ByteArrayResource(exportedFile.content());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(exportedFile.contentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename="
                            + UriUtils.encodePath(exportedFile.fileName(), StandardCharsets.UTF_8))
                    .body(resource);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    private ExportFormat resolveFormat(String value) {
        if (value == null || value.isBlank()) {
            return ExportFormat.XLSX;
        }
        try {
            return ExportFormat.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private List<CategoryOption> buildCategoryOptions(List<Category> categories) {
        Map<UUID, List<Category>> childrenByParent = new HashMap<>();
        List<Category> roots = new ArrayList<>();

        for (Category category : categories) {
            if (category.getParentId() == null) {
                roots.add(category);
            } else {
                childrenByParent
                        .computeIfAbsent(category.getParentId(), id -> new ArrayList<>())
                        .add(category);
            }
        }

        Comparator<Category> comparator = Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER);
        roots.sort(comparator);
        childrenByParent.values().forEach(list -> list.sort(comparator));

        List<CategoryOption> options = new ArrayList<>();
        roots.forEach(root -> collectCategoryOptions(root, 0, childrenByParent, options));
        return options;
    }

    private void collectCategoryOptions(Category category,
                                        int depth,
                                        Map<UUID, List<Category>> childrenByParent,
                                        List<CategoryOption> result) {
        result.add(new CategoryOption(category.getId(), formatDisplayName(category.getName(), depth)));

        List<Category> children = childrenByParent.getOrDefault(category.getId(), List.of());
        children.forEach(child -> collectCategoryOptions(child, depth + 1, childrenByParent, result));
    }

    private String formatDisplayName(String name, int depth) {
        if (depth <= 0) {
            return name;
        }
        return String.join("", java.util.Collections.nCopies(depth, "— ")) + name;
    }

    private record CategoryOption(UUID id, String displayName) {
    }
}
