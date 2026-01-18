package com.example.personalFinance.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.CurrencyRate;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.security.SpringSecurityConfig;
import com.example.personalFinance.security.auth.JwtUtil;
import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.CurrencyConversionWarningContext;
import com.example.personalFinance.service.CurrencyRateImportService;
import com.example.personalFinance.service.CurrencyRateService;
import com.example.personalFinance.service.OnboardingService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.SubscriptionPlanFormatter;
import com.example.personalFinance.service.subscription.SubscriptionService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

@WebMvcTest(controllers = CurrencyRateController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SpringSecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
class CurrencyRateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CurrencyRateService currencyRateService;

    @MockBean
    private CurrencyRateImportService currencyRateImportService;

    @MockBean
    private UserService userService;

    @MockBean
    private SecurityService securityService;

    @MockBean
    private OnboardingService onboardingService;

    @MockBean
    private CurrencyConversionWarningContext currencyConversionWarningContext;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private SubscriptionService subscriptionService;

    @MockBean
    private SubscriptionPlanFormatter subscriptionPlanFormatter;

    @MockBean
    private LocaleChangeInterceptor localeChangeInterceptor;

    @MockBean
    private LocalizationService localizationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ClientIpResolver clientIpResolver;

    @Test
    void shouldRenderRatesPageWithHtmlContent() throws Exception {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .name("demo-user")
                .email("demo-user@example.com")
                .baseCurrency(CurrencyCode.UAH)
                .build();

        when(securityService.isAuthenticated()).thenReturn(true);
        when(securityService.getCurrentUser()).thenReturn(user.getEmail());
        when(userService.findByName(anyString())).thenReturn(Optional.of(user));
        when(currencyRateService.findAll(eq(userId))).thenReturn(Collections.emptyList());
        when(onboardingService.isCompleted(eq(userId))).thenReturn(true);
        when(currencyConversionWarningContext.consumeWarnings()).thenReturn(Collections.emptySet());
        when(subscriptionService.hasActiveAccess(eq(user))).thenReturn(true);
        when(localeChangeInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        mockMvc.perform(get("/settings/currency-rates").accept(MediaType.TEXT_HTML).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(view().name("settings-currency-rates"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("Exchange rates")))
                .andExpect(content().string(not(containsString("th:"))));
    }

    @Test
    void shouldPrefillManualRateDateWhenEditing() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID rateId = UUID.randomUUID();
        LocalDate rateDate = LocalDate.of(2024, 9, 22);
        UserApp user = UserApp.builder()
                .id(userId)
                .name("demo-user")
                .email("demo-user@example.com")
                .baseCurrency(CurrencyCode.UAH)
                .build();

        CurrencyRate rate = CurrencyRate.builder()
                .id(rateId)
                .currency(CurrencyCode.EUR)
                .rateDate(rateDate)
                .rate(BigDecimal.valueOf(38.45))
                .manual(true)
                .build();

        when(securityService.isAuthenticated()).thenReturn(true);
        when(securityService.getCurrentUser()).thenReturn(user.getEmail());
        when(userService.findByName(anyString())).thenReturn(Optional.of(user));
        when(currencyRateService.findAll(eq(userId))).thenReturn(List.of(rate));
        when(currencyRateService.findById(eq(userId), eq(rateId))).thenReturn(Optional.of(rate));
        when(onboardingService.isCompleted(eq(userId))).thenReturn(true);
        when(currencyConversionWarningContext.consumeWarnings()).thenReturn(Collections.emptySet());
        when(subscriptionService.hasActiveAccess(eq(user))).thenReturn(true);
        when(localeChangeInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        mockMvc.perform(get("/settings/currency-rates")
                        .param("edit", rateId.toString())
                        .accept(MediaType.TEXT_HTML)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(view().name("settings-currency-rates"))
                .andExpect(content().string(containsString("value=\"" + rateDate + "\"")));
    }
}
