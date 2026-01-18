package com.example.personalFinance.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;

@ExtendWith(MockitoExtension.class)
class CustomAuthenticationFailureHandlerTest {

    @Mock
    private UserService userService;

    private CustomAuthenticationFailureHandler handler;

    @BeforeEach
    void setUp() {
        handler = new CustomAuthenticationFailureHandler(userService);
    }

    @Test
    void shouldRedirectToLockedUrlWhenUserIsLocked() throws ServletException, IOException {
        UserApp user = UserApp.builder()
                .name("demo-user")
                .email("demo-user@example.com")
                .lockoutUntil(LocalDateTime.now().plusMinutes(15))
                .failedLoginAttempts(5)
                .password("encoded")
                .build();
        when(userService.findByName("demo-user@example.com")).thenReturn(Optional.of(user));
        when(userService.recordFailedLoginAttempt("demo-user@example.com")).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("username", "demo-user@example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new BadCredentialsException("Bad credentials"));

        assertThat(response.getRedirectedUrl()).isNotNull();
        assertThat(response.getRedirectedUrl()).startsWith("/login?locked");
        verify(userService).recordFailedLoginAttempt("demo-user@example.com");
    }

    @Test
    void shouldRedirectUnverifiedUserToResendFlow() throws ServletException, IOException {
        UserApp user = UserApp.builder()
                .name("demo-user")
                .email("user@example.com")
                .verified(false)
                .build();
        when(userService.findByName("user@example.com")).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("username", "user@example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new DisabledException("disabled"));

        assertThat(response.getRedirectedUrl()).isEqualTo("/login?unverified&email="
                + URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8));
        verify(userService, never()).recordFailedLoginAttempt("user@example.com");
    }

    @Test
    void shouldSendPasswordSetupInstructionsWhenPasswordIsMissing() throws ServletException, IOException {
        UserApp user = UserApp.builder()
                .name("oauth-user")
                .email("oauth@example.com")
                .oauthUser(true)
                .build();
        when(userService.findByName("oauth@example.com")).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/auth/login-form");
        request.setParameter("username", "oauth@example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new BadCredentialsException("Bad credentials"));

        assertThat(response.getRedirectedUrl()).isEqualTo("/login?passwordRequired");

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(userService).sendPasswordSetupEmail(eq(user), urlCaptor.capture());
        assertThat(urlCaptor.getValue()).isEqualTo("http://localhost/settings/password/setup");
        verify(userService, never()).recordFailedLoginAttempt("oauth@example.com");
    }

    @Test
    void shouldRedirectToPasswordInvalidWhenCredentialsAreWrong() throws ServletException, IOException {
        UserApp user = UserApp.builder()
                .name("demo-user")
                .email("user@example.com")
                .password("encoded")
                .build();
        when(userService.findByName("user@example.com")).thenReturn(Optional.of(user));
        when(userService.recordFailedLoginAttempt("user@example.com")).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("username", "user@example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new BadCredentialsException("Bad credentials"));

        assertThat(response.getRedirectedUrl()).isEqualTo("/login?passwordInvalid");
        verify(userService).recordFailedLoginAttempt("user@example.com");
    }

    @Test
    void shouldRedirectToEmailNotFoundWhenUserDoesNotExist() throws ServletException, IOException {
        when(userService.findByName("missing@example.com")).thenReturn(Optional.empty());
        when(userService.recordFailedLoginAttempt("missing@example.com")).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("username", "missing@example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new BadCredentialsException("Bad credentials"));

        assertThat(response.getRedirectedUrl()).isEqualTo("/login?emailNotFound");
        verify(userService).recordFailedLoginAttempt("missing@example.com");
    }
}
