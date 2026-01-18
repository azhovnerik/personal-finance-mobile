package com.example.personalFinance.web;

import com.example.personalFinance.dto.PasswordSetupForm;
import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.exception.UserAlreadyExistAuthenticationException;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.VerificationToken;
import com.example.personalFinance.model.VerificationTokenType;
import com.example.personalFinance.repository.VerificationTokenRepository;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.security.SecurityUser;
import com.example.personalFinance.service.AppUrlBuilder;
import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;


@Controller
public class AuthController {

    public static final String PATH_REGISTER = "/api/v1/register";
    public static final String PATH_REGISTRATION_FORM = "api/v1/user/registration";
    @Autowired
    UserService userService;

    @Autowired
    AppUrlBuilder appUrlBuilder;

    @Value("${app.user.verify-path.v1:/api/v1/user/verify}")
    private String verifyPathV1;

    @Autowired
    SecurityService securityService;

    @Autowired
    VerificationTokenRepository tokenRepository;

    @Autowired
    LocalizationService localizationService;

    @Autowired
    MessageSource messageSource;

    @Autowired
    ClientIpResolver clientIpResolver;


    @GetMapping("/login")
    public String login(Model model, String error, String logout,
                        @RequestParam(value = "unverified", required = false) String unverified,
                        @RequestParam(value = "email", required = false) String email,
                        @RequestParam(value = "resent", required = false) String resent,
                        @RequestParam(value = "resendError", required = false) String resendError,
                        @RequestParam(value = "alreadyVerified", required = false) String alreadyVerified,
                        @RequestParam(value = "passwordInvalid", required = false) String passwordInvalid,
                        @RequestParam(value = "emailNotFound", required = false) String emailNotFound,
                        @RequestParam(value = "forgotPassword", required = false) String forgotPassword,
                        @RequestParam(value = "passwordChanged", required = false) String passwordChanged,
                        @RequestParam(value = "passwordSet", required = false) String passwordSet,
                        @RequestParam(value = "tokenExpired", required = false) String tokenExpired,
                        @RequestParam(value = "locked", required = false) String locked,
                        @RequestParam(value = "passwordRequired", required = false) String passwordRequired,
                        @RequestParam(value = "retryAfterMinutes", required = false) Long retryAfterMinutes) {
        if (securityService.isAuthenticated()) {
            model.addAttribute("username", securityService.getCurrentUser());
            return "redirect:/";
        }

        if (passwordInvalid != null) {
            model.addAttribute("error", message("auth.error.passwordIncorrect"));
            model.addAttribute("showForgotPasswordLink", true);
        }

        if (emailNotFound != null) {
            model.addAttribute("error", message("auth.error.emailNotFound"));
        }

        if (error != null && !model.containsAttribute("error")) {
            model.addAttribute("error", message("auth.error.invalidCredentials"));
        }

        if (locked != null) {
            long minutes = retryAfterMinutes != null ? Math.max(retryAfterMinutes, 1L) : 15L;
            model.addAttribute("error", message("auth.error.accountLocked", minutes));
        }

        if (logout != null)
            model.addAttribute("message", message("auth.message.logoutSuccess"));

        if (unverified != null) {
            model.addAttribute("warningMessage", message("auth.warning.emailNotVerified"));
            if (email != null) {
                model.addAttribute("unverifiedEmail", email);
            }
        }

        if (resent != null && email != null) {
            model.addAttribute("infoMessage", message("auth.info.verificationEmailSent", email));
        }

        if (resendError != null) {
            model.addAttribute("error", message("auth.error.unverifiedAccountNotFound"));
        }

        if (alreadyVerified != null) {
            model.addAttribute("infoMessage", message("auth.info.emailAlreadyVerified"));
        }

        if (passwordChanged != null && !model.containsAttribute("infoMessage")) {
            model.addAttribute("infoMessage", message("auth.info.passwordChanged"));
        }

        if (passwordSet != null) {
            model.addAttribute("successMessage", message("auth.success.passwordSet"));
        }

        if (tokenExpired != null && email != null) {
            model.addAttribute("warningMessage", message("auth.warning.verificationLinkExpired"));
            model.addAttribute("unverifiedEmail", email);
        }

        if (passwordRequired != null && !model.containsAttribute("warningMessage")) {
            model.addAttribute("warningMessage", message("auth.warning.passwordSetupRequired"));
        }

        if (forgotPassword != null) {
            model.addAttribute("showForgotPasswordForm", true);
        }

        if (model.containsAttribute("showForgotPasswordForm")) {
            model.addAttribute("showForgotPasswordLink", true);
        }

        return "login";
    }

    @GetMapping(PATH_REGISTRATION_FORM)
    public String showRegistrationForm(Model model) {
        UserDto userDto = new UserDto();
        userDto.setInterfaceLanguage(localizationService.normalizeLanguage(
                LocaleContextHolder.getLocale() != null ? LocaleContextHolder.getLocale().toLanguageTag() : null));
        model.addAttribute("user", userDto);
        return "registration";
    }

