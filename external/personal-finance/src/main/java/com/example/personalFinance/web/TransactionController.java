package com.example.personalFinance.web;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.export.ExportFormat;
import com.example.personalFinance.export.ExportServiceFactory;
import com.example.personalFinance.export.ExportedFile;
import com.example.personalFinance.export.TabularReportExportModel;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.mapper.TransactionMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.*;
import com.example.personalFinance.service.export.TransactionExportMapper;
import com.example.personalFinance.usecase.CategorySelectGroup;
import com.example.personalFinance.usecase.GetCategorySelectListForBudgetUseCase;
import com.example.personalFinance.utils.DateTimeUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.util.UriUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

@Controller
public class TransactionController {
    @Autowired
    UserCategoryService userCategoryService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    TransactionService transactionService;

    @Autowired
    AccountService accountService;

    @Autowired
    UserService userService;

    @Autowired
    SecurityService securityService;

    @Autowired
    LocalizationService localizationService;

    @Autowired
    TransactionMapper transactionMapper;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;

    @Autowired
    ExportServiceFactory exportServiceFactory;

    @Autowired
    TransactionExportMapper transactionExportMapper;


    private static final int TRANSACTIONS_PER_PAGE = 20;

    private static final String TRANSFER_MANAGEMENT_ERROR = "Transfer transactions can only be managed via the transfer feature.";

    private static final String TRANSACTION_FILTER_START_ATTR = "transactions.filter.startDate";
    private static final String TRANSACTION_FILTER_END_ATTR = "transactions.filter.endDate";
    private static final String TRANSACTION_FILTER_ACCOUNT_ATTR = "transactions.filter.accountId";
    private static final String TRANSACTION_FILTER_TYPE_ATTR = "transactions.filter.type";

