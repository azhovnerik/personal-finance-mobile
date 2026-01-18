package com.example.personalFinance.web;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.LocaleResolver;

@Controller
@RequiredArgsConstructor
public class LanguageController {

    private final LocalizationService localizationService;
    private final UserService userService;
    private final SecurityService securityService;
    private final LocaleResolver localeResolver;

    @PostMapping("/language")
    public String changeLanguage(@RequestParam("lang") String language,
                                 @RequestHeader(value = "Referer", required = false) String referer,
                                 HttpServletRequest request,
                                 HttpServletResponse response) {
        String normalized = localizationService.normalizeLanguage(language);
        localeResolver.setLocale(request, response, localizationService.resolveLocale(normalized));
        String username = securityService.getCurrentUser();
        if (username != null) {
            Optional<UserApp> user = userService.findByName(username);
            user.ifPresent(value -> userService.updateInterfaceLanguage(value, normalized));
        }
        return "redirect:" + (referer != null ? referer : "/");
    }
}