    @PostMapping(PATH_REGISTER)
    public String register(@Valid @ModelAttribute("user")UserDto userDto, BindingResult result, Model model,
                           HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("user", userDto);
            return  "registration";
        }
        try {
            String clientIp = clientIpResolver.resolve(request);
            userService.registerNewUserAccount(userDto, appUrlBuilder.buildUrl(verifyPathV1), clientIp);
        } catch (UserAlreadyExistAuthenticationException uaeEx) {
            model.addAttribute("message", message("auth.error.accountExists"));
            return "error";
        }
        return "registration-success";
    }

    @PostMapping("/auth/forgot-password")
    public String forgotPassword(@RequestParam("email") String email,
                                 RedirectAttributes redirectAttributes,
                                 HttpServletRequest request) {
        String sanitizedEmail = email != null ? email.trim() : null;
        if (!StringUtils.hasText(sanitizedEmail)) {
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            redirectAttributes.addFlashAttribute("forgotPasswordError", message("auth.error.emailRequired"));
            return "redirect:/login";
        }
        Optional<UserApp> optionalUser = userService.findByEmail(sanitizedEmail);
        if (optionalUser.isEmpty()) {
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            redirectAttributes.addFlashAttribute("forgotPasswordError", message("auth.error.emailNotFound"));
            redirectAttributes.addFlashAttribute("forgotPasswordEmail", sanitizedEmail);
            return "redirect:/login";
        }
        userService.sendPasswordResetEmail(optionalUser.get(), buildPasswordResetUrl(request));
        redirectAttributes.addFlashAttribute("infoMessage", message("auth.info.passwordResetEmailSent", sanitizedEmail));
        return "redirect:/login";
    }

    @GetMapping("/password/reset/confirm")
    public String showPasswordReset(@RequestParam("token") String token,
                                    Model model,
                                    RedirectAttributes redirectAttributes) {
        Optional<VerificationToken> optionalToken = userService.findToken(token, VerificationTokenType.PASSWORD_RESET);
        if (optionalToken.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", message("auth.error.passwordResetInvalid"));
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            return "redirect:/login";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate() != null && verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            redirectAttributes.addFlashAttribute("warningMessage", message("auth.warning.passwordResetExpired"));
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            if (StringUtils.hasText(verificationToken.getUser().getEmail())) {
                redirectAttributes.addFlashAttribute("forgotPasswordEmail", verificationToken.getUser().getEmail());
            }
            return "redirect:/login";
        }
        if (!model.containsAttribute("passwordSetupForm")) {
            model.addAttribute("passwordSetupForm", new PasswordSetupForm());
        }
        model.addAttribute("token", token);
        return "password-reset";
    }

    @PostMapping("/password/reset/confirm")
    public String completePasswordReset(@RequestParam("token") String token,
                                        @Valid @ModelAttribute("passwordSetupForm") PasswordSetupForm form,
                                        BindingResult bindingResult,
                                        RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordSetupForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordSetupForm", form);
            redirectAttributes.addAttribute("token", token);
            return "redirect:/password/reset/confirm";
        }
        if (!form.getNewPassword().equals(form.getConfirmNewPassword())) {
            bindingResult.rejectValue("confirmNewPassword", "password.mismatch", message("settings.error.passwordMismatch"));
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.passwordSetupForm", bindingResult);
            redirectAttributes.addFlashAttribute("passwordSetupForm", form);
            redirectAttributes.addAttribute("token", token);
            return "redirect:/password/reset/confirm";
        }
        Optional<VerificationToken> optionalToken = userService.findToken(token, VerificationTokenType.PASSWORD_RESET);
        if (optionalToken.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", message("auth.error.passwordResetInvalid"));
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            return "redirect:/login";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate() != null && verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            redirectAttributes.addFlashAttribute("warningMessage", message("auth.warning.passwordResetExpired"));
            redirectAttributes.addFlashAttribute("showForgotPasswordForm", true);
            if (StringUtils.hasText(verificationToken.getUser().getEmail())) {
                redirectAttributes.addFlashAttribute("forgotPasswordEmail", verificationToken.getUser().getEmail());
            }
            return "redirect:/login";
        }
        userService.resetPassword(verificationToken, form.getNewPassword());
        redirectAttributes.addAttribute("passwordChanged", "true");
        return "redirect:/login";
    }

    private String buildPasswordResetUrl(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/password/reset/confirm")
                .replaceQuery(null)
                .build()
                .toUriString();
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

    @GetMapping("/api/v1/user/verify")
    public String verifyUser(@RequestParam String token) {
        Optional<VerificationToken> optionalToken = tokenRepository.findByTokenAndType(token, VerificationTokenType.REGISTRATION);
        if (optionalToken.isEmpty()) {
            return "error";
        }
        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            String email = verificationToken.getUser().getEmail();
            String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
            return "redirect:/login?tokenExpired&email=" + encodedEmail;
        }

        UserApp user = verificationToken.getUser();
        userService.setVerified(user);
        tokenRepository.delete(verificationToken);

        UserDetails userDetails = SecurityUser.fromUser(user);
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userDetails, userDetails.getPassword(), userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return "redirect:/";
    }

    @GetMapping("/api/v1/user/resend-verification")
    public String resendVerificationEmail(@RequestParam("email") String email) {
        String normalizedEmail = email.trim().toLowerCase();
        Optional<UserApp> optionalUser = userService.findByEmail(normalizedEmail);

        if (optionalUser.isEmpty()) {
            return "redirect:/login?resendError";
        }

        UserApp user = optionalUser.get();

        String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);

        if (user.isVerified()) {
            return "redirect:/login?alreadyVerified&email=" + encodedEmail;
        }

        userService.sendVerificationEmail(user, appUrlBuilder.buildUrl(verifyPathV1));
        return "redirect:/login?resent&email=" + encodedEmail;
    }
}
