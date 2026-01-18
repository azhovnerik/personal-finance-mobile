package com.example.personalFinance.web;

import com.example.personalFinance.dto.SupportRequestForm;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.SupportRequestService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.Locale;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
public class SupportController {

    private final SupportRequestService supportRequestService;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;

    @GetMapping("/support")
    public String showSupportForm(Model model, HttpSession session) {
        if (!model.containsAttribute("supportRequest")) {
            SupportRequestForm draft = (SupportRequestForm) session.getAttribute("supportFormDraft");
            if (draft == null) {
                draft = new SupportRequestForm();
            }
            model.addAttribute("supportRequest", draft);
        }
        return "support";
    }

    @PostMapping("/support")
    public String submitSupportRequest(@Valid @ModelAttribute("supportRequest") SupportRequestForm form,
                                        BindingResult bindingResult,
                                        RedirectAttributes redirectAttributes,
                                        HttpSession session) {
        session.setAttribute("supportFormDraft", form);
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.supportRequest", bindingResult);
            redirectAttributes.addFlashAttribute("supportRequest", form);
            redirectAttributes.addFlashAttribute("errorMessage",
                    resolveMessage("support.form.error"));
            return "redirect:/support";
        }
        supportRequestService.submitRequest(form.getEmail(), form.getSubject(), form.getMessage());
        redirectAttributes.addFlashAttribute("successMessage",
                resolveMessage("support.form.success"));
        session.removeAttribute("supportFormDraft");
        return "redirect:/support";
    }

    private String resolveMessage(String code) {
        Locale locale = LocaleContextHolder.getLocale();
        if (locale == null) {
            locale = localizationService.getDefaultLocale();
        }
        return messageSource.getMessage(code, null, locale);
    }
}
