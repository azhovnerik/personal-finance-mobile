package com.example.personalFinance.repository;

import com.example.personalFinance.model.Transfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransferRepository extends JpaRepository<Transfer, UUID> {
    List<Transfer> findByUserId(UUID userId);

    Optional<Transfer> findByUserIdAndId(UUID userId, UUID transferId);

    Page<Transfer> findByUserId(UUID userId, Pageable pageable);

    @Query("SELECT t FROM Transfer t WHERE t.userId = :userId AND (t.fromAccount.id = :accountId OR t.toAccount.id = :accountId)")
    Page<Transfer> findByUserIdAndAccount(@Param("userId") UUID userId,
                                          @Param("accountId") UUID accountId,
                                          Pageable pageable);
}
