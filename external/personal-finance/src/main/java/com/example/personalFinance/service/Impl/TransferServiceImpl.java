package com.example.personalFinance.service.Impl;

import com.example.personalFinance.exception.CurrencyMismatchException;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.Transfer;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.repository.TransferRepository;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TransferServiceImpl implements TransferService {

    private final TransferRepository transferRepository;
    private final TransactionRepository transactionRepository;
    private final UserService userService;

    public TransferServiceImpl(TransferRepository transferRepository,
                               TransactionRepository transactionRepository,
                               UserService userService) {
        this.transferRepository = transferRepository;
        this.transactionRepository = transactionRepository;
        this.userService = userService;
    }

    @Override
    public List<Transfer> findByUserId(UUID userId) {
        return transferRepository.findByUserId(userId);
    }

    @Override
    public Page<Transfer> findByUserId(UUID userId, Pageable pageable) {
        return transferRepository.findByUserId(userId, pageable);
    }

    @Override
    public Page<Transfer> findByUserIdAndAccount(UUID userId, UUID accountId, Pageable pageable) {
        return transferRepository.findByUserIdAndAccount(userId, accountId, pageable);
    }

    @Override
    public Optional<Transfer> findByUserIdAndId(UUID userId, UUID transferId) {
        return transferRepository.findByUserIdAndId(userId, transferId);
    }

    @Override
    public Optional<BigDecimal> findTransferAmount(UUID userId, UUID transferId) {
        Optional<Transfer> transfer = transferRepository.findByUserIdAndId(userId, transferId);
        if (transfer.isEmpty()) {
            return Optional.empty();
        }
        List<Transaction> linkedTransactions = transactionRepository.findByTransferId(transferId).stream()
                .filter(transaction -> transaction.getUser() != null
                        && transaction.getUser().getId() != null
                        && transaction.getUser().getId().equals(userId))
                .collect(Collectors.toList());
        return linkedTransactions.stream()
                .filter(transaction -> transaction.getDirection() == TransactionDirection.DECREASE)
                .map(Transaction::getAmount)
                .findFirst()
                .or(() -> linkedTransactions.stream()
                        .map(Transaction::getAmount)
                        .findFirst());
    }

    @Override
    @Transactional
    public Transfer create(UUID userId, Transfer transfer, BigDecimal amount) {
        Transfer transferToPersist = prepareTransfer(userId, transfer, amount);
        Transfer saved = transferRepository.save(transferToPersist);
        synchronizeTransactions(saved, amount);
        return saved;
    }

    @Override
    @Transactional
    public Transfer update(UUID userId, Transfer transfer, BigDecimal amount) {
        if (transfer.getId() == null) {
            throw new IllegalArgumentException("Transfer identifier is required for update");
        }
        Transfer existing = transferRepository.findByUserIdAndId(userId, transfer.getId())
                .orElseThrow(() -> new IllegalArgumentException("Transfer not found"));
        existing.setComment(transfer.getComment());
        existing.setDate(transfer.getDate());
        existing.setFromAccount(transfer.getFromAccount());
        existing.setToAccount(transfer.getToAccount());
        Transfer prepared = prepareTransfer(userId, existing, amount);
        Transfer saved = transferRepository.save(prepared);
        synchronizeTransactions(saved, amount);
        return saved;
    }

    @Override
    @Transactional
    public void delete(UUID userId, UUID transferId) {
        Transfer existing = transferRepository.findByUserIdAndId(userId, transferId)
                .orElseThrow(() -> new IllegalArgumentException("Transfer not found"));
        List<Transaction> linkedTransactions = transactionRepository.findByTransferId(existing.getId());
        transactionRepository.deleteAll(linkedTransactions);
        transferRepository.delete(existing);
    }

    private Transfer prepareTransfer(UUID userId, Transfer transfer, BigDecimal amount) {
        if (transfer.getFromAccount() == null || transfer.getToAccount() == null) {
            throw new IllegalArgumentException("Both accounts are required for transfer");
        }
        if (transfer.getFromAccount().getId() == null || transfer.getToAccount().getId() == null) {
            throw new IllegalArgumentException("Accounts must be persisted before transfer");
        }
        if (transfer.getFromAccount().getUserId() == null || !transfer.getFromAccount().getUserId().equals(userId)
                || transfer.getToAccount().getUserId() == null || !transfer.getToAccount().getUserId().equals(userId)) {
            throw new IllegalArgumentException("Accounts do not belong to the provided user");
        }
        if (transfer.getFromAccount().getCurrency() == null || transfer.getToAccount().getCurrency() == null) {
            throw new IllegalArgumentException("Both accounts must have currency defined");
        }
        if (!transfer.getFromAccount().getCurrency().equals(transfer.getToAccount().getCurrency())) {
            throw new CurrencyMismatchException("Transfers between accounts with different currencies are not supported");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Transfer amount must be greater than zero");
        }
        if (transfer.getDate() == null) {
            throw new IllegalArgumentException("Transfer date is required");
        }
        transfer.setUserId(userId);
        return transfer;
    }

    private void synchronizeTransactions(Transfer transfer, BigDecimal amount) {
        UserApp user = userService.findById(transfer.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Map<TransactionDirection, Transaction> existingTransactions = new EnumMap<>(TransactionDirection.class);
        for (Transaction transaction : transactionRepository.findByTransferId(transfer.getId())) {
            existingTransactions.put(transaction.getDirection(), transaction);
        }

        Transaction decrease = buildTransferTransaction(existingTransactions.get(TransactionDirection.DECREASE),
                transfer, transfer.getFromAccount(), TransactionDirection.DECREASE, amount, user);
        Transaction increase = buildTransferTransaction(existingTransactions.get(TransactionDirection.INCREASE),
                transfer, transfer.getToAccount(), TransactionDirection.INCREASE, amount, user);

        transactionRepository.saveAll(List.of(decrease, increase));

        existingTransactions.values().stream()
                .filter(transaction -> transaction.getDirection() != TransactionDirection.DECREASE
                        && transaction.getDirection() != TransactionDirection.INCREASE)
                .forEach(transactionRepository::delete);
    }

    private Transaction buildTransferTransaction(Transaction transaction,
                                                 Transfer transfer,
                                                 Account account,
                                                 TransactionDirection direction,
                                                 BigDecimal amount,
                                                 UserApp user) {
        Transaction result = transaction != null ? transaction : new Transaction();
        result.setUser(user);
        result.setDate(transfer.getDate());
        result.setAmount(amount);
        result.setAccount(account);
        result.setTransfer(transfer);
        result.setType(TransactionType.TRANSFER);
        result.setDirection(direction);
        result.setComment(transfer.getComment());
        result.setCurrency(account.getCurrency());
        result.setCategory(null);
        result.setChangeBalance(null);
        return result;
    }
}
