package com.example.personalFinance.web;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
public class BaseCurrencySetupController {

    private static final Logger log = LoggerFactory.getLogger(BaseCurrencySetupController.class);

    private final SecurityService securityService;
    private final UserService userService;

    @GetMapping("/onboarding/base-currency")
    public String showForm(Model model) {
        Optional<UserApp> user = currentUser();
        if (user.isPresent() && user.get().getBaseCurrency() != null) {
            return "redirect:/";
        }
        user.ifPresent(u -> model.addAttribute("currentCurrency", u.getBaseCurrency()));
        model.addAttribute("currencies", CurrencyCode.values());
        return "onboarding/base-currency-required";
    }

    @PostMapping("/onboarding/base-currency/save")
    public String saveBaseCurrency(@RequestParam("currency") CurrencyCode currency,
                                   RedirectAttributes redirectAttributes,
                                   HttpServletRequest request) {
        Optional<UserApp> user = currentUser();
        if (user.isEmpty()) {
            SecurityContextHolder.clearContext();
            return "redirect:/login";
        }
        try {
            userService.setBaseCurrency(user.get(), currency);
            redirectAttributes.addFlashAttribute("successMessage", "Base currency saved.");
            log.info("User {} initialized base currency to {}", user.get().getId(), currency);
            return "redirect:/";
        } catch (IllegalArgumentException | IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
            String referer = request.getHeader("Referer");
            return "redirect:" + (referer != null ? referer : "/onboarding/base-currency");
        }
    }

    private Optional<UserApp> currentUser() {
        String username = securityService.getCurrentUser();
        if (username == null) {
            return Optional.empty();
        }
        return userService.findByName(username);
    }
}
