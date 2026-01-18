package com.example.personalFinance.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "landing_click_event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandingClickEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "clicked_at", nullable = false)
    private OffsetDateTime clickedAt;

    @Column(name = "country_code", length = 32)
    private String countryCode;

    @Column(name = "ip_address", nullable = false, length = 64)
    private String ipAddress;

    @Column(name = "device_type", nullable = false, length = 32)
    private String deviceType;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;
}
