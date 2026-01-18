package com.example.personalFinance.security.filter;

import com.example.personalFinance.security.auth.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class JwtAuthorizationFilterTest {

    private JwtUtil jwtUtil;
    private JwtAuthorizationFilter filter;

    @BeforeEach
    void setUp() {
        jwtUtil = mock(JwtUtil.class);
        filter = new JwtAuthorizationFilter(jwtUtil, new ObjectMapper());
    }

    @Test
    void shouldReturnForbiddenJsonWhenJwtProcessingFails() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtUtil.resolveToken(request)).thenReturn("invalid");
        when(jwtUtil.resolveClaims(request)).thenThrow(new MalformedJwtException("Broken JWT"));

        filter.doFilter(request, response, chain);

        verifyNoInteractions(chain);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(response.getContentType()).isEqualTo(MediaType.APPLICATION_JSON_VALUE);
        assertThat(response.getContentAsString())
                .contains("\"message\":\"Authentication Error\"")
                .contains("Broken JWT");
    }

    @Test
    void shouldPropagateUnexpectedExceptions() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtUtil.resolveToken(request)).thenReturn("token");
        when(jwtUtil.resolveClaims(request)).thenThrow(new RuntimeException("Template failed"));

        assertThatThrownBy(() -> filter.doFilter(request, response, chain))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Template failed");

        verifyNoInteractions(chain);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.getContentAsString()).isEmpty();
    }
}
