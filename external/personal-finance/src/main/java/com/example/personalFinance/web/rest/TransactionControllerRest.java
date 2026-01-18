package com.example.personalFinance.web.rest;

import com.example.personalFinance.dto.TransactionDto;
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
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
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
