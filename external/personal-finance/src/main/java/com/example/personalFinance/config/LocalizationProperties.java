package com.example.personalFinance.config;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.localization")
@Getter
@Setter
public class LocalizationProperties {

    private List<String> supportedLanguages = new ArrayList<>();
    private String defaultLanguage = "en";
    private String cookieName = "pf-locale";
    private int cookieMaxAgeDays = 365;
}
