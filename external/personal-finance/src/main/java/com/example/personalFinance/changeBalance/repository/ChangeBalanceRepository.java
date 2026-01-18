package com.example.personalFinance.changeBalance.repository;

import com.example.personalFinance.model.ChangeBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeBalanceRepository extends JpaRepository<ChangeBalance, UUID> {

    Optional<ChangeBalance> findByUserIdAndId(UUID userId, UUID id);

    List<ChangeBalance> findByUserId(UUID userId);

}
