package com.example.personalFinance.web.interceptor;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionAccessInterceptor implements HandlerInterceptor {

    private static final Set<String> WHITELIST_PREFIXES = Set.of(
            "/subscriptions",
            "/api/",
            "/css/",
            "/js/",
            "/images/",
            "/webjars/",
            "/onboarding",
            "/login",
            "/logout",
            "/oauth2",
            "/auth",
            "/error"
    );

    private final SecurityService securityService;
    private final UserService userService;
    private final SubscriptionService subscriptionService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!securityService.isAuthenticated()) {
            return true;
        }
        String uri = request.getRequestURI();
        if (isWhitelisted(uri)) {
            return true;
        }
        Optional<UserApp> userOpt = userService.findByName(securityService.getCurrentUser());
        if (userOpt.isEmpty()) {
            SecurityContextHolder.clearContext();
            response.sendRedirect("/login");
            return false;
        }
        UserApp user = userOpt.get();
        if (subscriptionService.hasActiveAccess(user)) {
            return true;
        }
        log.debug("Blocking access for user {} due to inactive subscription", user.getId());
        redirectToSubscriptionPage(request, response);
        return false;
    }

    private boolean isWhitelisted(String uri) {
        return WHITELIST_PREFIXES.stream().anyMatch(uri::startsWith);
    }

    private void redirectToSubscriptionPage(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String target = request.getContextPath() + "/subscriptions?accessBlocked";
        response.sendRedirect(target);
    }
}
