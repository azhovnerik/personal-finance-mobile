package com.example.personalFinance.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Resolves the best-effort client IP address from the current HTTP request.
 */
@Component
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return normalizeIp(forwardedFor.split(",")[0].trim());
        }
        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return normalizeIp(realIp.trim());
        }
        return normalizeIp(request.getRemoteAddr());
    }

    private String normalizeIp(String ipAddress) {
        if (!StringUtils.hasText(ipAddress)) {
            return null;
        }
        if ("0:0:0:0:0:0:0:1".equals(ipAddress) || "::1".equals(ipAddress)) {
            return "127.0.0.1";
        }
        return ipAddress;
    }
}
