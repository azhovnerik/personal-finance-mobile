package com.example.personalFinance.repository;

import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.repository.projection.CategoryTransactionTotal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByUserIdOrderByDateDesc(UUID userId);

    Optional<Transaction> findByUserIdAndId(UUID userId, UUID id);

    List<Transaction> findByUserIdAndDateBetween(UUID userId, Long start, Long end);

    Page<Transaction> findByUserIdAndDateBetween(UUID userId, Long start, Long end, Pageable pageable);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.date BETWEEN :start AND :end " +
            "AND (:accountId IS NULL OR (t.account IS NOT NULL AND t.account.id = :accountId)) " +
            "AND (:type IS NULL OR t.type = :type) " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER)")
    Page<Transaction> findByUserIdAndDateBetweenWithFilters(@Param("userId") UUID userId,
                                                            @Param("start") Long start,
                                                            @Param("end") Long end,
                                                            @Param("accountId") UUID accountId,
                                                            @Param("type") TransactionType type,
                                                            Pageable pageable);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.date BETWEEN :start AND :end " +
            "AND (:accountId IS NULL OR (t.account IS NOT NULL AND t.account.id = :accountId)) " +
            "AND (:type IS NULL OR t.type = :type) " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER) " +
            "ORDER BY t.date DESC")
    List<Transaction> findByUserIdAndDateBetweenWithFiltersOrderByDateDesc(@Param("userId") UUID userId,
                                                                           @Param("start") Long start,
                                                                           @Param("end") Long end,
                                                                           @Param("accountId") UUID accountId,
                                                                           @Param("type") TransactionType type);

    List<Transaction> findByUserIdAndCategoryId(UUID userId, UUID categoryId);

    List<Transaction> findByUserIdAndAccountId(UUID userId, UUID accountId);

    List<Transaction> findByUserIdAndAccountIdAndDirection(UUID userId, UUID accountId, TransactionDirection direction);

    List<Transaction> findByTransferId(UUID transferId);

    void deleteAllByTransferId(UUID transferId);

    boolean existsByUserIdAndAccountId(UUID userId, UUID accountId);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.category = :category " +
            "AND t.date BETWEEN :start AND :end " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER) " +
            "ORDER BY t.date DESC")
    List<Transaction> findNonTransferByUserIdAndCategoryAndDateBetweenOrderByDateDesc(@Param("userId") UUID userId,
                                                                                      @Param("category") Category category,
                                                                                      @Param("start") Long start,
                                                                                      @Param("end") Long end);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.category IN :categoryList " +
            "AND t.date BETWEEN :start AND :end " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER)")
    List<Transaction> findNonTransferByUserIdAndCategoryInAndDateBetween(@Param("userId") UUID userId,
                                                                         @Param("categoryList") List<Category> categoryList,
                                                                         @Param("start") Long start,
                                                                         @Param("end") Long end);

    @Query("SELECT t FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.date BETWEEN :start AND :end " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER)")
    List<Transaction> findByUserIdAndDateBetweenExcludingTransfers(@Param("userId") UUID userId,
                                                                   @Param("start") Long start,
                                                                   @Param("end") Long end);

    boolean existsByUserId(UUID userId);

    @Query("SELECT t.category AS category, COALESCE(SUM(t.amount), 0) AS totalAmount " +
            "FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.category IS NOT NULL " +
            "AND t.date BETWEEN :start AND :end " +
            "AND t.category.type = :type " +
            "AND (t.type IS NULL OR t.type <> com.example.personalFinance.model.TransactionType.TRANSFER) " +
            "GROUP BY t.category")
    List<CategoryTransactionTotal> sumByUserAndCategoryAndDateBetween(@Param("userId") UUID userId,
                                                                      @Param("type") CategoryType type,
                                                                      @Param("start") Long start,
                                                                      @Param("end") Long end);
}
