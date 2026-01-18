package com.example.personalFinance.service;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.exception.UserAlreadyExistAuthenticationException;
import com.example.personalFinance.mapper.UserMapper;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.OnboardingState;
import com.example.personalFinance.model.Role;
import com.example.personalFinance.model.Status;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.VerificationToken;
import com.example.personalFinance.model.VerificationTokenType;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.BudgetRepository;
import com.example.personalFinance.repository.OnboardingStateRepository;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.repository.UserRepository;
import com.example.personalFinance.repository.VerificationTokenRepository;
import com.example.personalFinance.security.PasswordEncoderService;
import com.example.personalFinance.security.session.SessionInvalidationService;
import com.example.personalFinance.service.subscription.SubscriptionPlanMessageBuilder;
import com.example.personalFinance.service.subscription.SubscriptionService;
import com.example.personalFinance.validator.ValidPassword;
import com.example.personalFinance.service.AppUrlBuilder;
import com.example.personalFinance.service.GeoIpService;
import jakarta.validation.Valid;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    public static final int MAX_FAILED_LOGIN_ATTEMPTS = 10;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private VerificationTokenRepository tokenRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private OnboardingStateRepository onboardingStateRepository;

    @Autowired
    private SessionInvalidationService sessionInvalidationService;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private SubscriptionPlanMessageBuilder subscriptionPlanMessageBuilder;

    @Autowired
    private AppUrlBuilder appUrlBuilder;

    @Autowired
    private LocalizationService localizationService;

    @Autowired
    private MessageSource messageSource;

    @Autowired
    private GeoIpService geoIpService;

    @Value("${app.mail.from-address:}")
    private String mailFromAddress;

    @Value("${app.mail.support-address:support@moneydrive.me}")
    private String supportEmailAddress;

    @Value("${app.user.verify-path.v2:/api/v2/user/verify}")
    private String defaultVerifyPath;

    private String defaultVerifyUrl() {
        return appUrlBuilder.buildUrl(defaultVerifyPath);
    }

    public List<UserDto> getUsers() {
        return userMapper.toDtoList(userRepository.findAll());
    }

    @Transactional
    public UserApp registerNewUserAccount(@Valid UserDto userDto) {
        return registerNewUserAccount(userDto, defaultVerifyUrl(), null);
    }

    @Transactional
    public UserApp registerNewUserAccount(@Valid UserDto userDto, String verifyBaseUrl) {
        return registerNewUserAccount(userDto, verifyBaseUrl, null);
    }

    @Transactional
    public UserApp registerNewUserAccount(@Valid UserDto userDto, String verifyBaseUrl, String clientIp) {
        String normalizedEmail = normalizeEmail(userDto.getEmail());
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new IllegalArgumentException("Email must not be empty");
        }
        if (emailExists(normalizedEmail)) {
            throw new UserAlreadyExistAuthenticationException("There is an account with that email address: "
                    + normalizedEmail);
        }

        String countryCode = geoIpService != null ? geoIpService.resolveCountryCode(clientIp) : null;

        UserApp user = UserApp.builder()
                .name(userDto.getName())
                .email(normalizedEmail)
                .password(passwordEncoderService.passwordEncoder().encode(userDto.getPassword()))
                .role(Role.USER)
                .status(Status.ACTIVE)
                .interfaceLanguage(localizationService.normalizeLanguage(userDto.getInterfaceLanguage()))
                .countryCode(countryCode)
                .build();

        userRepository.save(user);

        onboardingStateRepository.save(
                OnboardingState.builder()
                        .user(user)
                        .isCompleted(false)
                        .build());

        subscriptionService.provisionTrial(user);

        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.REGISTRATION, user.getEmail());

        log.info("Registered new user with id {} and email {}", user.getId(), user.getEmail());
        notifySupportAboutNewUser(user);
        return user;
    }

    public void notifySupportAboutNewUser(UserApp user) {
        if (!StringUtils.hasText(supportEmailAddress)) {
            return;
        }
        Locale locale = localizationService.getDefaultLocale();
        String subject = messageSource.getMessage("support.email.newUser.subject", null, locale);
        String body = messageSource.getMessage("support.email.newUser.body",
                new Object[]{user.getEmail(), user.getName(), user.getId(), user.getCountryCode()},
                locale);
        sendEmail(supportEmailAddress, subject, body);
    }

    public void sendVerificationEmail(UserApp user) {
        sendVerificationEmail(user, defaultVerifyUrl(), VerificationTokenType.REGISTRATION, user.getEmail());
    }

    public void sendVerificationEmail(UserApp user, String verifyBaseUrl) {
        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.REGISTRATION, user.getEmail());
    }

    public void sendVerificationEmail(UserApp user, String verifyBaseUrl, VerificationTokenType type, String targetEmail) {
        if (!StringUtils.hasText(targetEmail)) {
            return;
        }
        VerificationToken verificationToken = createOrUpdateVerificationToken(user, type, targetEmail);
        String verifyUrl = verifyBaseUrl + "?token=" + verificationToken.getToken();
        Locale locale = localizationService.resolveLocale(user.getInterfaceLanguage());
        String subject = buildEmailSubject(type, locale);
        String body = buildEmailBody(type, verifyUrl, locale, user);
        sendEmail(targetEmail, subject, body);

        log.info("Sent {} email to {} for user {}", type, targetEmail, user.getId());
    }

    private String buildEmailSubject(VerificationTokenType type, Locale locale) {
        return switch (type) {
            case EMAIL_CHANGE -> messageSource.getMessage("email.verify.subject", null, locale);
            case PASSWORD_SETUP -> messageSource.getMessage("email.password.setup.subject", null, locale);
            case PASSWORD_RESET -> messageSource.getMessage("email.password.reset.subject", null, locale);
            default -> messageSource.getMessage("email.verify.default.subject", null, locale);
        };
    }

    private String buildEmailBody(VerificationTokenType type, String verifyUrl, Locale locale, UserApp user) {
        return switch (type) {
            case EMAIL_CHANGE -> messageSource.getMessage("email.verify.body", new Object[]{verifyUrl}, locale);
            case PASSWORD_SETUP -> messageSource.getMessage("email.password.setup.body", new Object[]{verifyUrl}, locale);
            case PASSWORD_RESET -> messageSource.getMessage("email.password.reset.body", new Object[]{verifyUrl}, locale);
            default -> buildRegistrationEmailBody(verifyUrl, locale, user);
        };
    }

    private void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        String from = resolveMailFromAddress();
        if (StringUtils.hasText(from)) {
            message.setFrom(from);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String resolveMailFromAddress() {
        if (StringUtils.hasText(supportEmailAddress)) {
            return supportEmailAddress;
        }
        if (StringUtils.hasText(mailFromAddress)) {
            return mailFromAddress;
        }
        return null;
    }

    private String buildRegistrationEmailBody(String verifyUrl, Locale locale, UserApp user) {
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("register.verify.body", new Object[]{verifyUrl}, locale))
                .append(messageSource.getMessage("register.verify.trial", null, locale));

        String planOptions = subscriptionPlanMessageBuilder.buildPlanOptionsBulletList(user);
        if (StringUtils.hasText(planOptions)) {
            body.append(messageSource.getMessage("register.verify.planHeader", null, locale))
                    .append('\n')
                    .append(planOptions)
                    .append('\n');
        } else {
            body.append(messageSource.getMessage("register.verify.planFallback", null, locale))
                    .append('\n');
        }

        body.append(messageSource.getMessage("register.verify.reminder", null, locale));
        return body.toString();
    }

    private VerificationToken createOrUpdateVerificationToken(UserApp user, VerificationTokenType type, String targetEmail) {
        VerificationToken verificationToken = tokenRepository.findByUserAndType(user, type)
                .orElseGet(VerificationToken::new);

        verificationToken.setToken(UUID.randomUUID().toString());
        verificationToken.setUser(user);
        verificationToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        verificationToken.setType(type);
        verificationToken.setTargetEmail(targetEmail);

        return tokenRepository.save(verificationToken);
    }

    private boolean emailExists(String email) {
        return userRepository.findByEmail(email).isPresent()
                || userRepository.findByPendingEmail(email).isPresent();
    }

    public Optional<UserApp> findByName(String username) {
        if (!StringUtils.hasText(username)) {
            return Optional.empty();
        }

        String trimmedUsername = username.trim();
        String normalizedEmail = normalizeEmail(trimmedUsername);
        Optional<UserApp> normalizedEmailLookup = StringUtils.hasText(normalizedEmail)
                ? emptyIfNull(userRepository.findByEmail(normalizedEmail))
                : Optional.empty();
        Optional<UserApp> rawEmailLookup = emptyIfNull(userRepository.findByEmail(trimmedUsername));
        Optional<UserApp> normalizedPendingLookup = StringUtils.hasText(normalizedEmail)
                ? emptyIfNull(userRepository.findByPendingEmail(normalizedEmail))
                : Optional.empty();
        Optional<UserApp> rawPendingLookup = emptyIfNull(userRepository.findByPendingEmail(trimmedUsername));

        return normalizedEmailLookup
                .or(() -> rawEmailLookup)
                .or(() -> normalizedPendingLookup)
                .or(() -> rawPendingLookup);
    }

    public Optional<UserApp> findById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<UserApp> findByTelegramName(String telegramName) {
        return userRepository.findByTelegramName(telegramName);
    }

    public Optional<UserApp> findByEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) {
            return Optional.empty();
        }
        return userRepository.findByEmail(normalized);
    }

    public Optional<UserApp> findByPendingEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) {
            return Optional.empty();
        }
        return userRepository.findByPendingEmail(normalized);
    }

    @Transactional
    public Optional<UserApp> recordFailedLoginAttempt(String username) {
        if (!StringUtils.hasText(username)) {
            return Optional.empty();
        }

        Optional<UserApp> optionalUser = findByName(username.trim());
        optionalUser.ifPresent(this::incrementFailedAttempts);
        return optionalUser;
    }

    @Transactional
    public void resetFailedLoginAttempts(UserApp user) {
        if (user == null) {
            return;
        }
        if (user.getFailedLoginAttempts() == 0 && user.getLockoutUntil() == null) {
            return;
        }
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);
    }

    private void incrementFailedAttempts(UserApp user) {
        LocalDateTime now = LocalDateTime.now();
        if (user.isLoginLocked(now)) {
            return;
        }

        if (user.getLockoutUntil() != null && !user.getLockoutUntil().isAfter(now)) {
            user.setLockoutUntil(null);
            user.setFailedLoginAttempts(0);
        }

        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            user.setLockoutUntil(now.plus(LOCKOUT_DURATION));
            log.warn("User {} locked due to {} failed login attempts", user.getId(), attempts);
        }

        userRepository.save(user);
    }

    public Optional<VerificationToken> findToken(String token, VerificationTokenType type) {
        return tokenRepository.findByTokenAndType(token, type);
    }

    public void setVerified(UserApp user) {
        user.setVerified(true);
        userRepository.save(user);
        log.info("User {} marked as verified", user.getId());
    }

    @Transactional
    public boolean updateProfile(UserApp user, String name, String email, String telegramName, CurrencyCode baseCurrency,
                                 String interfaceLanguage, String verifyBaseUrl) {
        String sanitizedName = name != null ? name.trim() : user.getName();
        String sanitizedTelegram = StringUtils.hasText(telegramName) ? telegramName.trim() : null;
        boolean changed = false;

        if (StringUtils.hasText(sanitizedName) && !Objects.equals(user.getName(), sanitizedName)) {
            log.info("User {} changed name from '{}' to '{}'", user.getId(), user.getName(), sanitizedName);
            user.setName(sanitizedName);
            changed = true;
        }

        if (!Objects.equals(user.getTelegramName(), sanitizedTelegram)) {
            log.info("User {} changed telegram name from '{}' to '{}'", user.getId(), user.getTelegramName(), sanitizedTelegram);
            user.setTelegramName(sanitizedTelegram);
            changed = true;
        }

        if (baseCurrency != null && baseCurrency != user.getBaseCurrency()) {
            setBaseCurrency(user, baseCurrency);
            changed = true;
        }

        if (interfaceLanguage != null) {
            changed = updateInterfaceLanguageInternal(user, interfaceLanguage) || changed;
        }

        boolean emailChanged = maybeStartEmailChange(user, email, verifyBaseUrl);
        changed = changed || emailChanged;

        if (changed) {
            userRepository.save(user);
        }

        return emailChanged;
    }

    public void updateInterfaceLanguage(UserApp user, String interfaceLanguage) {
        if (user == null) {
            throw new IllegalArgumentException("User must not be null");
        }
        boolean updated = updateInterfaceLanguageInternal(user, interfaceLanguage);
        if (updated) {
            userRepository.save(user);
        }
    }

    private boolean updateInterfaceLanguageInternal(UserApp user, String interfaceLanguage) {
        String normalized = localizationService.normalizeLanguage(interfaceLanguage);
        if (Objects.equals(user.getInterfaceLanguage(), normalized)) {
            return false;
        }
        user.setInterfaceLanguage(normalized);
        return true;
    }

    @Transactional
    public void setBaseCurrency(UserApp user, CurrencyCode baseCurrency) {
        if (user == null) {
            throw new IllegalArgumentException("User must not be null");
        }
        if (baseCurrency == null) {
            throw new IllegalArgumentException("Base currency must be provided");
        }
        if (user.getBaseCurrency() == null) {
            applyInitialBaseCurrency(user, baseCurrency);
            log.info("User {} initialized base currency to {}", user.getId(), baseCurrency);
            return;
        }
        if (baseCurrency == user.getBaseCurrency()) {
            return;
        }
        boolean hasBudgets = budgetRepository.existsByUser(user);
        boolean hasTransactions = transactionRepository.existsByUserId(user.getId());
        if (hasBudgets || hasTransactions) {
            throw new IllegalStateException("Base currency can be changed only when there are no budgets or transactions.");
        }
        user.setBaseCurrency(baseCurrency);
        userRepository.save(user);
        log.info("User {} changed base currency to {}", user.getId(), baseCurrency);
    }

    private void applyInitialBaseCurrency(UserApp user, CurrencyCode baseCurrency) {
        user.setBaseCurrency(baseCurrency);
        userRepository.save(user);

        List<Account> accounts = accountRepository.findAccountsByUserId(user.getId());
        accounts.forEach(account -> account.setCurrency(baseCurrency));
        if (!accounts.isEmpty()) {
            accountRepository.saveAll(accounts);
        }

        List<Transaction> transactions = transactionRepository.findByUserIdOrderByDateDesc(user.getId());
        transactions.forEach(transaction -> transaction.setCurrency(baseCurrency));
        if (!transactions.isEmpty()) {
            transactionRepository.saveAll(transactions);
        }

        List<Budget> budgets = budgetRepository.findBudgetByUserOrderByMonthDesc(user);
        budgets.forEach(budget -> {
            budget.setBaseCurrency(baseCurrency);
            if (budget.getBudgetCategory() != null) {
                budget.getBudgetCategory().forEach(category -> category.setCurrency(baseCurrency));
            }
        });
        if (!budgets.isEmpty()) {
            budgetRepository.saveAll(budgets);
        }
    }

    private boolean maybeStartEmailChange(UserApp user, String newEmail, String verifyBaseUrl) {
        if (!StringUtils.hasText(newEmail)) {
            return false;
        }
        String normalizedEmail = normalizeEmail(newEmail);
        if (Objects.equals(normalizedEmail, normalizeEmail(user.getEmail()))) {
            return false;
        }
        if (user.getPendingEmail() != null && Objects.equals(normalizedEmail, normalizeEmail(user.getPendingEmail()))) {
            return false;
        }

        if (emailExists(normalizedEmail)) {
            throw new UserAlreadyExistAuthenticationException("There is an account with that email address: "
                    + normalizedEmail);
        }

        user.setPendingEmail(normalizedEmail);
        user.setPendingEmailRequestedAt(LocalDateTime.now());
        user.setVerified(false);
        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.EMAIL_CHANGE, normalizedEmail);
        log.info("User {} initiated email change from {} to {}", user.getId(), user.getEmail(), normalizedEmail);
        return true;
    }

    @Transactional
    public void resendPendingEmailVerification(UserApp user, String verifyBaseUrl) {
        if (!StringUtils.hasText(user.getPendingEmail())) {
            return;
        }
        String pending = normalizeEmail(user.getPendingEmail());
        user.setPendingEmailRequestedAt(LocalDateTime.now());
        userRepository.save(user);
        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.EMAIL_CHANGE, pending);
        log.info("User {} requested re-send of email change verification to {}", user.getId(), pending);
    }

    @Transactional
    public void completeEmailChange(VerificationToken verificationToken) {
        UserApp user = verificationToken.getUser();
        String oldEmail = user.getEmail();
        String pending = user.getPendingEmail();

        if (!StringUtils.hasText(pending)) {
            log.warn("Cannot complete email change for user {} because there is no pending email", user.getId());
            tokenRepository.delete(verificationToken);
            return;
        }

        user.setEmail(pending);
        user.setPendingEmail(null);
        user.setPendingEmailRequestedAt(null);
        user.setVerified(true);

        userRepository.save(user);
        tokenRepository.delete(verificationToken);

        List<String> usernames = new ArrayList<>();
        usernames.add(oldEmail);
        if (pending != null) {
            usernames.add(pending);
        }
        sessionInvalidationService.invalidateSessions(usernames);
        log.info("User {} completed email change from {} to {}", user.getId(), oldEmail, pending);
    }

    @Transactional
    public void changePassword(UserApp user, String currentPassword, @ValidPassword String newPassword) {
        if (!StringUtils.hasText(newPassword)) {
            throw new IllegalArgumentException("New password must not be empty");
        }
        if (!StringUtils.hasText(user.getPassword())) {
            throw new IllegalStateException("Password is not set for this account");
        }
        if (!passwordEncoderService.passwordEncoder().matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPassword(passwordEncoderService.passwordEncoder().encode(newPassword));
        userRepository.save(user);
        sessionInvalidationService.invalidateSessions(collectUserEmails(user));
        log.info("User {} changed password", user.getId());
    }

    @Transactional
    public void completePasswordSetup(VerificationToken verificationToken, @ValidPassword String newPassword) {
        UserApp user = verificationToken.getUser();
        applyPassword(user, newPassword);
        tokenRepository.delete(verificationToken);
        log.info("User {} set a password via setup link", user.getId());
    }

    public void sendPasswordSetupEmail(UserApp user, String verifyBaseUrl) {
        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.PASSWORD_SETUP, user.getEmail());
    }

    @Transactional
    public void resetPassword(VerificationToken verificationToken, @ValidPassword String newPassword) {
        UserApp user = verificationToken.getUser();
        applyPassword(user, newPassword);
        resetFailedLoginAttempts(user);
        tokenRepository.delete(verificationToken);
        log.info("User {} reset password via reset link", user.getId());
    }

    public void sendPasswordResetEmail(UserApp user, String verifyBaseUrl) {
        sendVerificationEmail(user, verifyBaseUrl, VerificationTokenType.PASSWORD_RESET, user.getEmail());
    }

    public boolean hasPassword(UserApp user) {
        return StringUtils.hasText(user.getPassword());
    }

    private void applyPassword(UserApp user, String newPassword) {
        user.setPassword(passwordEncoderService.passwordEncoder().encode(newPassword));
        userRepository.save(user);
        sessionInvalidationService.invalidateSessions(collectUserEmails(user));
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private Optional<UserApp> emptyIfNull(Optional<UserApp> optional) {
        return optional == null ? Optional.empty() : optional;
    }

    private List<String> collectUserEmails(UserApp user) {
        List<String> usernames = new ArrayList<>();
        if (user == null) {
            return usernames;
        }
        if (user.getEmail() != null) {
            usernames.add(user.getEmail());
        }
        if (user.getPendingEmail() != null) {
            usernames.add(user.getPendingEmail());
        }
        return usernames;
    }
}
