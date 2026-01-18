package com.example.personalFinance.web;

import com.example.personalFinance.dto.CurrencyRateForm;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.CurrencyRate;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.CurrencyRateImportService;
import com.example.personalFinance.service.CurrencyRateService;
import com.example.personalFinance.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Controller
@RequestMapping("/settings/currency-rates")
@RequiredArgsConstructor
public class CurrencyRateController {

    private static final Logger log = LoggerFactory.getLogger(CurrencyRateController.class);

    private final CurrencyRateService currencyRateService;
    private final CurrencyRateImportService currencyRateImportService;
    private final UserService userService;
    private final SecurityService securityService;

    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ModelAndView listRates(@RequestParam(value = "edit", required = false) UUID editRateId,
                                  @RequestParam(value = "new", required = false) Boolean newRate,
                                  Model model) {
        UserApp user = currentUser();
        model.addAttribute("rates", currencyRateService.findAll(user.getId()));
        CurrencyCode baseCurrency = user.getBaseCurrency();
        CurrencyRateForm form = (CurrencyRateForm) model.asMap().get("rateForm");
        boolean hasBindingResult = model.asMap().containsKey("org.springframework.validation.BindingResult.rateForm");
        if (Boolean.TRUE.equals(newRate)) {
            if (!hasBindingResult) {
                form = new CurrencyRateForm();
                form.setRateDate(LocalDate.now());
                form.setCurrency(baseCurrency != null ? baseCurrency : CurrencyCode.USD);
            }
            editRateId = null;
        } else if (editRateId != null) {
            if (form == null) {
                form = new CurrencyRateForm();
            }
            if (!hasBindingResult) {
                Optional<CurrencyRate> rateOptional = currencyRateService.findById(user.getId(), editRateId);
                if (rateOptional.isPresent()) {
                    CurrencyRate rate = rateOptional.get();
                    form.setId(rate.getId());
                    form.setCurrency(rate.getCurrency());
                    form.setRateDate(rate.getRateDate());
                    form.setRate(rate.getRate());
                } else if (!model.containsAttribute("errorMessage")) {
                    model.addAttribute("errorMessage", "Selected exchange rate could not be found.");
                }
            } else if (form.getId() == null) {
                form.setId(editRateId);
            }
        }
        if (form == null) {
            form = new CurrencyRateForm();
        }
        if (form.getRateDate() == null && !hasBindingResult) {
            form.setRateDate(LocalDate.now());
        }
        if (form.getCurrency() == null && !hasBindingResult) {
            form.setCurrency(baseCurrency != null ? baseCurrency : CurrencyCode.USD);
        }
        model.addAttribute("rateForm", form);
        model.addAttribute("editingRateId", form.getId());
        boolean showModal = Boolean.TRUE.equals(newRate) || editRateId != null;
        if (hasBindingResult) {
            showModal = true;
        }
        Object flashShowModal = model.asMap().get("showManualRateModal");
        if (flashShowModal instanceof Boolean booleanValue && booleanValue) {
            showModal = true;
        }
        model.addAttribute("showManualRateModal", showModal);
        model.addAttribute("currencies", CurrencyCode.values());
        model.addAttribute("baseCurrency", baseCurrency);
        return new ModelAndView("settings-currency-rates", model.asMap());
    }

    @PostMapping
    public String saveRate(@Valid @ModelAttribute("rateForm") CurrencyRateForm form,
                           BindingResult bindingResult,
                           RedirectAttributes redirectAttributes) {
        UserApp user = currentUser();
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.rateForm", bindingResult);
            redirectAttributes.addFlashAttribute("rateForm", form);
            redirectAttributes.addFlashAttribute("showManualRateModal", true);
            return redirectToForm(form.getId());
        }
        try {
            currencyRateService.saveManual(user.getId(), form.getId(), form.getCurrency(), form.getRateDate(), form.getRate());
            String message = form.getId() != null ? "Exchange rate updated." : "Exchange rate saved.";
            redirectAttributes.addFlashAttribute("successMessage", message);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
            redirectAttributes.addFlashAttribute("rateForm", form);
            redirectAttributes.addFlashAttribute("showManualRateModal", true);
            return redirectToForm(form.getId());
        }
        return "redirect:/settings/currency-rates";
    }

    @PostMapping("/import")
    public String importRates(@RequestParam(value = "rateDate", required = false) LocalDate rateDate,
                              RedirectAttributes redirectAttributes) {
        UserApp user = currentUser();
        LocalDate targetDate = rateDate != null ? rateDate : LocalDate.now();
        try {
            int imported = currencyRateImportService.importForUser(user, targetDate);
            if (imported > 0) {
                redirectAttributes.addFlashAttribute("successMessage",
                        "Imported " + imported + " exchange rate" + (imported == 1 ? "" : "s") + ".");
            } else {
                redirectAttributes.addFlashAttribute("warningMessage",
                        "No currencies require an exchange rate import for the selected date.");
            }
        } catch (IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/settings/currency-rates";
    }

    @PostMapping("/{id}/delete")
    public String deleteRate(@PathVariable("id") UUID id,
                             RedirectAttributes redirectAttributes) {
        UserApp user = currentUser();
        try {
            currencyRateService.delete(user.getId(), id);
            redirectAttributes.addFlashAttribute("successMessage", "Exchange rate deleted.");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/settings/currency-rates";
    }

    private String redirectToForm(UUID rateId) {
        if (rateId != null) {
            return "redirect:/settings/currency-rates?edit=" + rateId;
        }
        return "redirect:/settings/currency-rates?new=true";
    }

    private UserApp currentUser() {
        String username = securityService.getCurrentUser();
        Optional<UserApp> optionalUser = userService.findByName(username);
        if (optionalUser.isEmpty()) {
            log.warn("Authenticated principal '{}' was not found when accessing currency rates", username);
            SecurityContextHolder.clearContext();
            throw new AuthenticationCredentialsNotFoundException("Authenticated user not found");
        }
        return optionalUser.get();
    }
}
