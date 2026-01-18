package com.example.personalFinance.service;

import com.example.personalFinance.onboarding.CategoryTemplate;
import com.example.personalFinance.onboarding.repository.CategoryTemplateRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class IconService {
    private final CategoryTemplateRepository categoryTemplateRepository;

    private static final List<String> DEFAULT_ICONS = List.of(
            "bi-cash-stack",
            "bi-trophy",
            "bi-laptop",
            "bi-piggy-bank",
            "bi-cash-coin",
            "bi-house",
            "bi-arrow-repeat",
            "bi-gift",
            "bi-wallet",
            "bi-basket",
            "bi-cup-straw",
            "bi-bus-front",
            "bi-building",
            "bi-plug",
            "bi-phone",
            "bi-heart-pulse",
            "bi-shirt",
            "bi-controller",
            "bi-credit-card",
            "bi-airplane",
            "bi-balloon",
            "bi-fuel-pump",
            "bi-shield-check",
            "bi-wrench",
            "bi-tools",
            "bi-gift-fill",
            "bi-bicycle",
            "bi-bank",
            "bi-heart",
            "bi-graph-up",
            "bi-three-dots",
            "bi-music-note-beamed",
            "bi-brightness-high",
            "bi-moon-stars",
            "bi-brush",
            "bi-bag-heart",
            "bi-lightning-charge",
            "bi-tree",
            "bi-droplet-half",
            "bi-cup-hot",
            "bi-flower3",
            "bi-backpack",
            "bi-palette",
            "bi-shop",
            "bi-calendar-heart",
            "bi-umbrella",
            "bi-mortarboard",
            "bi-airplane-engines",
            "bi-scooter",
            "bi-stars"
    );

    public IconService(CategoryTemplateRepository categoryTemplateRepository) {
        this.categoryTemplateRepository = categoryTemplateRepository;
    }

    public List<String> getAvailableIcons() {
        List<String> icons = categoryTemplateRepository.findAll().stream()
                .map(CategoryTemplate::getIcon)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
        if (icons.isEmpty()) {
            icons = DEFAULT_ICONS;
        }
        return icons;
    }
}
