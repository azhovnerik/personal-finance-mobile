package com.example.personalFinance.service;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.Transaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface TransactionService {

    List<TransactionDto> findByUserId(UUID id);

    Optional<TransactionDto> findById(UUID id);

    List<TransactionDto> findByUserIdAndPeriod(UUID userId, Long start, Long end);

    List<TransactionDto> findByUserIdAndPeriod(UUID userId, Long start, Long end, UUID accountId, TransactionType type);

    Page<TransactionDto> findByUserIdAndPeriod(UUID userId, Long start, Long end, UUID accountId, TransactionType type,
                                               Pageable pageable);

    List<TransactionDto> findByUserIdAndCategoryId(UUID userId, UUID categoryId);

    List<TransactionDto> findByUserIdAndAccountId(UUID userId, UUID accountId);

    boolean delete(UUID userId, UUID id);

    Transaction save(Transaction transaction);

    Optional<TransactionDto> findByUserIdAndId(UUID userId, UUID id);

    BigDecimal calculateTotalByCategoryForPeriod(UUID userId, Category category, Long start, Long end);

    Map<String, BigDecimal> calculateTotalByCategoryListForPeriod(UUID userId, List<Category> categoryList, Long start, Long end);

    List<TransactionDto> findByUserIdAndCategoryIdAndMonth(UUID userId, UUID categoryId, String month);

    List<TransactionDto> findByUserIdAndCategoryIdAndPeriod(UUID userId, Category category, Long start, Long end);

    Map<Category, BigDecimal> calculateTotalsByCategoryTypeForPeriod(UUID userId, CategoryType type, Long start, Long end);
}
