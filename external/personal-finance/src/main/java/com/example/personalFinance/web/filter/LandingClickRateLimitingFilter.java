package com.example.personalFinance.web.filter;

import com.example.personalFinance.service.ClientIpResolver;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class LandingClickRateLimitingFilter extends OncePerRequestFilter {

    private static final String LANDING_ENDPOINT = "/api/landing-clicks";
    private static final int REQUEST_LIMIT = 30;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    private final ClientIpResolver clientIpResolver;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equalsIgnoreCase(request.getMethod()) && request.getRequestURI().startsWith(LANDING_ENDPOINT));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String ip = clientIpResolver.resolve(request);
        Bucket bucket = buckets.computeIfAbsent(ip == null ? "unknown" : ip, this::newBucket);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        log.warn("Rate limit exceeded for IP {}", ip);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Too many requests\"}");
    }

    private Bucket newBucket(String key) {
        Bandwidth limit = Bandwidth.classic(REQUEST_LIMIT, Refill.greedy(REQUEST_LIMIT, REFILL_DURATION));
        return Bucket.builder().addLimit(limit).build();
    }
}
