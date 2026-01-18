package com.example.personalFinance.service;

import com.example.personalFinance.model.Transfer;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TransferService {

    List<Transfer> findByUserId(UUID userId);

    Page<Transfer> findByUserId(UUID userId, Pageable pageable);

    Page<Transfer> findByUserIdAndAccount(UUID userId, UUID accountId, Pageable pageable);

    Optional<Transfer> findByUserIdAndId(UUID userId, UUID transferId);

    Optional<BigDecimal> findTransferAmount(UUID userId, UUID transferId);

    Transfer create(UUID userId, Transfer transfer, BigDecimal amount);

    Transfer update(UUID userId, Transfer transfer, BigDecimal amount);

    void delete(UUID userId, UUID transferId);
}
