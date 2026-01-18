package com.example.personalFinance.service;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.UserApp;
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
import com.example.personalFinance.service.GeoIpService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;

import static com.example.personalFinance.service.UserService.MAX_FAILED_LOGIN_ATTEMPTS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private PasswordEncoderService passwordEncoderService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private VerificationTokenRepository tokenRepository;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private OnboardingStateRepository onboardingStateRepository;

    @Mock
    private SessionInvalidationService sessionInvalidationService;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private SubscriptionPlanMessageBuilder subscriptionPlanMessageBuilder;

    @Mock
    private LocalizationService localizationService;

    @Mock
    private MessageSource messageSource;

    @Mock
    private GeoIpService geoIpService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void shouldStoreCountryCodeWhenResolved() {
        when(userRepository.findByEmail(any())).thenReturn(java.util.Optional.empty());
        when(userRepository.findByPendingEmail(any())).thenReturn(java.util.Optional.empty());
        when(localizationService.normalizeLanguage(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(geoIpService.resolveCountryCode("203.0.113.5")).thenReturn("US");
        when(tokenRepository.findByUserAndType(any(), any())).thenReturn(java.util.Optional.empty());
        when(tokenRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(subscriptionService.provisionTrial(any())).thenReturn(null);
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));
        when(messageSource.getMessage(any(), any(), any())).thenReturn("text");
        when(subscriptionPlanMessageBuilder.buildPlanOptionsBulletList(any(UserApp.class))).thenReturn("");
        when(passwordEncoderService.passwordEncoder()).thenReturn(passwordEncoder);
        when(passwordEncoder.encode(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UserDto userDto = new UserDto();
        userDto.setEmail("test@example.com");
        userDto.setName("Test");
        userDto.setPassword(STRONG_TEST_PASSWORD);
        userDto.setMatchingPassword(STRONG_TEST_PASSWORD);
        userDto.setInterfaceLanguage("en");

        UserApp created = userService.registerNewUserAccount(userDto, "http://example.com", "203.0.113.5");

        assertThat(created.getCountryCode()).isEqualTo("US");
    }

    @Test
    void shouldApplyBaseCurrencyToExistingDataWhenInitializing() {
        UUID userId = UUID.randomUUID();
        UserApp user = UserApp.builder()
                .id(userId)
                .name("legacy-user")
                .email("legacy-user@example.com")
                .baseCurrency(null)
                .build();

        Account account = Account.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .currency(CurrencyCode.USD)
                .build();
        List<Account> accounts = new ArrayList<>();
        accounts.add(account);

        Transaction transaction = Transaction.builder()
                .id(UUID.randomUUID())
                .currency(CurrencyCode.EUR)
                .amount(BigDecimal.TEN)
                .build();
        List<Transaction> transactions = new ArrayList<>();
        transactions.add(transaction);

        Category category = Category.builder()
                .id(UUID.randomUUID())
                .name("Food")
                .build();
        BudgetCategory budgetCategory = BudgetCategory.builder()
                .id(UUID.randomUUID())
                .category(category)
                .currency(CurrencyCode.USD)
                .build();
        Budget budget = Budget.builder()
                .id(UUID.randomUUID())
                .user(user)
                .baseCurrency(null)
                .month(LocalDate.now())
                .budgetCategory(new ArrayList<>())
                .build();
        budget.getBudgetCategory().add(budgetCategory);
        budgetCategory.setBudget(budget);
        List<Budget> budgets = new ArrayList<>();
        budgets.add(budget);

        when(accountRepository.findAccountsByUserId(userId)).thenReturn(accounts);
        when(transactionRepository.findByUserIdOrderByDateDesc(userId)).thenReturn(transactions);
        when(budgetRepository.findBudgetByUserOrderByMonthDesc(user)).thenReturn(budgets);

        userService.setBaseCurrency(user, CurrencyCode.UAH);

        assertThat(user.getBaseCurrency()).isEqualTo(CurrencyCode.UAH);
        assertThat(account.getCurrency()).isEqualTo(CurrencyCode.UAH);
        assertThat(transaction.getCurrency()).isEqualTo(CurrencyCode.UAH);
        assertThat(budget.getBaseCurrency()).isEqualTo(CurrencyCode.UAH);
        assertThat(budgetCategory.getCurrency()).isEqualTo(CurrencyCode.UAH);

        verify(userRepository).save(user);
        verify(accountRepository).saveAll(accounts);
        verify(transactionRepository).saveAll(transactions);
        verify(budgetRepository).saveAll(budgets);
    }

    @Test
    void shouldLockUserAfterMaximumFailedAttempts() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .name("demo-user")
                .email("demo-user@example.com")
                .failedLoginAttempts(MAX_FAILED_LOGIN_ATTEMPTS-1)
                .build();

        when(userRepository.findByEmail("demo-user@example.com")).thenReturn(java.util.Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        java.util.Optional<UserApp> result = userService.recordFailedLoginAttempt("demo-user@example.com");

        assertThat(result).contains(user);
        assertThat(user.getFailedLoginAttempts()).isEqualTo(MAX_FAILED_LOGIN_ATTEMPTS);
        assertThat(user.getLockoutUntil()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void shouldResetFailedLoginAttempts() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .name("demo-user")
                .email("demo-user@example.com")
                .failedLoginAttempts(3)
                .lockoutUntil(LocalDateTime.now())
                .build();

        when(userRepository.save(user)).thenReturn(user);

        userService.resetFailedLoginAttempts(user);

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockoutUntil()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void shouldNotIncrementAttemptsWhileAccountLocked() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .name("demo-user")
                .email("demo-user@example.com")
                .failedLoginAttempts(5)
                .lockoutUntil(LocalDateTime.now().plusMinutes(10))
                .build();

        when(userRepository.findByEmail("demo-user@example.com")).thenReturn(java.util.Optional.of(user));

        userService.recordFailedLoginAttempt("demo-user@example.com");

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        verify(userRepository, never()).save(user);
    }

    @Test
    void findByNameShouldReturnEmptyWhenUsernameBlank() {
        Optional<UserApp> result = userService.findByName("   ");

        assertThat(result).isEmpty();
        verifyNoInteractions(userRepository);
    }

    @Test
    void findByNameShouldReturnUserByNormalizedEmail() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("User@Example.com")).thenReturn(Optional.empty());
        when(userRepository.findByPendingEmail("user@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByPendingEmail("User@Example.com")).thenReturn(Optional.empty());

        Optional<UserApp> result = userService.findByName("  User@Example.com  ");

        assertThat(result).contains(user);
        verify(userRepository).findByEmail("user@example.com");
        verify(userRepository).findByEmail("User@Example.com");
        verify(userRepository).findByPendingEmail("user@example.com");
        verify(userRepository).findByPendingEmail("User@Example.com");
    }

    @Test
    void findByNameShouldFallbackToPendingEmail() {
        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .email("current@example.com")
                .pendingEmail("user@example.com")
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByPendingEmail("user@example.com")).thenReturn(Optional.of(user));

        Optional<UserApp> result = userService.findByName("user@example.com");

        assertThat(result).contains(user);
        verify(userRepository, times(2)).findByEmail("user@example.com");
        verify(userRepository, times(2)).findByPendingEmail("user@example.com");
    }
}
