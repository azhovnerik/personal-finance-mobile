package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class
UserApp {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String telegramName;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;

    @Builder.Default
    @Column(name = "oauth_user", nullable = false)
    private boolean oauthUser = false;

    @Column(name = "pending_email")
    private String pendingEmail;

    @Column(name = "pending_email_requested_at")
    private LocalDateTime pendingEmailRequestedAt;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    private Status status;

    private boolean verified = false;

    @Builder.Default
    @Convert(converter = CurrencyCodeAttributeConverter.class)
    private CurrencyCode baseCurrency = CurrencyCode.USD;

    @Builder.Default
    @Column(name = "interface_language")
    private String interfaceLanguage = "en";

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Builder.Default
    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "lockout_until")
    private LocalDateTime lockoutUntil;

    public boolean isLoginLocked(LocalDateTime currentTime) {
        if (lockoutUntil == null || currentTime == null) {
            return false;
        }
        return lockoutUntil.isAfter(currentTime);
    }

    public long minutesUntilUnlock(LocalDateTime currentTime) {
        if (!isLoginLocked(currentTime)) {
            return 0;
        }
        long secondsRemaining = Duration.between(currentTime, lockoutUntil).getSeconds();
        if (secondsRemaining <= 0) {
            return 0;
        }
        return (secondsRemaining + 59) / 60;
    }
}
