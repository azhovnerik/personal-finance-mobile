package com.example.personalFinance.service;

import com.example.personalFinance.web.rest.dto.LandingClickEventRequest;

public interface LandingClickEventService {
    void saveLandingClick(LandingClickEventRequest request, String clientIpAddress);
}
