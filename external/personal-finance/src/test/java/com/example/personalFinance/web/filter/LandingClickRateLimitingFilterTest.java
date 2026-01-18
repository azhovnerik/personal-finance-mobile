package com.example.personalFinance.web.filter;

import com.example.personalFinance.service.ClientIpResolver;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class LandingClickRateLimitingFilterTest {

    private ClientIpResolver clientIpResolver;
    private LandingClickRateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        clientIpResolver = Mockito.mock(ClientIpResolver.class);
        filter = new LandingClickRateLimitingFilter(clientIpResolver);
    }

    @Test
    void shouldAllowRequestsWithinLimit() throws ServletException, IOException {
        when(clientIpResolver.resolve(any())).thenReturn("198.51.100.10");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/landing-clicks");
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 5; i++) {
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void shouldBlockRequestsBeyondLimit() throws ServletException, IOException {
        when(clientIpResolver.resolve(any())).thenReturn("203.0.113.5");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/landing-clicks");
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 31; i++) {
            response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
        }

        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    void shouldIgnoreNonLandingEndpoints() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/other");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isNotEqualTo(429);
    }
}
