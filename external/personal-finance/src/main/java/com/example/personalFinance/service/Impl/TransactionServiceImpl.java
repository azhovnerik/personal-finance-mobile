package com.example.personalFinance.service.Impl;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.mapper.TransactionMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.utils.DateTimeUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TransactionServiceImpl implements TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private TransactionMapper transactionMapper;

    @Autowired
    private CurrencyConversionService currencyConversionService;


    @Override
    public Optional<TransactionDto> findById(UUID id) {
        Optional<Transaction> transaction = transactionRepository.findById(id);
        if (!transaction.isPresent()) return Optional.empty();
        return Optional.of(transactionMapper.toDto(transaction.get()));
    }

    @Override
    public List<TransactionDto> findByUserId(UUID userId) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(transactionRepository.findByUserIdOrderByDateDesc(userId));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public List<TransactionDto> findByUserIdAndPeriod(UUID userId, Long start, Long end) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(transactionRepository.findByUserIdAndDateBetween(userId, start, end));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public List<TransactionDto> findByUserIdAndPeriod(UUID userId,
                                                      Long start,
                                                      Long end,
                                                      UUID accountId,
                                                      TransactionType type) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(
                transactionRepository.findByUserIdAndDateBetweenWithFiltersOrderByDateDesc(userId, start, end, accountId, type));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public Page<TransactionDto> findByUserIdAndPeriod(UUID userId, Long start, Long end, UUID accountId,
                                                      TransactionType type, Pageable pageable) {
        Page<TransactionDto> page = transactionRepository
                .findByUserIdAndDateBetweenWithFilters(userId, start, end, accountId, type, pageable)
                .map(transactionMapper::toDto);
        enrichWithBaseAmounts(userId, page.getContent());
        return page;
    }

    @Override
    public List<TransactionDto> findByUserIdAndCategoryId(UUID userId, UUID categoryId) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(transactionRepository.findByUserIdAndCategoryId(userId, categoryId));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public List<TransactionDto> findByUserIdAndAccountId(UUID userId, UUID accountId) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(transactionRepository.findByUserIdAndAccountId(userId, accountId));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public boolean delete(UUID userId, UUID id) {
        Optional<UserApp> user = userService.findById(userId);
        if (!user.isPresent()) {
            return false;
        }
        Optional<Transaction> existing = transactionRepository.findById(id);
        if (!existing.isPresent() || existing.get().getUser() == null
                || existing.get().getUser().getId() == null
                || !existing.get().getUser().getId().equals(userId)) {
            return false;
        }
        if (existing.get().getType() == TransactionType.TRANSFER) {
            throw new UnsupportedOperationException("Transfer transactions must be managed via TransferService");
        }
        transactionRepository.deleteById(id);
        return true;
    }

    @Override
    public Transaction save(Transaction transaction) {
        if (transaction.getType() == TransactionType.TRANSFER) {
            throw new UnsupportedOperationException("Transfer transactions must be managed via TransferService");
        }
        if (transaction.getAccount() != null) {
            transaction.setCurrency(transaction.getAccount().getCurrency());
        }
        return transactionRepository.save(transaction);
    }

    @Override
    public Optional<TransactionDto> findByUserIdAndId(UUID userId, UUID id) {

        Optional<Transaction> transaction = transactionRepository.findByUserIdAndId(userId, id);
        if (transaction.isPresent()) {
            return Optional.of(transactionMapper.toDto(transaction.get()));
        }
        return Optional.empty();
    }

    @Override
    public BigDecimal calculateTotalByCategoryForPeriod(UUID userId, Category category, Long start, Long end) {
        List<Transaction> transactions = transactionRepository
                .findNonTransferByUserIdAndCategoryAndDateBetweenOrderByDateDesc(userId, category, start, end);
        return transactions.stream()
                .map(transaction -> currencyConversionService.convertToBase(userId,
                        transaction.getCurrency(), transaction.getAmount(), transaction.getDate()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public Map<String, BigDecimal> calculateTotalByCategoryListForPeriod(UUID userId, List<Category> categoryList, Long start, Long end) {
        return transactionRepository.findNonTransferByUserIdAndCategoryInAndDateBetween(userId, categoryList, start, end).stream()
                .collect(Collectors.groupingBy(t -> t.getCategory().getName(),
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                transaction -> currencyConversionService.convertToBase(userId,
                                        transaction.getCurrency(), transaction.getAmount(), transaction.getDate()),
                                BigDecimal::add)));
    }

    @Override
    public List<TransactionDto> findByUserIdAndCategoryIdAndMonth(UUID userId, UUID categoryId, String month) {
        Optional<Category> maybeCategory = categoryService.findById(userId, categoryId);
        if (!maybeCategory.isPresent()) return new ArrayList<>();
        return findByUserIdAndCategoryIdAndPeriod(userId, maybeCategory.get(),
                DateTimeUtils.getStartOfMonth(DateTimeUtils.convertStringToLocalDate(month)),
                DateTimeUtils.getEndOfMonth(DateTimeUtils.convertStringToLocalDate(month)));
    }

    @Override
    public List<TransactionDto> findByUserIdAndCategoryIdAndPeriod(UUID userId, Category category, Long start, Long end) {
        List<TransactionDto> dtos = transactionMapper.toDtoList(
                transactionRepository.findNonTransferByUserIdAndCategoryAndDateBetweenOrderByDateDesc(userId, category,
                        start,
                        end));
        enrichWithBaseAmounts(userId, dtos);
        return dtos;
    }

    @Override
    public Map<Category, BigDecimal> calculateTotalsByCategoryTypeForPeriod(UUID userId, CategoryType type, Long start, Long end) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndDateBetweenExcludingTransfers(userId, start, end);
        return transactions.stream()
                .filter(transaction -> transaction.getCategory() != null)
                .filter(transaction -> transaction.getCategory().getType() == type)
                .collect(Collectors.toMap(Transaction::getCategory,
                        transaction -> currencyConversionService.convertToBase(userId,
                                transaction.getCurrency(), transaction.getAmount(), transaction.getDate()),
                        BigDecimal::add,
                        LinkedHashMap::new));
    }

    private void enrichWithBaseAmounts(UUID userId, List<TransactionDto> dtos) {
        if (dtos == null) {
            return;
        }
        userService.findById(userId).ifPresent(user -> dtos.forEach(dto -> {
            dto.setCurrency(dto.getCurrency() != null ? dto.getCurrency()
                    : dto.getAccount() != null ? dto.getAccount().getCurrency() : user.getBaseCurrency());
            BigDecimal originalAmount = Optional.ofNullable(dto.getAmount()).orElse(BigDecimal.ZERO);
            dto.setAmountInBase(currencyConversionService.convertToBase(user,
                    dto.getCurrency(), originalAmount, TransactionMapper.StringToLong(dto.getDate())));
        }));
    }
}
