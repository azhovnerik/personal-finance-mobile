package com.example.personalFinance.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class AppUrlBuilder {

    private final String baseUrl;

    public AppUrlBuilder(@Value("${app.base-url:http://localhost:8080}") String appBaseUrl) {
        this.baseUrl = normalizeBaseUrl(appBaseUrl);
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String buildUrl(String path) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl);
        if (StringUtils.hasText(path)) {
            String normalizedPath = path.startsWith("/") ? path : "/" + path;
            builder.path(normalizedPath);
        }
        return builder.build().toUriString();
    }

    private String normalizeBaseUrl(String value) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Base URL must not be empty");
        }
        String trimmed = value.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}

