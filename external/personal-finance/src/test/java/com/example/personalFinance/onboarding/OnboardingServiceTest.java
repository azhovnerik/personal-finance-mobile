package com.example.personalFinance.onboarding;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.example.personalFinance.onboarding.dto.AccountInputDTO;
import com.example.personalFinance.onboarding.dto.CustomCategoryDTO;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CurrencyCode;

public class OnboardingServiceTest {

    private OnboardingService service;
    private UUID userId;

    @BeforeEach
    void setup() {
        service = new OnboardingService();
        userId = UUID.randomUUID();
    }

    @Test
    void createCategoriesIdempotentAndParentNull() {
        List<CustomCategoryDTO> categories = List.of(
                new CustomCategoryDTO("Salary", "Monthly salary", "INCOME"),
                new CustomCategoryDTO("Rent", "Home rent", "EXPENSE"));

        assertEquals(2, service.createCategories(userId, categories, null));
        assertEquals(0, service.createCategories(userId, categories, null));

        List<Category> stored = service.getCategories(userId);
        assertEquals(2, stored.size());
        assertTrue(stored.stream().allMatch(c -> c.getParentId() == null));
    }

    @Test
    void createAccountsIdempotent() {
        List<AccountInputDTO> accounts = List.of(
                new AccountInputDTO("Cash", "CASH", null, CurrencyCode.USD, BigDecimal.TEN),
                new AccountInputDTO("Debit card", "DEBIT_CARD", null, CurrencyCode.USD, BigDecimal.ZERO));
        assertEquals(2, service.createAccounts(userId, accounts));
        assertEquals(0, service.createAccounts(userId, accounts));
        assertEquals(2, service.getAccounts(userId).size());
    }

    @Test
    void completionState() {
        assertFalse(service.isCompleted(userId));
        service.markCompleted(userId);
        assertTrue(service.isCompleted(userId));
    }
}