    @GetMapping("/transactions")
    public String getTransactionsPage(Model model,
                                      @RequestParam(value = "page", defaultValue = "1") int page,
                                      @RequestParam(value = "startDate", required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                      @RequestParam(value = "endDate", required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                      @RequestParam(value = "accountId", required = false) UUID accountId,
                                      @RequestParam(value = "type", required = false) TransactionType transactionType,
                                      HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isPresent()) {
            TransactionFilter filter = resolveTransactionFilter(request, startDate, endDate, accountId, transactionType);

            int pageNumber = Math.max(page, 1) - 1;
            Pageable pageable = PageRequest.of(pageNumber, TRANSACTIONS_PER_PAGE, Sort.by(Sort.Direction.DESC, "date"));

            Long startEpoch = DateTimeUtils.getStartOfDay(filter.startDate());
            Long endEpoch = DateTimeUtils.getEndOfDay(filter.endDate());

            Page<TransactionDto> transactionsPage = transactionService.findByUserIdAndPeriod(
                    user.get().getId(), startEpoch, endEpoch, filter.accountId(), filter.transactionType(), pageable);

            model.addAttribute("transactionsPage", transactionsPage);
            model.addAttribute("transactions", transactionsPage.getContent());
            model.addAttribute("totalPages", transactionsPage.getTotalPages());
            model.addAttribute("currentPage", transactionsPage.getTotalPages() == 0 ? 1 : transactionsPage.getNumber() + 1);
            model.addAttribute("totalElements", transactionsPage.getTotalElements());
            model.addAttribute("pageSize", TRANSACTIONS_PER_PAGE);
            model.addAttribute("startDate", filter.startDate());
            model.addAttribute("endDate", filter.endDate());
            model.addAttribute("accounts", accountService.findByUserId(user.get().getId()));
            model.addAttribute("transactionTypes", getFilterableTransactionTypes());
            model.addAttribute("selectedAccountId", filter.accountId());
            model.addAttribute("selectedTransactionType", filter.transactionType());
            model.addAttribute("baseCurrency", user.get().getBaseCurrency());
            model.addAttribute("transactionsReturnUrl", buildTransactionsReturnUrl(request));
            return "transactions";
        }
        model.addAttribute("message", "user is not authorized!");
        return "error";
    }

    @GetMapping("/transactionsByCategory")
    public String getTransactionsByCategoryAndMonth(Model model, @RequestParam(value = "categoryId") String categoryId,
                                                    @RequestParam(value = "month") String month,
                                                    HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isPresent()) {
            List<TransactionDto> transactions = transactionService.findByUserIdAndCategoryIdAndMonth(user.get().getId(),
                    UUID.fromString(categoryId), month);
            model.addAttribute("transactions", transactions);
            model.addAttribute("transactionsPage", new PageImpl<>(transactions));
            model.addAttribute("totalPages", transactions.isEmpty() ? 0 : 1);
            model.addAttribute("currentPage", 1);
            model.addAttribute("totalElements", transactions.size());
            model.addAttribute("pageSize", TRANSACTIONS_PER_PAGE);
            model.addAttribute("startDate", null);
            model.addAttribute("endDate", null);
            model.addAttribute("accounts", accountService.findByUserId(user.get().getId()));
            model.addAttribute("transactionTypes", getFilterableTransactionTypes());
            model.addAttribute("selectedAccountId", null);
            model.addAttribute("selectedTransactionType", null);
            model.addAttribute("category",
                    "Category: " + categoryService.findById(user.get().getId(), UUID.fromString(categoryId)).orElse(new Category()).getName());
            model.addAttribute("month", "Month: " + month);
            model.addAttribute("total", transactions.stream().map(TransactionDto::getAmountInBase).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2));
            model.addAttribute("baseCurrency", user.get().getBaseCurrency());
            model.addAttribute("transactionsReturnUrl", buildTransactionsReturnUrl(request));
            return "transactions";
        }
        model.addAttribute("message", "user is not authorized!");
        return "error";
    }

    @GetMapping("/transactions/add")
    public String addTransaction(Model model, @RequestParam(value = "type", defaultValue = "EXPENSES") String type) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isPresent()) {
            TransactionDto transactionDto = new TransactionDto();
            applyDefaultType(transactionDto, type);
            model.addAttribute("transaction", transactionDto);
            model.addAttribute("accounts", accountService.findByUserId(user.get().getId()));
            addCategoriesToModel(currentUserDetails, model);
            model.addAttribute("type", type);
            return "transaction-add";
        } else {
            model.addAttribute("message", "There is no account with such id!");
            return "error";
        }
    }

    @PostMapping("/transactions")
    public String saveNewTransaction(@Valid @ModelAttribute("transaction") TransactionDto transactionDto, BindingResult result
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("transaction", transactionDto);
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
            user.ifPresent(userApp -> {
                updateTransactionCategory(transactionDto, userApp.getId());
                updateTransactionAccount(transactionDto, userApp.getId());
                model.addAttribute("accounts", accountService.findByUserId(userApp.getId()));
            });
            addCategoriesToModel(currentUserDetails, model);
            return "transaction-add";
        }
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
            user.ifPresent(userApp -> {
                transactionDto.setUser(userApp);
                updateTransactionCategory(transactionDto, userApp.getId());
                updateTransactionAccount(transactionDto, userApp.getId());
                transactionService.save(transactionMapper.toModel(transactionDto));
            });

        } catch (NumberFormatException e) {
            redirectAttributes.addFlashAttribute("errorMessage"
                    , "It's impossible to add transaction with  zero amount!");
            redirectAttributes.addFlashAttribute("transaction", transactionDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }

        return "redirect:/transactions";
    }

    @GetMapping("/transactions/{id}")
    public String editTransaction(@PathVariable(value = "id") String id,
                                  @RequestParam(value = "returnUrl", required = false) String returnUrl,
                                  Model model,
                                  HttpServletRequest request) {
        String resolvedReturnUrl = resolveTransactionsReturnUrl(returnUrl, request);
        if (!model.containsAttribute("errorMessage")) {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
            Optional<TransactionDto> transactionDto;
            try {
                transactionDto = transactionService.findByUserIdAndId(user.get().getId(), UUID.fromString(id));
                if (transactionDto.isPresent()) {
                    if (transactionDto.get().getType() == TransactionType.TRANSFER) {
                        model.addAttribute("message", TRANSFER_MANAGEMENT_ERROR);
                        return "error";
                    }
                    model.addAttribute("transaction", transactionDto.get());
                    addCategoriesToModel(currentUserDetails, model);
                    model.addAttribute("accounts", accountService.findByUserId(user.get().getId()));
                    model.addAttribute("currentCategory", transactionDto.get().getCategory());
                    model.addAttribute("currentAccount", transactionDto.get().getAccount());
                }
            } catch (NonExistedException e) {
                model.addAttribute("message", "There is no transaction with such id!");
                return "error";
            }
        }
        model.addAttribute("returnUrl", resolvedReturnUrl);
        return "transaction-details";
    }

    @DeleteMapping("/transactions/{id}")
    public String deleteTransaction(@PathVariable(value = "id") String id,
                                    @RequestParam(value = "returnUrl", required = false) String returnUrl,
                                    Model model,
                                    RedirectAttributes redirectAttributes,
                                    HttpServletRequest request) {

        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        Optional<TransactionDto> transactionDto = transactionService.findByUserIdAndId(user.get().getId(), UUID.fromString(id));
        String referer = request.getHeader("Referer");
        if (transactionDto.isPresent()) {
            if (transactionDto.get().getType() == TransactionType.TRANSFER) {
                redirectAttributes.addFlashAttribute("errorMessage", TRANSFER_MANAGEMENT_ERROR);
                String redirectUrl = resolveTransactionsReturnUrl(returnUrl, null);
                return "redirect:" + redirectUrl;
            }
            boolean success = transactionService.delete(user.get().getId(), UUID.fromString(id));
            if (!success) {
                redirectAttributes.addFlashAttribute("errorMessage", "Error is happened during deleting transaction!");
                redirectAttributes.addFlashAttribute("transaction", transactionDto.get());
                if (referer != null && referer.contains("/transactions")) {
                    return "redirect:" + referer;
                }
                return "redirect:/transactions";
            }
            String redirectUrl = resolveTransactionsReturnUrl(returnUrl, null);
            return "redirect:" + redirectUrl;
        }
        model.addAttribute("message", "There is no transaction with such id!");
        return "error";
    }

    @PutMapping("/transactions/{id}")
    public String saveTransactionChanges(
            @PathVariable(value = "id") UUID id,
            @ModelAttribute("transaction") TransactionDto transactionDto,
            BindingResult result,
            @RequestParam(value = "returnUrl", required = false) String returnUrl,
            Model model,
            HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (result.hasErrors()) {
            model.addAttribute("transaction", transactionDto);
            user.ifPresent(userApp -> {
                addCategoriesToModel(currentUserDetails, model);
                model.addAttribute("accounts", accountService.findByUserId(userApp.getId()));
                model.addAttribute("currentCategory", transactionDto.getCategory());
                model.addAttribute("currentAccount", transactionDto.getAccount());
            });
            model.addAttribute("returnUrl", resolveTransactionsReturnUrl(returnUrl, request));
            return "transaction-details";
        }
        user.ifPresent(userApp -> {
            Optional<TransactionDto> original = transactionService.findByUserIdAndId(userApp.getId(), id);
            if (original.isPresent() && original.get().getType() == TransactionType.TRANSFER) {
                model.addAttribute("message", TRANSFER_MANAGEMENT_ERROR);
            } else {
                transactionDto.setUser(userApp);
                updateTransactionCategory(transactionDto, userApp.getId());
                updateTransactionAccount(transactionDto, userApp.getId());
                transactionService.save(transactionMapper.toModel(transactionDto));
            }
        });
        if (model.containsAttribute("message")) {
            return "error";
        }
        return "redirect:" + resolveTransactionsReturnUrl(returnUrl, request);
    }

    @GetMapping("/transactions/export")
    public ResponseEntity<ByteArrayResource> exportTransactions(@RequestParam(value = "startDate", required = false)
                                                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                                @RequestParam(value = "endDate", required = false)
                                                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                                                @RequestParam(value = "accountId", required = false) UUID accountId,
                                                                @RequestParam(value = "type", required = false) TransactionType transactionType,
                                                                @RequestParam(value = "format", required = false, defaultValue = "XLSX") String formatParam,
                                                                HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        ExportFormat format = resolveFormat(formatParam);
        if (format == null) {
            return ResponseEntity.badRequest().build();
        }

        TransactionFilter filter = resolveTransactionFilter(request, startDate, endDate, accountId, transactionType);
        Long startEpoch = DateTimeUtils.getStartOfDay(filter.startDate());
        Long endEpoch = DateTimeUtils.getEndOfDay(filter.endDate());
        List<TransactionDto> transactions = transactionService.findByUserIdAndPeriod(user.get().getId(),
                startEpoch,
                endEpoch,
                filter.accountId(),
                filter.transactionType());
        Locale userLocale = localizationService.resolveLocale(user.get().getInterfaceLanguage());
        TabularReportExportModel exportModel = transactionExportMapper.toTabularModel(transactions,
                userLocale,
                String.valueOf(user.get().getBaseCurrency()),
                filter.startDate(),
                filter.endDate());
        ExportedFile exportedFile = exportServiceFactory.export(exportModel, format);
        ByteArrayResource resource = new ByteArrayResource(exportedFile.content());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(exportedFile.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename="
                        + UriUtils.encodePath(exportedFile.fileName(), StandardCharsets.UTF_8))
                .body(resource);
    }

    private String buildTransactionsReturnUrl(HttpServletRequest request) {
        if (request == null) {
            return "/transactions";
        }
        StringBuilder current = new StringBuilder(request.getRequestURI());
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isBlank()) {
            current.append('?').append(queryString);
        }
        String candidate = current.toString();
        if (candidate.contains("/transactions")) {
            return candidate;
        }
        return "/transactions";
    }

    private String resolveTransactionsReturnUrl(String returnUrl, HttpServletRequest request) {
        if (returnUrl != null && !returnUrl.isBlank() && returnUrl.contains("/transactions")) {
            return returnUrl;
        }
        if (request != null) {
            String referer = request.getHeader("Referer");
            if (referer != null && referer.contains("/transactions")) {
                return referer;
            }
        }
        return "/transactions";
    }

    private TransactionType sanitizeTransactionFilterType(TransactionType type) {
        if (type == null) {
            return null;
        }
        return type == TransactionType.TRANSFER ? null : type;
    }

    private List<TransactionType> getFilterableTransactionTypes() {
        return Arrays.stream(TransactionType.values())
                .filter(type -> type != TransactionType.TRANSFER)
                .toList();
    }

    private TransactionFilter resolveTransactionFilter(HttpServletRequest request,
                                                       LocalDate startDate,
                                                       LocalDate endDate,
                                                       UUID accountId,
                                                       TransactionType transactionType) {
        LocalDate today = LocalDate.now();
        LocalDate defaultStart = today.withDayOfMonth(1);
        LocalDate defaultEnd = today.withDayOfMonth(today.lengthOfMonth());

        HttpSession session = request.getSession();
        LocalDate storedStart = (LocalDate) session.getAttribute(TRANSACTION_FILTER_START_ATTR);
        LocalDate storedEnd = (LocalDate) session.getAttribute(TRANSACTION_FILTER_END_ATTR);

        if (startDate == null && endDate == null) {
            if (storedStart != null && storedEnd != null) {
                startDate = storedStart;
                endDate = storedEnd;
            } else {
                startDate = defaultStart;
                endDate = defaultEnd;
            }
        } else {
            if (startDate == null) {
                startDate = storedStart != null ? storedStart : endDate;
            }
            if (endDate == null) {
                endDate = storedEnd != null ? storedEnd : startDate;
            }
        }

        boolean accountFilterProvided = request.getParameterMap().containsKey("accountId");
        boolean typeFilterProvided = request.getParameterMap().containsKey("type");

        UUID storedAccountId = (UUID) session.getAttribute(TRANSACTION_FILTER_ACCOUNT_ATTR);
        TransactionType storedType = sanitizeTransactionFilterType(
                (TransactionType) session.getAttribute(TRANSACTION_FILTER_TYPE_ATTR));

        if (!accountFilterProvided && accountId == null && storedAccountId != null) {
            accountId = storedAccountId;
        }
        transactionType = sanitizeTransactionFilterType(transactionType);

        if (!typeFilterProvided && transactionType == null && storedType != null) {
            transactionType = storedType;
        }

        if (endDate.isBefore(startDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        session.setAttribute(TRANSACTION_FILTER_START_ATTR, startDate);
        session.setAttribute(TRANSACTION_FILTER_END_ATTR, endDate);
        if (accountId != null) {
            session.setAttribute(TRANSACTION_FILTER_ACCOUNT_ATTR, accountId);
        } else {
            session.removeAttribute(TRANSACTION_FILTER_ACCOUNT_ATTR);
        }
        if (transactionType != null) {
            session.setAttribute(TRANSACTION_FILTER_TYPE_ATTR, transactionType);
        } else {
            session.removeAttribute(TRANSACTION_FILTER_TYPE_ATTR);
        }

        return new TransactionFilter(startDate, endDate, accountId, transactionType);
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

    private void addCategoriesToModel(UserDetails currentUserDetails, Model model) {
        model.addAttribute("expenseCategoriesToChoose", buildCategoriesToChoose(currentUserDetails, CategoryType.EXPENSES));
        model.addAttribute("incomeCategoriesToChoose", buildCategoriesToChoose(currentUserDetails, CategoryType.INCOME));
    }

    private List<CategorySelectGroup> buildCategoriesToChoose(UserDetails currentUserDetails, CategoryType categoryType) {
        List<CategoryDto> categories = userCategoryService.getCategoriesByUserAndType(
                currentUserDetails.getUsername(),
                categoryType.name(),
                false);
        return getCategorySelectListForBudgetUseCase
                .groupSubCategoriesByRootCategories(
                        categoryMapper.toModelList(categories)
                );
    }

    private void updateTransactionCategory(TransactionDto transactionDto, UUID userId) {
        if (transactionDto.getCategory() == null || transactionDto.getCategory().getId() == null) {
            return;
        }
        categoryService.findById(userId, transactionDto.getCategory().getId()).ifPresent(category -> {
            transactionDto.setCategory(category);
            applyTypeAndDirectionFromCategory(transactionDto, category);
        });
    }

    private void updateTransactionAccount(TransactionDto transactionDto, UUID userId) {
        if (transactionDto.getAccount() == null || transactionDto.getAccount().getId() == null) {
            return;
        }
        accountService.findByUserIdAndId(userId, transactionDto.getAccount().getId())
                .ifPresent(transactionDto::setAccount);
    }

    private void applyTypeAndDirectionFromCategory(TransactionDto transactionDto, Category category) {
        if (CategoryType.INCOME.equals(category.getType())) {
            transactionDto.setType(TransactionType.INCOME);
            transactionDto.setDirection(TransactionDirection.INCREASE);
        } else {
            transactionDto.setType(TransactionType.EXPENSE);
            transactionDto.setDirection(TransactionDirection.DECREASE);
        }
    }

    private void applyDefaultType(TransactionDto transactionDto, String requestedType) {
        if ("INCOME".equalsIgnoreCase(requestedType)) {
            transactionDto.setType(TransactionType.INCOME);
            transactionDto.setDirection(TransactionDirection.INCREASE);
        } else {
            transactionDto.setType(TransactionType.EXPENSE);
            transactionDto.setDirection(TransactionDirection.DECREASE);
        }
    }

    private record TransactionFilter(LocalDate startDate,
                                     LocalDate endDate,
                                     UUID accountId,
                                     TransactionType transactionType) {
    }
}
