package com.example.personalFinance.service;

public interface GeoIpService {
    /**
     * Resolves ISO 3166-1 alpha-2 country code for the provided IP address.
     *
     * @param ipAddress IPv4 or IPv6 address of the client
     * @return two-letter country code or {@code null} when it cannot be determined
     */
    String resolveCountryCode(String ipAddress);
}
