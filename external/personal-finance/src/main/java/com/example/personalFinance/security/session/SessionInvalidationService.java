package com.example.personalFinance.security.session;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.lang.Nullable;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.security.Principal;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionInvalidationService {

    private final ObjectProvider<SessionRegistry> sessionRegistryProvider;

    public void invalidateSessions(Collection<String> usernames) {
        if (usernames == null || usernames.isEmpty()) {
            return;
        }

        for (String username : usernames) {
            invalidateSessions(username);
        }
    }

    public void invalidateSessions(String username) {
        if (username == null) {
            return;
        }

        String normalizedUsername = username.trim();
        if (normalizedUsername.isEmpty()) {
            return;
        }

        SessionRegistry sessionRegistry = sessionRegistryProvider.getIfAvailable();
        if (sessionRegistry == null) {
            log.warn("SessionRegistry bean is not available; skipping session invalidation.");
            return;
        }

        List<Object> principals = sessionRegistry.getAllPrincipals();
        if (principals == null || principals.isEmpty()) {
            return;
        }
        for (Object principal : principals) {
            String principalName = extractPrincipalName(principal);
            if (!Objects.equals(normalizedUsername, principalName)) {
                continue;
            }

            List<SessionInformation> sessions = sessionRegistry.getAllSessions(principal, false);
            if (sessions == null || sessions.isEmpty()) {
                continue;
            }
            for (SessionInformation sessionInformation : sessions) {
                sessionInformation.expireNow();
                sessionRegistry.removeSessionInformation(sessionInformation.getSessionId());
            }
        }
    }

    @Nullable
    private String extractPrincipalName(Object principal) {
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        if (principal instanceof Principal javaPrincipal) {
            return javaPrincipal.getName();
        }
        if (principal instanceof String stringPrincipal) {
            return stringPrincipal;
        }
        return null;

    }
}
