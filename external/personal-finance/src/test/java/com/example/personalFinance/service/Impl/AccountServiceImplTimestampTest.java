package com.example.personalFinance.service.Impl;

import com.example.personalFinance.changeBalance.repository.ChangeBalanceRepository;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.ChangeBalance;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceImplTimestampTest {

    @InjectMocks
    private AccountServiceImpl accountService;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private ChangeBalanceRepository changeBalanceRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private UserService userService;

    @Test
    void createChangeBalanceNormalizesMillisecondTimestamp() {
        UUID userId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        Account account = new Account();
        account.setId(accountId);
        account.setUserId(userId);
        account.setCurrency(CurrencyCode.USD);

        UserApp user = new UserApp();
        user.setId(userId);

        when(accountRepository.findByUserIdAndId(userId, accountId)).thenReturn(Optional.of(account));
        when(userService.findById(userId)).thenReturn(Optional.of(user));
        when(transactionRepository.findByUserIdAndAccountIdAndDirection(userId, accountId, TransactionDirection.INCREASE))
                .thenReturn(List.of());
        when(transactionRepository.findByUserIdAndAccountIdAndDirection(userId, accountId, TransactionDirection.DECREASE))
                .thenReturn(List.of());

        ArgumentCaptor<ChangeBalance> changeBalanceCaptor = ArgumentCaptor.forClass(ChangeBalance.class);
        when(changeBalanceRepository.save(changeBalanceCaptor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ArgumentCaptor<Transaction> transactionCaptor = ArgumentCaptor.forClass(Transaction.class);
        when(transactionRepository.save(transactionCaptor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        long millisTimestamp = 1_724_527_592_000L;
        long expectedSeconds = 1_724_527_592L;

        boolean created = accountService.createChangeBalance(
                userId,
                accountId,
                new BigDecimal("100.00"),
                millisTimestamp
        );

        assertTrue(created, "Change balance creation should succeed");
        assertEquals(expectedSeconds, changeBalanceCaptor.getValue().getDate());
        assertEquals(expectedSeconds, transactionCaptor.getValue().getDate());
        assertEquals(TransactionType.CHANGE_BALANCE, transactionCaptor.getValue().getType());
    }
}
