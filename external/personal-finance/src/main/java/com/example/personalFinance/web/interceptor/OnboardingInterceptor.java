package com.example.personalFinance.web.interceptor;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.OnboardingService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OnboardingInterceptor implements HandlerInterceptor {

    private final SecurityService securityService;
    private final UserService userService;
    private final OnboardingService onboardingService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!securityService.isAuthenticated()) {
            return true;
        }

        String username = securityService.getCurrentUser();
        if (username == null) {
            SecurityContextHolder.clearContext();
            response.sendRedirect("/login");
            return false;
        }
        Optional<UserApp> userOpt = userService.findByName(username);
        if (userOpt.isEmpty()) {
            SecurityContextHolder.clearContext();
            response.sendRedirect("/login");
            return false;
        }
        UserApp user = userOpt.get();
        if (user.getBaseCurrency() == null) {
            String requestUri = request.getRequestURI();
            if (requestUri.startsWith("/onboarding/base-currency")) {
                return true;
            }
            response.sendRedirect("/onboarding/base-currency");
            return false;
        }
        UUID userId = user.getId();

        if (onboardingService.isCompleted(userId)) {
            return true;
        }

        response.sendRedirect("/onboarding");
        return false;
    }
}
