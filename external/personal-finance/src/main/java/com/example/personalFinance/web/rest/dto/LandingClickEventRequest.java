package com.example.personalFinance.web.rest.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.format.annotation.DateTimeFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandingClickEventRequest {

    @NotNull
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private ZonedDateTime clickedAt;

    private String countryCode;

    @NotBlank
    @Pattern(regexp = "(?i)^(mobile|desktop|tablet)$", message = "deviceType must be mobile, desktop, or tablet")
    private String deviceType;

    @NotBlank
    private String ipAddress;
}
