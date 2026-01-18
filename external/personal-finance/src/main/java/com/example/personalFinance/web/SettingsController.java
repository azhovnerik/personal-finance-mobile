package com.example.personalFinance.web;

import com.example.personalFinance.dto.PasswordChangeForm;
import com.example.personalFinance.dto.PasswordSetupForm;
import com.example.personalFinance.dto.UserSettingsForm;
import com.example.personalFinance.dto.UserSettingsView;
import com.example.personalFinance.exception.UserAlreadyExistAuthenticationException;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.VerificationToken;
import com.example.personalFinance.model.VerificationTokenType;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/settings")
@RequiredArgsConstructor
public class SettingsController {

    private static final Logger log = LoggerFactory.getLogger(SettingsController.class);

    private final UserService userService;
    private final SecurityService securityService;
    private final LocalizationService localizationService;
    private final LocaleResolver localeResolver;
    private final MessageSource messageSource;

    @GetMapping
    public String viewSettings(Model model) {
        UserApp user = currentUser();
        log.debug("Rendering settings page for user {}", user.getId());
        if (!model.containsAttribute("profileForm")) {
            model.addAttribute("profileForm", buildProfileForm(user));
        }
        if (!model.containsAttribute("passwordChangeForm")) {
            model.addAttribute("passwordChangeForm", new PasswordChangeForm());
        }
        model.addAttribute("userSettings", buildView(user));
        model.addAttribute("canChangePassword", userService.hasPassword(user));
        model.addAttribute("currencies", CurrencyCode.values());
        return "settings";
    }

