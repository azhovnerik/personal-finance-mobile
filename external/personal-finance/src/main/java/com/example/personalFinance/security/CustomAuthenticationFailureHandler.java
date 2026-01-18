package com.example.personalFinance.security;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Component
public class CustomAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final UserService userService;

    public CustomAuthenticationFailureHandler(UserService userService) {
        super("/login?error");
        this.userService = userService;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        String username = request.getParameter("username");

        if (exception instanceof DisabledException && username != null) {
            String normalizedUsername = username.trim();
            Optional<UserApp> optionalUser = userService.findByName(normalizedUsername);

            if (optionalUser.isPresent() && !optionalUser.get().isVerified()) {
                UserApp user = optionalUser.get();
                if (user.getEmail() != null) {
                    String redirectUrl = String.format("/login?unverified&email=%s",
                            URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8));
                    getRedirectStrategy().sendRedirect(request, response, redirectUrl);
                    return;
                }
            }
        }

        Optional<UserApp> optionalUser = Optional.empty();
        if (username != null) {
            String normalizedUsername = username.trim();
            Optional<UserApp> lookup = userService.findByName(normalizedUsername);

            if (lookup.isPresent()) {
                UserApp user = lookup.get();
                if (user.isOauthUser() && !StringUtils.hasText(user.getPassword())) {
                    handleMissingPassword(request, response, user);
                    return;
                }
            }

            if (exception instanceof LockedException) {
                optionalUser = lookup;
            } else {
                optionalUser = userService.recordFailedLoginAttempt(normalizedUsername);
            }

            optionalUser = optionalUser.or(() -> lookup);

            if (optionalUser.isPresent()) {
                UserApp user = optionalUser.get();
                LocalDateTime now = LocalDateTime.now();
                if (user.isLoginLocked(now)) {
                    long minutes = Math.max(user.minutesUntilUnlock(now), 1L);
                    String redirectUrl = String.format("/login?locked&retryAfterMinutes=%d", minutes);
                    getRedirectStrategy().sendRedirect(request, response, redirectUrl);
                    return;
                }
            }
        }

        if (exception instanceof BadCredentialsException && username != null) {
            if (optionalUser.isEmpty()) {
                getRedirectStrategy().sendRedirect(request, response, "/login?emailNotFound");
                return;
            }
            getRedirectStrategy().sendRedirect(request, response, "/login?passwordInvalid");
            return;
        }

        super.onAuthenticationFailure(request, response, exception);
    }

    private void handleMissingPassword(HttpServletRequest request, HttpServletResponse response, UserApp user)
            throws IOException {
        String passwordSetupUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/settings/password/setup")
                .replaceQuery(null)
                .build()
                .toUriString();
        userService.sendPasswordSetupEmail(user, passwordSetupUrl);
        getRedirectStrategy().sendRedirect(request, response, "/login?passwordRequired");
    }
}
