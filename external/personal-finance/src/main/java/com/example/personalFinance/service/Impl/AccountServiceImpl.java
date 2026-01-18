package com.example.personalFinance.service.Impl;

import com.example.personalFinance.changeBalance.repository.ChangeBalanceRepository;
import com.example.personalFinance.exception.AccountCurrencyChangeNotAllowedException;
import com.example.personalFinance.exception.DuplicateAccountException;
import com.example.personalFinance.model.*;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.UserService;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private ChangeBalanceRepository changeBalanceRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private UserService userService;

    @Override
    public List<Account> findByUserId(UUID userId) {
        return accountRepository.findAccountsByUserId(userId);
    }

    @Override
    public Account save(UUID userid, Account account) {
        Optional<Account> existingAccount = findByUserIdAndName(userid, account.getName());
        if (existingAccount.isPresent()) {
            if (!existingAccount.get().getId().equals(account.getId())) {
                throw new DuplicateAccountException("There is existed account with such name!");
            }
        }
        account.setUserId(userid);
        if (account.getId() != null) {
            accountRepository.findByUserIdAndId(userid, account.getId())
                    .ifPresent(existing -> {
                        if (account.getCurrency() != null
                                && existing.getCurrency() != null
                                && account.getCurrency() != existing.getCurrency()
                                && transactionRepository.existsByUserIdAndAccountId(userid, account.getId())) {
                            throw new AccountCurrencyChangeNotAllowedException(
                                    "It is not possible to change the currency because there are transactions for this account.");
                        }
                    });
        }
        if (account.getCurrency() == null) {
            userService.findById(userid).ifPresent(user -> account.setCurrency(user.getBaseCurrency()));
        }
        return accountRepository.save(account);
    }

    @Override
    public Optional<Account> findByUserIdAndName(UUID userId, String name) {
        return accountRepository.findAccountByUserIdAndName(userId, name);
    }

    @Override
    public Optional<Account> findByUserIdAndId(UUID userId, UUID id) {
        return accountRepository.findByUserIdAndId(userId, id);
    }

    @Override
    public boolean deleteAccount(UUID userId, UUID id) {

        try {
            if (findByUserIdAndId(userId, id).isPresent()) {
                accountRepository.deleteById(id);
                return true;
            } else {
                return false;
            }
        } catch (ConstraintViolationException | DataIntegrityViolationException e) {
            return false;
        }
    }

    @Override
    public boolean createChangeBalance(UUID userId, UUID accountId, BigDecimal newBalance, Long onDate) {
        Optional<Account> maybeAccount = findByUserIdAndId(userId, accountId);
        Optional<UserApp> maybeUser = userService.findById(userId);
        if (maybeAccount.isEmpty() || maybeUser.isEmpty()) {
            return false;
        }

        long effectiveDate = normalizeTimestamp(onDate);
        BigDecimal currentBalance = getAccountBalance(userId, accountId, effectiveDate);
        if (currentBalance.compareTo(newBalance) == 0) {
            return false;
        }

        TransactionDirection direction = currentBalance.compareTo(newBalance) < 0
                ? TransactionDirection.INCREASE
                : TransactionDirection.DECREASE;
        BigDecimal delta = direction == TransactionDirection.INCREASE
                ? newBalance.subtract(currentBalance)
                : currentBalance.subtract(newBalance);

        ChangeBalance changeBalance = changeBalanceRepository.save(
                new ChangeBalance(userId, effectiveDate, newBalance, maybeAccount.get(), "")
        );

        Transaction transaction = new Transaction(
                maybeUser.get(),
                effectiveDate,
                delta,
                maybeAccount.get(),
                changeBalance,
                TransactionType.CHANGE_BALANCE,
                direction,
                ""
        );
        saveNonTransferTransaction(transaction);
        return true;
    }

    @Override
    public BigDecimal getAccountBalance(UUID userId, UUID accountId, Long onDate) {
        long effectiveDate = normalizeTimestamp(onDate);
        BigDecimal accountBalanceIncrease = getAccountTurnover(userId, accountId, TransactionDirection.INCREASE, effectiveDate);
        BigDecimal accountBalanceDecrease = getAccountTurnover(userId, accountId, TransactionDirection.DECREASE, effectiveDate);
        return accountBalanceIncrease.subtract(accountBalanceDecrease);
    }

    @Override
    public BigDecimal getAccountTurnover(UUID userId, UUID accountId, TransactionDirection direction, Long dateTo) {
        long effectiveDate = normalizeTimestamp(dateTo);
        return transactionRepository.findByUserIdAndAccountIdAndDirection(userId, accountId, direction).stream()
                .filter(t -> t.getDate() <= effectiveDate).map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Transaction saveNonTransferTransaction(Transaction transaction) {
        if (transaction.getType() == TransactionType.TRANSFER) {
            throw new UnsupportedOperationException("Transfer transactions must be managed via TransferService");
        }
        if (transaction.getAccount() != null) {
            transaction.setCurrency(transaction.getAccount().getCurrency());
        }
        return transactionRepository.save(transaction);
    }

    private long normalizeTimestamp(Long timestamp) {
        long normalized = timestamp != null ? timestamp : Instant.now().getEpochSecond();
        while (normalized > 9_999_999_999L) {
            normalized = normalized / 1_000L;
        }
        return normalized;
    }
}
