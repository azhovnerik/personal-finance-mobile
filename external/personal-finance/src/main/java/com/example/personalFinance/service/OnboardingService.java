package com.example.personalFinance.service;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.OnboardingState;
import com.example.personalFinance.repository.AccountRepository;
import com.example.personalFinance.repository.CategoryRepository;
import com.example.personalFinance.repository.OnboardingStateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class OnboardingService {
    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private OnboardingStateRepository onboardingStateRepository;
    @Autowired
    private UserService userService;

    public void saveCategories(UUID userId, List<Category> categories) {
        if (categories == null) {
            return;
        }
        for (Category category : categories) {
            boolean exists = categoryRepository
                    .findByUserIdAndTypeOrderByName(userId, category.getType()).stream()
                    .anyMatch(c -> c.getName().equalsIgnoreCase(category.getName()));
            if (!exists) {
                category.setUserId(userId);
                categoryRepository.save(category);
            }
        }
    }

    public void saveAccounts(UUID userId, List<Account> accounts) {
        if (accounts == null) {
            return;
        }
        List<Account> existing = accountRepository.findAccountsByUserId(userId);
        for (Account account : accounts) {
            boolean exists = existing.stream()
                    .anyMatch(a -> a.getName().equalsIgnoreCase(account.getName()));
            if (!exists) {
                account.setUserId(userId);
                accountRepository.save(account);
            }
        }
    }

    public void markCompleted(UUID userId) {
        userService.findById(userId).ifPresent(user -> {
            OnboardingState state = onboardingStateRepository.findByUser(user)
                    .orElseGet(() -> OnboardingState.builder()
                            .user(user)
                            .build());
            state.setCompleted(true);
            onboardingStateRepository.save(state);
        });
    }

    public boolean isCompleted(UUID userId) {
        List<OnboardingState> states = onboardingStateRepository.findAllByUserId(userId);
        if (states.size() > 1) {
            onboardingStateRepository.deleteAll(states.subList(1, states.size()));
        }
        return states.stream().findFirst().map(OnboardingState::isCompleted).orElse(false);
    }
}
