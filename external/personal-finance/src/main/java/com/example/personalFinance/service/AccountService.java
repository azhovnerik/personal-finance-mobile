package com.example.personalFinance.service;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.TransactionDirection;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountService {

    List<Account> findByUserId(UUID id);

    Account save(UUID userId, Account account);

    Optional<Account> findByUserIdAndName(UUID userId, String name);

    Optional<Account> findByUserIdAndId(UUID userId, UUID id);

    boolean deleteAccount(UUID userId, UUID id);

    boolean createChangeBalance(UUID userId, UUID accountId, BigDecimal newBalance, Long onDate);

    BigDecimal getAccountBalance(UUID userId, UUID accountId, Long onDate);

    BigDecimal getAccountTurnover(UUID userId, UUID accountId, TransactionDirection direction, Long dateTo);
}
