package com.example.personalFinance.security;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.OnboardingService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BaseCurrencyAuthenticationSuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final UserService userService;
    private final OnboardingService onboardingService;

    {
        setDefaultTargetUrl("/");
        setAlwaysUseDefaultTargetUrl(true);
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws ServletException, IOException {
        String username = authentication.getName();
        Optional<UserApp> optionalUser = userService.findByName(username);
        if (optionalUser.isEmpty()) {
            log.warn("Authenticated principal '{}' is missing in the database during login success.", username);
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        UserApp user = optionalUser.get();
        userService.resetFailedLoginAttempts(user);
        if (user.getBaseCurrency() == null) {
            ensureSession(request);
            clearAuthenticationAttributes(request);
            log.debug("Redirecting user {} to base currency setup after login", user.getId());
            getRedirectStrategy().sendRedirect(request, response, "/onboarding/base-currency");
            return;
        }

        if (!onboardingService.isCompleted(user.getId())) {
            ensureSession(request);
            clearAuthenticationAttributes(request);
            log.debug("Redirecting user {} to onboarding wizard after login", user.getId());
            getRedirectStrategy().sendRedirect(request, response, "/onboarding");
            return;
        }

        super.onAuthenticationSuccess(request, response, authentication);
    }

    private void ensureSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            request.getSession();
        }
    }
}

