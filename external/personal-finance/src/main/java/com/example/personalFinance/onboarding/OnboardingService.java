package com.example.personalFinance.onboarding;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.onboarding.dto.AccountInputDTO;
import com.example.personalFinance.onboarding.dto.CustomCategoryDTO;

/**
 * Simplified in-memory implementation of onboarding logic. In real
 * application this would interact with the database via repositories.
 */
public class OnboardingService {

    private final Map<UUID, List<Category>> categories = new ConcurrentHashMap<>();
    private final Map<UUID, List<Account>> accounts = new ConcurrentHashMap<>();
    private final Set<UUID> completed = Collections.newSetFromMap(new ConcurrentHashMap<>());

    /**
     * Create categories for user ensuring idempotence by (userId, type, lower(name)).
     * Returns number of newly created categories.
     */
    public synchronized int createCategories(UUID userId, List<CustomCategoryDTO> selections, List<CustomCategoryDTO> custom) {
        List<CustomCategoryDTO> all = new ArrayList<>();
        if (selections != null) all.addAll(selections);
        if (custom != null) all.addAll(custom);
        List<Category> userCategories = categories.computeIfAbsent(userId, k -> new ArrayList<>());

        int before = userCategories.size();
        for (CustomCategoryDTO dto : all) {
            CategoryType type = mapCategoryType(dto.getType());
            boolean exists = userCategories.stream()
                    .anyMatch(c -> c.getType() == type && c.getName().equalsIgnoreCase(dto.getName()));
            if (!exists) {
                Category c = Category.builder()
                        .id(UUID.randomUUID())
                        .name(dto.getName())
                        .description(dto.getDescription())
                        .type(type)
                        .userId(userId)
                        .parentId(null)
                        .disabled(false)
                        .build();
                userCategories.add(c);
            }
        }
        return userCategories.size() - before;
    }

    /**
     * Create accounts for user ensuring idempotence by (userId, lower(name)).
     * Returns number of newly created accounts.
     */
    public synchronized int createAccounts(UUID userId, List<AccountInputDTO> inputs) {
        if (inputs == null) return 0;
        List<Account> userAccounts = accounts.computeIfAbsent(userId, k -> new ArrayList<>());
        int before = userAccounts.size();
        for (AccountInputDTO dto : inputs) {
            boolean exists = userAccounts.stream()
                    .anyMatch(a -> a.getName().equalsIgnoreCase(dto.getName()));
            if (!exists) {
                AccountType type = mapAccountType(dto.getType());
                Account a = Account.builder()
                        .id(UUID.randomUUID())
                        .name(dto.getName())
                        .description(dto.getDescription())
                        .type(type)
                        .userId(userId)
                        .build();
                userAccounts.add(a);
            }
        }
        return userAccounts.size() - before;
    }

    private CategoryType mapCategoryType(String type) {
        if (type == null) return CategoryType.EXPENSES;
        if (type.equalsIgnoreCase("EXPENSE")) {
            return CategoryType.EXPENSES;
        }
        return CategoryType.valueOf(type.toUpperCase());
    }

    private AccountType mapAccountType(String type) {
        if (type == null) return AccountType.CASH;
        return switch (type.toUpperCase()) {
            case "CASH" -> AccountType.CASH;
            case "DEBIT_CARD", "CREDIT_CARD", "CARD" -> AccountType.CARD;
            case "BANK", "BANK_ACCOUNT" -> AccountType.BANK_ACCOUNT;
            default -> AccountType.DEBT;
        };
    }

    public void markCompleted(UUID userId) {
        completed.add(userId);
    }

    public boolean isCompleted(UUID userId) {
        return completed.contains(userId);
    }

    // Helper methods for tests
    public List<Category> getCategories(UUID userId) {
        return categories.getOrDefault(userId, Collections.emptyList());
    }

    public List<Account> getAccounts(UUID userId) {
        return accounts.getOrDefault(userId, Collections.emptyList());
    }
}
