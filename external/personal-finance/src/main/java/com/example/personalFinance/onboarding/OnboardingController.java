package com.example.personalFinance.onboarding;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.onboarding.dto.AccountInputDTO;
import com.example.personalFinance.onboarding.CategoryTemplate;
import com.example.personalFinance.onboarding.CategoryTemplateI18n;
import com.example.personalFinance.onboarding.dto.CategoryTemplateOptionDTO;
import com.example.personalFinance.onboarding.repository.CategoryTemplateI18nRepository;
import com.example.personalFinance.onboarding.repository.CategoryTemplateRepository;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequiredArgsConstructor
public class OnboardingController {

    private static final String SESSION_ATTR = "onboardingSession";

    private final CategoryTemplateRepository categoryTemplateRepository;
    private final CategoryTemplateI18nRepository categoryTemplateI18nRepository;
    private final com.example.personalFinance.service.OnboardingService onboardingService;
    private final SecurityService securityService;
    private final UserService userService;
    private final CategoryService categoryService;
    private final AccountService accountService;
    private final LocalizationService localizationService;

    @GetMapping("/onboarding")
    public String onboarding(Model model, Locale locale, HttpSession session) {
        OnboardingSessionDTO dto = getSession(session);
        if (!StringUtils.hasText(dto.getInterfaceLanguage())) {
            dto.setInterfaceLanguage(localizationService.normalizeLanguage(
                    locale != null ? locale.toLanguageTag() : null));
        }
        List<CategoryTemplate> incomeTemplates = categoryTemplateRepository.findAllByType(CategoryType.INCOME);
        List<CategoryTemplate> expenseTemplates = categoryTemplateRepository.findAllByType(CategoryType.EXPENSES);
        String language = dto.getInterfaceLanguage();
        model.addAttribute("incomeTemplates", toTemplateOptions(incomeTemplates, language));
        model.addAttribute("expenseTemplates", toTemplateOptions(expenseTemplates, language));
        model.addAttribute("currencies", CurrencyCode.values());
        model.addAttribute("languages", localizationService.getLocaleOptions());
        model.addAttribute("selectedLanguage", dto.getInterfaceLanguage());
        model.addAttribute("selectedBaseCurrency", dto.getBaseCurrency());
        model.addAttribute("accounts", dto.getAccounts());
        return "onboarding/wizard";
    }

    @PostMapping("/onboarding/base-currency")
    @ResponseBody
    public void saveBaseCurrency(@RequestParam("currency") String currency,
                                 @RequestParam(value = "language", required = false) String language,
                                 HttpSession session) {
        OnboardingSessionDTO dto = getSession(session);
        dto.setBaseCurrency(CurrencyCode.valueOf(currency));
        if (StringUtils.hasText(language)) {
            dto.setInterfaceLanguage(localizationService.normalizeLanguage(language));
        }
        session.setAttribute(SESSION_ATTR, dto);
    }

    @PostMapping("/onboarding/income")
    @ResponseBody
    public void saveIncome(@RequestParam(value = "incomes", required = false) List<UUID> incomes,
                           HttpSession session) {
        OnboardingSessionDTO dto = getSession(session);
        dto.setIncomeIds(incomes);
        session.setAttribute(SESSION_ATTR, dto);
    }

    @PostMapping("/onboarding/expense")
    @ResponseBody
    public void saveExpense(@RequestParam(value = "expenses", required = false) List<UUID> expenses,
                            HttpSession session) {
        OnboardingSessionDTO dto = getSession(session);
        dto.setExpenseIds(expenses);
        session.setAttribute(SESSION_ATTR, dto);
    }

    @PostMapping("/onboarding/accounts")
    @ResponseBody
    public void saveAccounts(@RequestParam(value = "name", required = false) List<String> names,
                             @RequestParam(value = "type", required = false) List<String> types,
                             @RequestParam(value = "description", required = false) List<String> descriptions,
                             @RequestParam(value = "currency", required = false) List<String> currencies,
                             @RequestParam(value = "balance", required = false) List<String> balances,
                             HttpSession session) {
        OnboardingSessionDTO dto = getSession(session);
        List<AccountInputDTO> inputs = new ArrayList<>();
        if (names != null) {
            for (int i = 0; i < names.size(); i++) {
                String accountName = names.get(i);
                if (!StringUtils.hasText(accountName)) {
                    continue;
                }
                String accountType = getAt(types, i);
                String accountDescription = getAt(descriptions, i);
                String accountCurrency = getAt(currencies, i);
                String accountBalance = getAt(balances, i);
                inputs.add(new AccountInputDTO(
                        accountName.trim(),
                        resolveAccountTypeName(accountType),
                        accountDescription != null ? accountDescription.trim() : null,
                        resolveCurrency(accountCurrency, dto.getBaseCurrency()),
                        parseBalance(accountBalance)
                ));
            }
        }
        dto.setAccounts(inputs);
        session.setAttribute(SESSION_ATTR, dto);
    }

