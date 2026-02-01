package com.example.personalFinance.web.rest;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.mapper.TransactionMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.web.rest.dto.TransactionRequestDto;
import com.example.personalFinance.web.rest.dto.TransactionResponseDto;
import com.example.personalFinance.security.auth.JwtUtil;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.web.rest.dto.ErrorResponse;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@CrossOrigin("http://localhost:3000")
@RestController
@RequestMapping("/api/v2/transactions")
public class TransactionControllerRest {
    @Autowired
    TransactionService transactionService;

    @Autowired
    UserService userService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    AccountService accountService;

    @Autowired
    TransactionMapper transactionMapper;

    @Autowired
    private JwtUtil jwtUtil;


    @GetMapping
    public ResponseEntity getTransactions(HttpServletRequest request) throws Exception {
        Claims claims = jwtUtil.resolveClaims(request); // см. ниже
        if (claims == null || !jwtUtil.validateClaims(claims)) {
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Invalid validation token", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        String email = claims.getSubject();
        if (email == null) {
            throw new Exception("User email is missing");
        }
        return userService.findByEmail(email).map(maybeUser ->
                        {
                            List<TransactionDto> transactions = transactionService.findByUserId(maybeUser.getId());
                            List<TransactionResponseDto> response = transactions.stream()
                                    .map(this::toTransactionResponseDto)
                                    .collect(Collectors.toList());
                            return ResponseEntity.ok(response);
                        }
                )
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity updateTransaction(
            @PathVariable("id") UUID id,
            @org.springframework.web.bind.annotation.RequestBody TransactionRequestDto payload,
            HttpServletRequest request) throws Exception {
        Claims claims = jwtUtil.resolveClaims(request);
        if (claims == null || !jwtUtil.validateClaims(claims)) {
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Invalid validation token", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        String email = claims.getSubject();
        if (email == null) {
            throw new Exception("User email is missing");
        }

        if (payload == null || payload.getDate() == null || payload.getAmount() == null) {
            ErrorResponse errorResponse = new ErrorResponse("BAD_REQUEST", "Invalid transaction payload", null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }

        return userService.findByEmail(email)
                .map(user -> {
                    Optional<TransactionDto> maybeTransaction = transactionService.findByUserIdAndId(user.getId(), id);
                    if (!maybeTransaction.isPresent()) {
                        ErrorResponse errorResponse = new ErrorResponse("NOT_FOUND", "Transaction not found", null);
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                    }

                    TransactionDto updated = maybeTransaction.get();
                    updated.setUser(user);
                    updated.setDate(payload.getDate());
                    updated.setAmount(payload.getAmount());
                    updated.setAmountInBase(payload.getAmountInBase());
                    updated.setCurrency(payload.getCurrency());
                    updated.setComment(payload.getComment());
                    updated.setChangeBalanceId(payload.getChangeBalanceId());
                    updated.setTransfer(payload.getTransfer());

                    if (payload.getCategoryId() != null) {
                        categoryService.findById(user.getId(), payload.getCategoryId())
                                .ifPresent(category -> {
                                    updated.setCategory(category);
                                    applyTypeAndDirectionFromCategory(updated, category);
                                });
                    }

                    if (payload.getAccountId() != null) {
                        accountService.findByUserIdAndId(user.getId(), payload.getAccountId())
                                .ifPresent(updated::setAccount);
                    }

                    if (payload.getCategoryId() == null) {
                        updated.setType(payload.getType());
                        updated.setDirection(payload.getDirection());
                    }

                    transactionService.save(transactionMapper.toModel(updated));
                    return ResponseEntity.ok(updated);
                })
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    private void applyTypeAndDirectionFromCategory(TransactionDto transactionDto, Category category) {
        if (CategoryType.INCOME.equals(category.getType())) {
            transactionDto.setType(TransactionType.INCOME);
            transactionDto.setDirection(TransactionDirection.INCREASE);
        } else {
            transactionDto.setType(TransactionType.EXPENSE);
            transactionDto.setDirection(TransactionDirection.DECREASE);
        }
    }

    private TransactionResponseDto toTransactionResponseDto(TransactionDto transaction) {
        return TransactionResponseDto.builder()
                .id(transaction.getId() != null ? transaction.getId().toString() : null)
                .userId(transaction.getUser() != null ? transaction.getUser().getId().toString() : null)
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency() != null ? transaction.getCurrency().toString() : null)
                .category(transaction.getCategory() != null ? transaction.getCategory().getName() : null)
                .description(transaction.getComment())
                .occurredAt(transaction.getDate())
                .build();
    }
}
