package com.example.personalFinance.config;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.i18n.CookieLocaleResolver;

@RequiredArgsConstructor
public class UserLocaleResolver extends CookieLocaleResolver {

    private final LocalizationService localizationService;
    private final UserService userService;

    @Override
    protected Locale determineDefaultLocale(HttpServletRequest request) {
        Locale userLocale = resolveUserLocale();
        if (userLocale != null) {
            return userLocale;
        }
        if (request != null && request.getLocale() != null) {
            return localizationService.resolveLocale(request.getLocale().toLanguageTag());
        }
        return localizationService.getDefaultLocale();
    }

    @Override
    public void setLocale(HttpServletRequest request, HttpServletResponse response, Locale locale) {
        Locale target = locale != null ? localizationService.resolveLocale(locale.toLanguageTag())
                : localizationService.getDefaultLocale();
        super.setLocale(request, response, target);
    }

    private Locale resolveUserLocale() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        String username = authentication.getName();
        Optional<UserApp> user = userService.findByName(username);
        return user.map(UserApp::getInterfaceLanguage)
                .map(localizationService::resolveLocale)
                .orElse(null);
    }
}