    @PostMapping("/onboarding/finish")
    @ResponseBody
    public void finish(HttpSession session) {
        String username = securityService.getCurrentUser();
        OnboardingSessionDTO dto = getSession(session);
            userService.findByName(username).ifPresent(u -> {
                UUID userId = u.getId();
                userService.setBaseCurrency(u, dto.getBaseCurrency());
                userService.updateInterfaceLanguage(u, dto.getInterfaceLanguage());
                if (dto.getIncomeIds() != null) {
                    List<CategoryTemplate> incomeTemplates = categoryTemplateRepository.findAllById(dto.getIncomeIds());
                    var incomeNames = loadTemplateNames(incomeTemplates, dto.getInterfaceLanguage());
                    incomeTemplates.forEach(t ->
                            categoryService.save(Category.builder()
                                    .userId(userId)
                                    .name(incomeNames.getOrDefault(t.getId(), t.getCode()))
                                    .description("")
                                    .type(CategoryType.INCOME)
                                    .disabled(false)
                                    .icon(t.getIcon())
                                    .categoryTemplateId(t.getId())
                                    .build())
                    );
                }
                if (dto.getExpenseIds() != null) {
                    List<CategoryTemplate> expenseTemplates = categoryTemplateRepository.findAllById(dto.getExpenseIds());
                    var expenseNames = loadTemplateNames(expenseTemplates, dto.getInterfaceLanguage());
                    expenseTemplates.forEach(t ->
                            categoryService.save(Category.builder()
                                    .userId(userId)
                                    .name(expenseNames.getOrDefault(t.getId(), t.getCode()))
                                    .description("")
                                    .type(CategoryType.EXPENSES)
                                    .disabled(false)
                                    .icon(t.getIcon())
                                    .categoryTemplateId(t.getId())
                                    .build())
                    );
                }
            if (dto.getAccounts() != null) {
                dto.getAccounts().forEach(a -> {
                    Account account = Account.builder()
                            .name(a.getName())
                            .description(a.getDescription())
                            .type(resolveAccountType(a.getType()))
                            .userId(userId)
                            .currency(a.getCurrency() != null ? a.getCurrency() : dto.getBaseCurrency())
                            .build();
                    Account saved = accountService.save(userId, account);
                    if (saved != null && saved.getId() != null) {
                        BigDecimal balance = a.getInitialBalance() != null ? a.getInitialBalance() : BigDecimal.ZERO;
                        if (balance.compareTo(BigDecimal.ZERO) != 0) {
                            accountService.createChangeBalance(userId, saved.getId(), balance, Instant.now().getEpochSecond());
                        }
                    }
                });
            }
            onboardingService.markCompleted(u.getId());
        });
        session.removeAttribute(SESSION_ATTR);
    }

    private CurrencyCode resolveCurrency(String currency, CurrencyCode fallback) {
        if (!StringUtils.hasText(currency)) {
            return fallback;
        }
        try {
            return CurrencyCode.valueOf(currency.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }

    private AccountType resolveAccountType(String type) {
        return AccountType.valueOf(resolveAccountTypeName(type));
    }

    private String resolveAccountTypeName(String type) {
        if (!StringUtils.hasText(type)) {
            return AccountType.CASH.name();
        }
        try {
            return AccountType.valueOf(type.trim().toUpperCase(Locale.ROOT)).name();
        } catch (IllegalArgumentException ex) {
            return AccountType.CASH.name();
        }
    }

    private BigDecimal parseBalance(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(rawValue.trim());
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }

    private <T> T getAt(List<T> values, int index) {
        if (values == null || index < 0 || index >= values.size()) {
            return null;
        }
        return values.get(index);
    }

    private OnboardingSessionDTO getSession(HttpSession session) {
        OnboardingSessionDTO dto = (OnboardingSessionDTO) session.getAttribute(SESSION_ATTR);
        if (dto == null) {
            dto = new OnboardingSessionDTO();
            session.setAttribute(SESSION_ATTR, dto);
        }
        return dto;
    }

    private List<CategoryTemplateOptionDTO> toTemplateOptions(List<CategoryTemplate> templates, String language) {
        Map<UUID, String> names = loadTemplateNames(templates, language);
        return templates.stream()
                .map(t -> new CategoryTemplateOptionDTO(
                        t.getId(),
                        t.getIcon(),
                        names.getOrDefault(t.getId(), t.getCode())))
                .toList();
    }

    private Map<UUID, String> loadTemplateNames(List<CategoryTemplate> templates, String language) {
        List<UUID> ids = templates.stream().map(CategoryTemplate::getId).toList();
        return loadTemplateNames(ids, language);
    }

    private Map<UUID, String> loadTemplateNames(Collection<UUID> templateIds, String language) {
        if (templateIds == null || templateIds.isEmpty()) {
            return Map.of();
        }
        String normalizedLanguage = localizationService.normalizeLanguage(language);
        Map<UUID, String> localized = new HashMap<>(fetchTranslations(templateIds, normalizedLanguage));
        String defaultLanguage = localizationService.getDefaultLanguage();
        if (!defaultLanguage.equals(normalizedLanguage)) {
            fetchTranslations(templateIds, defaultLanguage).forEach(localized::putIfAbsent);
        }
        return localized;
    }

    private Map<UUID, String> fetchTranslations(Collection<UUID> templateIds, String language) {
        return categoryTemplateI18nRepository
                .findAllByCategoryTemplateIdInAndLocaleIgnoreCase(templateIds, language)
                .stream()
                .collect(Collectors.toMap(
                        CategoryTemplateI18n::getCategoryTemplateId,
                        CategoryTemplateI18n::getName,
                        (existing, ignored) -> existing));
    }
}
