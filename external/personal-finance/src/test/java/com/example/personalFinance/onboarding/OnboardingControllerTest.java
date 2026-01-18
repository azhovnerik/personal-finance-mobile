package com.example.personalFinance.onboarding;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.onboarding.dto.AccountInputDTO;
import com.example.personalFinance.onboarding.OnboardingSessionDTO;
import com.example.personalFinance.onboarding.repository.CategoryTemplateI18nRepository;
import com.example.personalFinance.onboarding.repository.CategoryTemplateRepository;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;

@ExtendWith(MockitoExtension.class)
class OnboardingControllerTest {

    @Mock
    private CategoryTemplateRepository categoryTemplateRepository;
    @Mock
    private CategoryTemplateI18nRepository categoryTemplateI18nRepository;
    @Mock
    private com.example.personalFinance.service.OnboardingService onboardingService;
    @Mock
    private SecurityService securityService;
    @Mock
    private UserService userService;
    @Mock
    private CategoryService categoryService;
    @Mock
    private AccountService accountService;
    @Mock
    private LocalizationService localizationService;

    @InjectMocks
    private OnboardingController controller;

    private HttpSession session;

    @BeforeEach
    void setUpSession() {
        session = new MockHttpSession();
        OnboardingSessionDTO dto = new OnboardingSessionDTO();
        dto.setBaseCurrency(CurrencyCode.EUR);
        session.setAttribute("onboardingSession", dto);
    }

    @Test
    void saveAccountsShouldStoreMultipleAccountsWithBalances() {
        controller.saveAccounts(
                List.of("Wallet", "Savings"),
                List.of(AccountType.CASH.name(), AccountType.BANK_ACCOUNT.name()),
                List.of("Daily cash", ""),
                Arrays.asList(CurrencyCode.USD.name(), null),
                List.of("100.50", "-25"),
                session);

        OnboardingSessionDTO stored = (OnboardingSessionDTO) session.getAttribute("onboardingSession");
        assertNotNull(stored);
        assertEquals(2, stored.getAccounts().size());

        AccountInputDTO first = stored.getAccounts().get(0);
        assertEquals("Wallet", first.getName());
        assertEquals(AccountType.CASH.name(), first.getType());
        assertEquals(CurrencyCode.USD, first.getCurrency());
        assertEquals(new BigDecimal("100.50"), first.getInitialBalance());

        AccountInputDTO second = stored.getAccounts().get(1);
        assertEquals("Savings", second.getName());
        assertEquals(AccountType.BANK_ACCOUNT.name(), second.getType());
        assertEquals(CurrencyCode.EUR, second.getCurrency());
        assertEquals(new BigDecimal("-25"), second.getInitialBalance());
    }

    @Test
    void finishShouldCreateChangeBalanceForNonZeroBalances() {
        OnboardingSessionDTO dto = (OnboardingSessionDTO) session.getAttribute("onboardingSession");
        dto.setAccounts(List.of(
                new AccountInputDTO("Cash", AccountType.CASH.name(), "", CurrencyCode.USD, new BigDecimal("150.00")),
                new AccountInputDTO("Card", AccountType.CARD.name(), "", null, BigDecimal.ZERO)
        ));
        dto.setIncomeIds(null);
        dto.setExpenseIds(null);
        dto.setInterfaceLanguage("en");

        UserApp user = UserApp.builder()
                .id(UUID.randomUUID())
                .name("demo")
                .email("demo@example.com")
                .build();

        when(securityService.getCurrentUser()).thenReturn("demo");
        when(userService.findByName("demo")).thenReturn(Optional.of(user));
        when(accountService.save(eq(user.getId()), any(Account.class))).thenAnswer(invocation -> {
            Account account = invocation.getArgument(1);
            return Account.builder()
                    .id(UUID.randomUUID())
                    .name(account.getName())
                    .description(account.getDescription())
                    .type(account.getType())
                    .currency(account.getCurrency())
                    .userId(account.getUserId())
                    .build();
        });

        controller.finish(session);

        verify(accountService, times(2)).save(eq(user.getId()), any(Account.class));
        verify(accountService, times(1)).createChangeBalance(eq(user.getId()), any(UUID.class), eq(new BigDecimal("150.00")), anyLong());
        verify(accountService, never()).createChangeBalance(eq(user.getId()), any(UUID.class), eq(BigDecimal.ZERO), anyLong());
        verify(onboardingService).markCompleted(user.getId());
        assertNull(session.getAttribute("onboardingSession"));
    }
}
