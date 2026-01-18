package com.example.personalFinance.web;

import com.example.personalFinance.dto.TransferForm;
import com.example.personalFinance.exception.CurrencyMismatchException;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Transfer;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.mapper.TransactionMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.time.format.DateTimeParseException;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Controller
@RequestMapping("/transfers")
public class TransferController {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneOffset.UTC);

    @Autowired
    private TransferService transferService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private UserService userService;

    @GetMapping("/add")
    public String addTransfer(Model model) {
        UserApp user = getCurrentUser().orElse(null);
        if (user == null) {
            model.addAttribute("message", "user is not authorized!");
            return "error";
        }
        if (!model.containsAttribute("transfer")) {
            TransferForm form = new TransferForm();
            form.setDate(DATE_TIME_FORMATTER.format(Instant.now()));
            model.addAttribute("transfer", form);
        }
        model.addAttribute("accounts", accountService.findByUserId(user.getId()));
        model.addAttribute("baseCurrency", user.getBaseCurrency());
        return "transfer-add";
    }

    @PostMapping
    public String createTransfer(@Valid @ModelAttribute("transfer") TransferForm transferForm,
                                 BindingResult result,
                                 Model model) {
        Optional<UserApp> maybeUser = getCurrentUser();
        if (!maybeUser.isPresent()) {
            model.addAttribute("message", "user is not authorized!");
            return "error";
        }
        UserApp user = maybeUser.get();
        if (result.hasErrors()) {
            model.addAttribute("accounts", accountService.findByUserId(user.getId()));
            model.addAttribute("baseCurrency", user.getBaseCurrency());
            return "transfer-add";
        }
        try {
            Transfer transfer = mapFormToTransfer(user.getId(), transferForm);
            transferService.create(user.getId(), transfer, transferForm.getAmount());
            return "redirect:/accounts";
        } catch (CurrencyMismatchException ex) {
            return handleTransferError(result, model, user, "transfer.error.currencyMismatch", "transfer-add", ex);
        } catch (IllegalArgumentException | NoSuchElementException | DateTimeParseException ex) {
            return handleTransferError(result, model, user, "transfer.error", "transfer-add", ex);
        }
    }

    @GetMapping("/{id}")
    public String editTransfer(@PathVariable("id") UUID id, Model model) {
        Optional<UserApp> maybeUser = getCurrentUser();
        if (!maybeUser.isPresent()) {
            model.addAttribute("message", "user is not authorized!");
            return "error";
        }
        UserApp user = maybeUser.get();
        Optional<Transfer> maybeTransfer = transferService.findByUserIdAndId(user.getId(), id);
        if (!maybeTransfer.isPresent()) {
            model.addAttribute("message", "There is no transfer with such id!");
            return "error";
        }
        Transfer transfer = maybeTransfer.get();
        if (!model.containsAttribute("transfer")) {
            TransferForm form = new TransferForm();
            form.setId(transfer.getId());
            form.setDate(formatDate(transfer.getDate()));
            form.setComment(transfer.getComment());
            form.setFromAccountId(transfer.getFromAccount() != null ? transfer.getFromAccount().getId() : null);
            form.setToAccountId(transfer.getToAccount() != null ? transfer.getToAccount().getId() : null);
            BigDecimal amount = transferService.findTransferAmount(user.getId(), transfer.getId())
                    .orElse(BigDecimal.ZERO);
            form.setAmount(amount);
            model.addAttribute("transfer", form);
        }
        model.addAttribute("accounts", accountService.findByUserId(user.getId()));
        model.addAttribute("baseCurrency", user.getBaseCurrency());
        return "transfer-details";
    }

    @PutMapping("/{id}")
    public String updateTransfer(@PathVariable("id") UUID id,
                                 @Valid @ModelAttribute("transfer") TransferForm transferForm,
                                 BindingResult result,
                                 Model model) {
        Optional<UserApp> maybeUser = getCurrentUser();
        if (!maybeUser.isPresent()) {
            model.addAttribute("message", "user is not authorized!");
            return "error";
        }
        UserApp user = maybeUser.get();
        transferForm.setId(id);
        if (result.hasErrors()) {
            model.addAttribute("accounts", accountService.findByUserId(user.getId()));
            model.addAttribute("baseCurrency", user.getBaseCurrency());
            return "transfer-details";
        }
        try {
            Transfer transfer = mapFormToTransfer(user.getId(), transferForm);
            transferService.update(user.getId(), transfer, transferForm.getAmount());
            return "redirect:/accounts";
        } catch (CurrencyMismatchException ex) {
            return handleTransferError(result, model, user, "transfer.error.currencyMismatch", "transfer-details", ex);
        } catch (IllegalArgumentException | NoSuchElementException | DateTimeParseException ex) {
            return handleTransferError(result, model, user, "transfer.error", "transfer-details", ex);
        }
    }

    @DeleteMapping("/{id}")
    public String deleteTransfer(@PathVariable("id") UUID id,
                                 RedirectAttributes redirectAttributes,
                                 Model model) {
        Optional<UserApp> maybeUser = getCurrentUser();
        if (!maybeUser.isPresent()) {
            model.addAttribute("message", "user is not authorized!");
            return "error";
        }
        UserApp user = maybeUser.get();
        try {
            transferService.delete(user.getId(), id);
            return "redirect:/accounts";
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
            return "redirect:/transfers/" + id;
        }
    }

    private String handleTransferError(BindingResult result,
                                       Model model,
                                       UserApp user,
                                       String errorCode,
                                       String view,
                                       Exception ex) {
        result.reject(errorCode, ex.getMessage());
        model.addAttribute("accounts", accountService.findByUserId(user.getId()));
        model.addAttribute("baseCurrency", user.getBaseCurrency());
        return view;
    }

    private Transfer mapFormToTransfer(UUID userId, TransferForm transferForm) {
        Long date = TransactionMapper.StringToLong(transferForm.getDate());
        Account fromAccount = accountService.findByUserIdAndId(userId, transferForm.getFromAccountId())
                .orElseThrow(() -> new NoSuchElementException("Source account not found"));
        Account toAccount = accountService.findByUserIdAndId(userId, transferForm.getToAccountId())
                .orElseThrow(() -> new NoSuchElementException("Destination account not found"));
        return Transfer.builder()
                .id(transferForm.getId())
                .comment(transferForm.getComment())
                .date(date)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();
    }

    private Optional<UserApp> getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            return userService.findByName(username);
        }
        return Optional.empty();
    }

    private String formatDate(Long epochSeconds) {
        if (epochSeconds == null) {
            return DATE_TIME_FORMATTER.format(Instant.now());
        }
        return DATE_TIME_FORMATTER.format(Instant.ofEpochSecond(epochSeconds));
    }
}
