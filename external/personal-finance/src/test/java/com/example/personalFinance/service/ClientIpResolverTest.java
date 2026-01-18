package com.example.personalFinance.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Test
    void shouldUseForwardedHeaderWhenPresent() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10, 10.0.0.1");

        String resolved = resolver.resolve(request);

        assertThat(resolved).isEqualTo("203.0.113.10");
    }

    @Test
    void shouldFallbackToRemoteAddressAndNormalizeLoopback() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("::1");

        String resolved = resolver.resolve(request);

        assertThat(resolved).isEqualTo("127.0.0.1");
    }

    @Test
    void shouldReturnNullWhenRequestMissing() {
        assertThat(resolver.resolve(null)).isNull();
    }
}
