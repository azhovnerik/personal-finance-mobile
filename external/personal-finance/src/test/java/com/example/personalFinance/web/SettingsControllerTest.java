package com.example.personalFinance.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.personalFinance.dto.UserSettingsForm;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import java.util.Locale;
import java.util.Optional;
import org.springframework.context.MessageSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;

@ExtendWith(MockitoExtension.class)
class SettingsControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private SecurityService securityService;

    @Mock
    private LocalizationService localizationService;

    @Mock
    private LocaleResolver localeResolver;

    @Mock
    private MessageSource messageSource;

    private SettingsController controller;

    @BeforeEach
    void setUp() {
        controller = new SettingsController(userService, securityService, localizationService, localeResolver, messageSource);
    }

    @Test
    void updateProfileUpdatesLocaleCookieWithNormalizedLanguage() {
        UserApp user = new UserApp();
        user.setEmail("user@example.com");
        user.setName("User");
        user.setInterfaceLanguage("pl");

        when(securityService.getCurrentUser()).thenReturn("user@example.com");
        when(userService.findByName("user@example.com")).thenReturn(Optional.of(user));

        UserSettingsForm form = new UserSettingsForm();
        form.setName("User");
        form.setEmail("user@example.com");
        form.setInterfaceLanguage("en");

        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(form, "profileForm");
        RedirectAttributes redirectAttributes = new RedirectAttributesModelMap();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/settings/profile");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(localizationService.normalizeLanguage("en")).thenReturn("en");
        when(localizationService.resolveLocale("en")).thenReturn(Locale.ENGLISH);
        when(userService.updateProfile(eq(user), eq("User"), eq("user@example.com"), isNull(), isNull(), eq("en"), anyString()))
                .thenReturn(false);

        String view = controller.updateProfile(form, bindingResult, redirectAttributes, request, response);

        assertThat(view).isEqualTo("redirect:/settings");
        verify(localeResolver).setLocale(request, response, Locale.ENGLISH);
    }

    @Test
    void updateProfileSkipsLocaleUpdateWhenValidationFails() {
        UserApp user = new UserApp();
        user.setEmail("another@example.com");

        when(securityService.getCurrentUser()).thenReturn("another@example.com");
        when(userService.findByName("another@example.com")).thenReturn(Optional.of(user));

        UserSettingsForm form = new UserSettingsForm();
        form.setInterfaceLanguage("en");
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(form, "profileForm");
        bindingResult.reject("error");
        RedirectAttributes redirectAttributes = new RedirectAttributesModelMap();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        String view = controller.updateProfile(form, bindingResult, redirectAttributes, request, response);

        assertThat(view).isEqualTo("redirect:/settings");
        verifyNoInteractions(localeResolver);
    }
}
