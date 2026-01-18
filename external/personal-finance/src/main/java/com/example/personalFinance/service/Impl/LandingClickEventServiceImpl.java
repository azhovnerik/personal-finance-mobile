package com.example.personalFinance.service.Impl;

import com.example.personalFinance.model.LandingClickEvent;
import com.example.personalFinance.repository.LandingClickEventRepository;
import com.example.personalFinance.service.LandingClickEventService;
import com.example.personalFinance.web.rest.dto.LandingClickEventRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class LandingClickEventServiceImpl implements LandingClickEventService {

    private static final ZoneId KYIV_ZONE = ZoneId.of("Europe/Kiev");

    private final LandingClickEventRepository landingClickEventRepository;

    @Override
    public void saveLandingClick(LandingClickEventRequest request, String clientIpAddress) {
        ZonedDateTime clickedAt = request.getClickedAt().withZoneSameInstant(KYIV_ZONE);
        OffsetDateTime receivedAt = OffsetDateTime.now(KYIV_ZONE);

        LandingClickEvent event = LandingClickEvent.builder()
                .clickedAt(clickedAt.toOffsetDateTime())
                .countryCode(request.getCountryCode())
                .deviceType(request.getDeviceType().toLowerCase(Locale.ROOT))
                .ipAddress(resolveIpAddress(request.getIpAddress(), clientIpAddress))
                .receivedAt(receivedAt)
                .build();

        landingClickEventRepository.save(event);
        log.info("Saved landing click event from IP {} for country {} on {}", event.getIpAddress(), event.getCountryCode(), event.getClickedAt());
    }

    private String resolveIpAddress(String providedIp, String clientIpAddress) {
        if (StringUtils.hasText(providedIp)) {
            return providedIp;
        }
        if (StringUtils.hasText(clientIpAddress)) {
            return clientIpAddress;
        }
        return "unknown";
    }
}
