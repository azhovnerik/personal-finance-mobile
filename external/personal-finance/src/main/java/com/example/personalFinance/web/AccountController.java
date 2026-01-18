package com.example.personalFinance.web;

import com.example.personalFinance.dto.AccountDto;
import com.example.personalFinance.dto.ChangeBalanceDto;
import com.example.personalFinance.dto.TransferViewDto;
import com.example.personalFinance.exception.AccountCurrencyChangeNotAllowedException;
import com.example.personalFinance.exception.DuplicateAccountException;
import com.example.personalFinance.mapper.AccountMapper;
import com.example.personalFinance.mapper.ChangeBalanceMapper;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.ChangeBalance;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.Transfer;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserCategoryService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
public class AccountController {
    private static final int TRANSFERS_PER_PAGE = 10;
    private static final DateTimeFormatter TRANSFER_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneOffset.UTC);

    @Autowired
    UserCategoryService userCategoryService;

    @Autowired
    AccountService accountService;

    @Autowired
    UserService userService;

    @Autowired
    SecurityService securityService;

    @Autowired
    AccountMapper accountMapper;

    @Autowired
    ChangeBalanceMapper changeBalanceMapper;

    @Autowired
    CurrencyConversionService currencyConversionService;

    @Autowired
    TransferService transferService;


    @GetMapping("/accounts")
    public String getAccountsPage(Model model,
                                  @RequestParam(value = "transferPage", defaultValue = "1") int transferPage) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isPresent()) {
            List<AccountDto> accounts = accountMapper.toDtoList(accountService.findByUserId(user.get().getId()), accountService,
                    currencyConversionService, userService);
            Pageable pageable = PageRequest.of(Math.max(transferPage, 1) - 1,
                    TRANSFERS_PER_PAGE,
                    Sort.by(Sort.Direction.DESC, "date"));
            Page<com.example.personalFinance.model.Transfer> transfersPage = transferService.findByUserId(user.get().getId(), pageable);
            List<TransferViewDto> transfers = buildTransferViews(user.get(), transfersPage.getContent());
            model.addAttribute("accounts", accounts);
            model.addAttribute("baseCurrency", user.get().getBaseCurrency());
            model.addAttribute("transfers", transfers);
            model.addAttribute("transfersPage", transfersPage);
            model.addAttribute("transferTotalPages", transfersPage.getTotalPages());
            model.addAttribute("currentTransferPage", transfersPage.getTotalPages() == 0 ? 1 : transfersPage.getNumber() + 1);
            model.addAttribute("transferPageSize", TRANSFERS_PER_PAGE);
            return "accounts";
        }
        model.addAttribute("message", "user is not authorized!");
        return "error";
    }

    @PostMapping("/accounts")
    public String saveNewAccount(@Valid @ModelAttribute("account") AccountDto accountDto, BindingResult result
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("account", accountDto);
            model.addAttribute("accountTypes", AccountType.values());
            model.addAttribute("currencies", CurrencyCode.values());
            return "account-add";
        }
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
            if (user.isPresent()) {
                accountService.save(user.get().getId(), accountMapper.toModel(accountDto));
            }
        } catch (DuplicateAccountException e) {
            redirectAttributes.addFlashAttribute("errorMessage"
                    , "The account with this name is existed! New account couldn't be saved!");
            redirectAttributes.addFlashAttribute("account", accountDto);
            model.addAttribute("accountTypes", AccountType.values());
            model.addAttribute("currencies", CurrencyCode.values());
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/accounts";
    }

    @GetMapping("/accounts/{id}")
    public String editAccount(@PathVariable(value = "id") UUID id, Model model) {
        if (!model.containsAttribute("errorMessage")) {
            UserDetails userDetail = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<Account> account;
            try {
                Optional<UserApp> user = userService.findByName(userDetail.getUsername());
                if (user.isPresent()) {
                    account = accountService.findByUserIdAndId(user.get().getId(), id);
                    model.addAttribute("account", accountMapper.toDto(account.get(), accountService,
                            currencyConversionService, userService));
                    model.addAttribute("accountTypes", AccountType.values());
                    model.addAttribute("currencies", CurrencyCode.values());
                }
            } catch (NoSuchElementException e) {
                model.addAttribute("message", "There is no account with such id!");
                return "error";
            }
        }
        return "account-details";
    }

    @GetMapping("/accounts/{id}/editbalance")
    public String editAccountBalance(@PathVariable(value = "id") UUID id, Model model) {
        if (!model.containsAttribute("errorMessage")) {
            UserDetails userDetail = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            ChangeBalanceDto changeBalanceDto;
            Optional<Account> account;
            try {
                Optional<UserApp> user = userService.findByName(userDetail.getUsername());
                if (user.isPresent()) {
                    account = accountService.findByUserIdAndId(user.get().getId(), id);
                    AccountDto accountDto = accountMapper.toDto(account.get(), accountService,
                            currencyConversionService, userService);
                    changeBalanceDto = new ChangeBalanceDto();
                    changeBalanceDto.setAccount(account.get());
                    changeBalanceDto.setNewBalance(accountDto.getBalance());
                    changeBalanceDto.setUser(user.get());
                    model.addAttribute("changeBalance", changeBalanceDto);
                }
            } catch (NoSuchElementException e) {
                model.addAttribute("message", "There is no account with such id!");
                return "error";
            }
        }
        return "account-edit-balance";
    }

    @PostMapping("/accounts/{id}/editbalance")
    public String saveNewAccountChangeBalance(@Valid @ModelAttribute("changeBalance") ChangeBalanceDto changeBalanceDto, BindingResult result
            , RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("changeBalance", changeBalanceDto);
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());

            return "account-edit-balance";
        }

        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        ChangeBalance changeBalance = changeBalanceMapper.toModel(changeBalanceDto);
        if (user.isPresent()) {

            changeBalanceDto.setUser(user.get());
            boolean isOk = accountService.createChangeBalance(user.get().getId(), changeBalance.getAccount().getId(),
                    changeBalance.getNewBalance(), changeBalance.getDate());
            if (!isOk) {
                redirectAttributes.addFlashAttribute("errorMessage"
                        , "New balance shouldn't be equal current balance!");
                redirectAttributes.addFlashAttribute("changeBalance", changeBalanceDto);
                String referer = request.getHeader("Referer");
                return "redirect:" + referer;
            }
        }
        ;
        return "redirect:/accounts";
    }

    @GetMapping("/accounts/add")
    public String addAccount(Model model) {
        if (!model.containsAttribute("account")) {
            AccountDto accountDto = new AccountDto();
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            userService.findByName(currentUserDetails.getUsername())
                    .ifPresent(user -> accountDto.setCurrency(user.getBaseCurrency()));
            model.addAttribute("account", accountDto);
            model.addAttribute("accountTypes", AccountType.values());
            model.addAttribute("currencies", CurrencyCode.values());
        }
        return "account-add";
    }

    @PutMapping("/accounts/{id}")
    public String saveAccountChanges(
            @PathVariable(value = "id") UUID id,
            @ModelAttribute("account") AccountDto accountDto,
            BindingResult result,
            @RequestParam String name,
            @RequestParam String description,
            @RequestParam String type,
            RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("account", accountDto);
            model.addAttribute("accountTypes", AccountType.values());
            model.addAttribute("currencies", CurrencyCode.values());
            return "account-details";
        }
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
            if (user.isPresent()) {
                accountService.save(user.get().getId(), accountMapper.toModel(accountDto));
            }
        } catch (DuplicateAccountException e) {
            accountDto.setName(name);
            accountDto.setDescription(description);
            accountDto.setType(AccountType.valueOf(type));

            redirectAttributes.addFlashAttribute("errorMessage"
                    , "The account with this name is already existed! Changes to account couldn't be saved!");
            redirectAttributes.addFlashAttribute("account", accountDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        } catch (AccountCurrencyChangeNotAllowedException e) {
            accountDto.setName(name);
            accountDto.setDescription(description);
            accountDto.setType(AccountType.valueOf(type));

            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            redirectAttributes.addFlashAttribute("account", accountDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        } catch (NoSuchElementException e) {
            accountDto.setName(name);
            accountDto.setDescription(description);
            accountDto.setType(AccountType.valueOf(type));
            redirectAttributes.addFlashAttribute("errorMessage", "The account doesn't not exist!");
            redirectAttributes.addFlashAttribute("account", accountDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/accounts";
    }

    @DeleteMapping("/accounts/{id}")
    public String deleteAccount(@PathVariable(value = "id") UUID id,
                                RedirectAttributes redirectAttributes, HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        Optional<UserApp> user = userService.findByName(currentUserDetails.getUsername());
        if (user.isPresent()) {
            boolean success = accountService.deleteAccount(user.get().getId(), id);
            if (!success) {
                Optional<Account> account = accountService.findByUserIdAndId(user.get().getId(), id);
                AccountDto accountDto = accountMapper.toDto(account.get(), accountService,
                        currencyConversionService, userService);
                redirectAttributes.addFlashAttribute("errorMessage", "There are links to this account (transactions). It's impossible to delete it!");
                redirectAttributes.addFlashAttribute("account", accountDto);
                String referer = request.getHeader("Referer");
                return "redirect:" + referer;
            }
        }


        return "redirect:/accounts";
    }

    private List<TransferViewDto> buildTransferViews(UserApp user, List<Transfer> transfers) {
        return transfers.stream()
                .map(transfer -> {
                    BigDecimal amount = transferService.findTransferAmount(user.getId(), transfer.getId())
                            .orElse(BigDecimal.ZERO);
                    var fromAccount = transfer.getFromAccount();
                    var toAccount = transfer.getToAccount();
                    var currency = fromAccount != null ? fromAccount.getCurrency()
                            : toAccount != null ? toAccount.getCurrency() : null;
                    long rateDate = transfer.getDate() != null ? transfer.getDate() : Instant.now().getEpochSecond();
                    BigDecimal amountInBase = currencyConversionService.convertToBase(user, currency, amount, rateDate);
                    String formattedDate = transfer.getDate() != null
                            ? TRANSFER_DATE_FORMATTER.format(Instant.ofEpochSecond(transfer.getDate()))
                            : null;
                    return TransferViewDto.builder()
                            .id(transfer.getId())
                            .date(transfer.getDate())
                            .formattedDate(formattedDate)
                            .comment(transfer.getComment())
                            .fromAccount(fromAccount)
                            .toAccount(toAccount)
                            .amount(amount)
                            .currency(currency)
                            .amountInBase(amountInBase)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
