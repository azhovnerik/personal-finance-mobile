package com.example.personalFinance.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.OnboardingService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class BaseCurrencyAuthenticationSuccessHandlerTest {

    @Mock
    private UserService userService;

    @Mock
    private OnboardingService onboardingService;

    private BaseCurrencyAuthenticationSuccessHandler handler;

    @BeforeEach
    void setUp() {
        handler = new BaseCurrencyAuthenticationSuccessHandler(userService, onboardingService);
    }

    @Test
    void shouldRedirectToBaseCurrencyWhenUserHasNoBaseCurrency() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .name("legacy-user")
                .email("legacy-user@example.com")
                .baseCurrency(null)
                .build();
        Authentication authentication = authenticatedToken(user.getEmail());
        when(userService.findByName(user.getEmail())).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = performSuccess(request, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("/onboarding/base-currency");
        assertThat(request.getSession(false)).isNotNull();
        verify(userService).resetFailedLoginAttempts(user);
    }

    @Test
    void shouldRedirectToOnboardingWizardWhenNotCompleted() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .name("demo-user")
                .email("demo-user@example.com")
                .baseCurrency(CurrencyCode.UAH)
                .build();
        Authentication authentication = authenticatedToken(user.getEmail());
        when(userService.findByName(user.getEmail())).thenReturn(Optional.of(user));
        when(onboardingService.isCompleted(userId)).thenReturn(false);

        MockHttpServletResponse response = performSuccess(new MockHttpServletRequest(), authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("/onboarding");
        verify(userService).resetFailedLoginAttempts(user);
    }

    @Test
    void shouldUseDefaultTargetWhenUserIsReady() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .name("ready-user")
                .email("ready-user@example.com")
                .baseCurrency(CurrencyCode.UAH)
                .build();
        Authentication authentication = authenticatedToken(user.getEmail());
        when(userService.findByName(user.getEmail())).thenReturn(Optional.of(user));
        when(onboardingService.isCompleted(userId)).thenReturn(true);

        MockHttpServletResponse response = performSuccess(new MockHttpServletRequest(), authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("/");
        verify(userService).resetFailedLoginAttempts(user);
    }

    private MockHttpServletResponse performSuccess(MockHttpServletRequest request, Authentication authentication)
            throws ServletException, IOException {
        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.onAuthenticationSuccess(request, response, authentication);
        return response;
    }

    private Authentication authenticatedToken(String principal) {
        TestingAuthenticationToken token = new TestingAuthenticationToken(principal, "password");
        token.setAuthenticated(true);
        return token;
    }
}

