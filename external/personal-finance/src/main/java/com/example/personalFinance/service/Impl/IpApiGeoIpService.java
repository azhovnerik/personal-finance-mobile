package com.example.personalFinance.service.Impl;

import com.example.personalFinance.service.GeoIpService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class IpApiGeoIpService implements GeoIpService {

    private static final Logger log = LoggerFactory.getLogger(IpApiGeoIpService.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final boolean enabled;

    public IpApiGeoIpService(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${app.geoip.ipapi.url:http://ip-api.com/json/}") String baseUrl,
            @Value("${app.geoip.ipapi.enabled:true}") boolean enabled,
            @Value("${app.geoip.ipapi.timeout:2s}") Duration timeout) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(timeout)
                .setReadTimeout(timeout)
                .build();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        this.enabled = enabled;
    }

    @Override
    public String resolveCountryCode(String ipAddress) {
        if (!enabled || !StringUtils.hasText(ipAddress) || isNonRoutableAddress(ipAddress)) {
            return null;
        }

        String requestUrl = baseUrl + ipAddress + "?fields=status,countryCode,message";
        try {
            ResponseEntity<IpApiResponse> response = restTemplate.getForEntity(requestUrl, IpApiResponse.class);
            if (response.getBody() == null) {
                return null;
            }
            IpApiResponse body = response.getBody();
            if ("success".equalsIgnoreCase(body.getStatus()) && StringUtils.hasText(body.getCountryCode())) {
                return body.getCountryCode().toUpperCase();
            }
            if (log.isDebugEnabled()) {
                log.debug("GeoIP lookup failed for {} with status {} and message {}", ipAddress, body.getStatus(),
                        body.getMessage());
            }
        } catch (RestClientException ex) {
            log.warn("Failed to resolve country for {}: {}", ipAddress, ex.getMessage());
        }
        return null;
    }

    private boolean isNonRoutableAddress(String ipAddress) {
        try {
            InetAddress inetAddress = InetAddress.getByName(ipAddress);
            return inetAddress.isAnyLocalAddress()
                    || inetAddress.isLoopbackAddress()
                    || inetAddress.isLinkLocalAddress()
                    || inetAddress.isSiteLocalAddress();
        } catch (UnknownHostException ex) {
            if (log.isDebugEnabled()) {
                log.debug("Failed to parse IP address {}: {}", ipAddress, ex.getMessage());
            }
            return false;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class IpApiResponse {
        private String status;
        private String countryCode;
        private String message;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getCountryCode() {
            return countryCode;
        }

        public void setCountryCode(String countryCode) {
            this.countryCode = countryCode;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