    @PostMapping("/profile")
    public String updateProfile(@Valid @ModelAttribute("profileForm") UserSettingsForm form,
                                BindingResult bindingResult,
                                RedirectAttributes redirectAttributes,
                                HttpServletRequest request,
                                HttpServletResponse response) {
        UserApp user = currentUser();
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.profileForm", bindingResult);
            redirectAttributes.addFlashAttribute("profileForm", form);
            return "redirect:/settings";
        }
        String normalizedLanguage = localizationService.normalizeLanguage(form.getInterfaceLanguage());
        try {
            boolean emailChanged = userService.updateProfile(user,
                    form.getName(),
                    form.getEmail(),
                    form.getTelegramName(),
                    form.getBaseCurrency(),
                    normalizedLanguage,
                    buildEmailConfirmationUrl(request));
            localeResolver.setLocale(request, response, localizationService.resolveLocale(normalizedLanguage));
            if (emailChanged) {
                log.info("User {} initiated email change to {} from settings", user.getId(), user.getPendingEmail());
                redirectAttributes.addFlashAttribute("infoMessage", message("settings.info.pendingEmailVerification", user.getPendingEmail()));
            } else {
                redirectAttributes.addFlashAttribute("successMessage", message("settings.success.profileUpdated"));
            }
        } catch (UserAlreadyExistAuthenticationException ex) {
            bindingResult.rejectValue("email", "email.exists", message("settings.error.emailExists"));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.profileForm", bindingResult);
            redirectAttributes.addFlashAttribute("profileForm", form);
            return "redirect:/settings";
        } catch (IllegalStateException ex) {
            bindingResult.rejectValue("baseCurrency", "currency.change", message("settings.warning.baseCurrencyChange"));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.profileForm", bindingResult);
            redirectAttributes.addFlashAttribute("profileForm", form);
            redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.baseCurrencyChange"));
            return "redirect:/settings";
        }
        return "redirect:/settings";
    }

    @PostMapping("/email/resend")
    public String resendEmail(RedirectAttributes redirectAttributes, HttpServletRequest request) {
        UserApp user = currentUser();
        if (user.getPendingEmail() == null) {
            redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.noPendingEmail"));
            return "redirect:/settings";
        }
        userService.resendPendingEmailVerification(user, buildEmailConfirmationUrl(request));
        log.info("User {} requested resend for pending email {}", user.getId(), user.getPendingEmail());
        redirectAttributes.addFlashAttribute("infoMessage", message("settings.info.pendingEmailResent", user.getPendingEmail()));
        return "redirect:/settings";
    }

    @PostMapping("/password")
    public String changePassword(@Valid @ModelAttribute("passwordChangeForm") PasswordChangeForm form,
                                 BindingResult bindingResult,
                                 RedirectAttributes redirectAttributes) {
        UserApp user = currentUser();
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordChangeForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordChangeForm", form);
            return "redirect:/settings";
        }
        if (!form.getNewPassword().equals(form.getConfirmNewPassword())) {
            bindingResult.rejectValue("confirmNewPassword", "password.mismatch", message("settings.error.passwordMismatch"));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordChangeForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordChangeForm", form);
            return "redirect:/settings";
        }
        try {
            userService.changePassword(user, form.getCurrentPassword(), form.getNewPassword());
        } catch (IllegalArgumentException | IllegalStateException ex) {
            bindingResult.rejectValue("currentPassword", "password.change", resolvePasswordChangeError(ex));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordChangeForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordChangeForm", form);
            return "redirect:/settings";
        }
        log.info("User {} changed password via settings", user.getId());
        redirectAttributes.addAttribute("passwordChanged", "true");
        return "redirect:/login";
    }

    @PostMapping("/password/setup/request")
    public String requestPasswordSetup(RedirectAttributes redirectAttributes, HttpServletRequest request) {
        UserApp user = currentUser();
        if (userService.hasPassword(user)) {
            redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.passwordAlreadySet"));
            return "redirect:/settings";
        }
        userService.sendPasswordSetupEmail(user, buildPasswordSetupUrl(request));
        log.info("User {} requested password setup email", user.getId());
        redirectAttributes.addFlashAttribute("infoMessage", message("settings.info.passwordSetupSent"));
        return "redirect:/settings";
    }

    @GetMapping("/email/confirm")
    public String confirmEmailChange(@RequestParam("token") String token,
                                     RedirectAttributes redirectAttributes,
                                     HttpServletRequest request) {
        Optional<VerificationToken> optionalToken = userService.findToken(token, VerificationTokenType.EMAIL_CHANGE);
        if (optionalToken.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", message("settings.error.invalidVerificationLink"));
            return "redirect:/login";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate() != null && verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            userService.resendPendingEmailVerification(verificationToken.getUser(), buildEmailConfirmationUrl(request));
            redirectAttributes.addFlashAttribute("warningMessage",
                    message("settings.warning.verificationLinkExpired", verificationToken.getTargetEmail()));
            return "redirect:/login";
        }
        userService.completeEmailChange(verificationToken);
        log.info("User {} confirmed email change to {}", verificationToken.getUser().getId(), verificationToken.getUser().getEmail());
        invalidateCurrentSession(request);
        redirectAttributes.addFlashAttribute("infoMessage", message("settings.info.emailUpdated"));
        return "redirect:/login";
    }

    @GetMapping("/password/setup")
    public String showPasswordSetup(@RequestParam("token") String token,
                                    Model model,
                                    RedirectAttributes redirectAttributes,
                                    HttpServletRequest request) {
        Optional<VerificationToken> optionalToken = userService.findToken(token, VerificationTokenType.PASSWORD_SETUP);
        if (optionalToken.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", message("settings.error.invalidPasswordSetup"));
            return "redirect:/login";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate() != null && verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            userService.sendPasswordSetupEmail(verificationToken.getUser(), buildPasswordSetupUrl(request));
            redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.passwordSetupExpired"));
            return "redirect:/login";
        }
        if (!model.containsAttribute("passwordSetupForm")) {
            model.addAttribute("passwordSetupForm", new PasswordSetupForm());
        }
        model.addAttribute("token", token);
        return "password-setup";
    }

    @PostMapping("/password/setup")
    public String completePasswordSetup(@RequestParam("token") String token,
                                        @Valid @ModelAttribute("passwordSetupForm") PasswordSetupForm form,
                                        BindingResult bindingResult,
                                        RedirectAttributes redirectAttributes,
                                        HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordSetupForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordSetupForm", form);
            redirectAttributes.addAttribute("token", token);
            return "redirect:/settings/password/setup";
        }
        if (!form.getNewPassword().equals(form.getConfirmNewPassword())) {
            bindingResult.rejectValue("confirmNewPassword", "password.mismatch", message("settings.error.passwordMismatch"));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordSetupForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordSetupForm", form);
            redirectAttributes.addAttribute("token", token);
            return "redirect:/settings/password/setup";
        }
        Optional<VerificationToken> optionalToken = userService.findToken(token, VerificationTokenType.PASSWORD_SETUP);
        if (optionalToken.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", message("settings.error.invalidPasswordSetup"));
            return "redirect:/login";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate() != null && verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            userService.sendPasswordSetupEmail(verificationToken.getUser(), buildPasswordSetupUrl(request));
            redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.passwordSetupExpired"));
            return "redirect:/login";
        }
        userService.completePasswordSetup(verificationToken, form.getNewPassword());
        log.info("User {} completed password setup", verificationToken.getUser().getId());
        redirectAttributes.addAttribute("passwordSet", "true");
        return "redirect:/login";
    }

    private UserSettingsForm buildProfileForm(UserApp user) {
        UserSettingsForm form = new UserSettingsForm();
        form.setName(user.getName());
        form.setEmail(user.getPendingEmail() != null ? user.getPendingEmail() : user.getEmail());
        form.setTelegramName(user.getTelegramName());
        form.setBaseCurrency(user.getBaseCurrency());
        form.setInterfaceLanguage(user.getInterfaceLanguage());
        return form;
    }

    private UserSettingsView buildView(UserApp user) {
        return UserSettingsView.builder()
                .email(user.getEmail())
                .name(user.getName())
                .telegramName(user.getTelegramName())
                .verified(user.isVerified())
                .pendingEmail(user.getPendingEmail())
                .pendingEmailRequestedAt(user.getPendingEmailRequestedAt())
                .hasPassword(userService.hasPassword(user))
                .baseCurrency(user.getBaseCurrency())
                .interfaceLanguage(user.getInterfaceLanguage())
                .build();
    }

    private UserApp currentUser() {
        String username = securityService.getCurrentUser();
        Optional<UserApp> optionalUser = userService.findByName(username);
        if (optionalUser.isEmpty()) {
            log.warn("Authenticated principal '{}' was not found in the database. Clearing security context and requesting re-authentication.", username);
            SecurityContextHolder.clearContext();
            throw new AuthenticationCredentialsNotFoundException("Authenticated user not found");
        }
        return optionalUser.get();
    }

    private void invalidateCurrentSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public String handleAuthenticationError(AuthenticationCredentialsNotFoundException ex,
                                             RedirectAttributes redirectAttributes) {
        log.debug("Redirecting to login after authentication error: {}", ex.getMessage());
        redirectAttributes.addFlashAttribute("warningMessage", message("settings.warning.sessionInvalid"));
        return "redirect:/login";
    }

    private String resolvePasswordChangeError(RuntimeException ex) {
        return switch (ex.getMessage()) {
            case "New password must not be empty" -> message("settings.error.passwordChange.empty");
            case "Password is not set for this account" -> message("settings.error.passwordChange.notSet");
            case "Current password is incorrect" -> message("settings.error.passwordChange.incorrect");
            default -> message("settings.error.passwordChange.generic");
        };
    }

    private String message(String code, Object... args) {
        return messageSource.getMessage(code, args, code, currentLocale());
    }

    private Locale currentLocale() {
        Locale locale = LocaleContextHolder.getLocale();
        if (locale != null) {
            return locale;
        }
        return localizationService.getDefaultLocale();
    }

    private String buildEmailConfirmationUrl(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/settings/email/confirm")
                .replaceQuery(null)
                .build()
                .toUriString();
    }

    private String buildPasswordSetupUrl(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/settings/password/setup")
                .replaceQuery(null)
                .build()
                .toUriString();
    }
}
