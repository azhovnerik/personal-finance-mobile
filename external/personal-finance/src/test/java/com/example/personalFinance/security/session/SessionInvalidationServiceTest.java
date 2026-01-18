package com.example.personalFinance.security.session;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.User;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SessionInvalidationServiceTest {

    @Mock
    private ObjectProvider<SessionRegistry> sessionRegistryProvider;

    @Mock
    private SessionRegistry sessionRegistry;

    private SessionInvalidationService sessionInvalidationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sessionInvalidationService = new SessionInvalidationService(sessionRegistryProvider);
    }

    @Test
    void invalidateSessionsSkipsWhenSessionRegistryMissing() {
        when(sessionRegistryProvider.getIfAvailable()).thenReturn(null);

        sessionInvalidationService.invalidateSessions("user@example.com");

        verifyNoInteractions(sessionRegistry);
    }

    @Test
    void invalidateSessionsExpiresMatchingPrincipalSessions() {
        User userDetails = (User) User.withUsername("user@example.com")
                .password("password")
                .roles("USER")
                .build();
        SessionInformation sessionInformation = mock(SessionInformation.class);

        when(sessionRegistryProvider.getIfAvailable()).thenReturn(sessionRegistry);
        when(sessionRegistry.getAllPrincipals()).thenReturn(List.of(userDetails));
        when(sessionRegistry.getAllSessions(eq(userDetails), eq(false))).thenReturn(List.of(sessionInformation));
        when(sessionInformation.getSessionId()).thenReturn("session-id");

        sessionInvalidationService.invalidateSessions("user@example.com");

        verify(sessionInformation).expireNow();
        verify(sessionRegistry).removeSessionInformation("session-id");
        verify(sessionRegistry, times(1)).getAllSessions(userDetails, false);
        verify(sessionRegistry, times(1)).getAllPrincipals();
    }

    @Test
    void invalidateSessionsDoesNothingWhenUsernameBlank() {
        sessionInvalidationService.invalidateSessions(" ");

        verifyNoInteractions(sessionRegistryProvider);
    }
}
