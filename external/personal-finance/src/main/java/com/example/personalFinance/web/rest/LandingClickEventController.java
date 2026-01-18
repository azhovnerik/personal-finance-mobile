package com.example.personalFinance.web.rest;

import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.LandingClickEventService;
import com.example.personalFinance.web.rest.dto.LandingClickEventRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

@RestController
@RequestMapping("/api/landing-clicks")
@RequiredArgsConstructor
public class LandingClickEventController {

    private final LandingClickEventService landingClickEventService;
    private final ClientIpResolver clientIpResolver;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> captureLandingClickJson(@Valid @RequestBody LandingClickEventRequest request,
                                                        HttpServletRequest httpServletRequest) {
        return handleLandingClick(request, httpServletRequest);
    }

    @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> captureLandingClickForm(@Valid LandingClickEventRequest request,
                                                        HttpServletRequest httpServletRequest) {
        return handleLandingClick(request, httpServletRequest);
    }

    private ResponseEntity<Void> handleLandingClick(LandingClickEventRequest request, HttpServletRequest httpServletRequest) {
        String resolvedIp = StringUtils.hasText(request.getIpAddress())
                ? request.getIpAddress()
                : clientIpResolver.resolve(httpServletRequest);
        landingClickEventService.saveLandingClick(request, resolvedIp);
        return ResponseEntity.accepted().build();
    }
}
