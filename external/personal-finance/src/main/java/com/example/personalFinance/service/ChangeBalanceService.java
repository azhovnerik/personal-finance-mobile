package com.example.personalFinance.service;

import com.example.personalFinance.model.ChangeBalance;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeBalanceService {
    List<ChangeBalance> findByUserId(UUID id);

    ChangeBalance save(UUID userId, ChangeBalance changeBalance);

    Optional<ChangeBalance> findByUserIdAndId(UUID userId, UUID id);

    void deleteChangeBalance(ChangeBalance changeBalance);
}
