package com.example.personalFinance.usecase;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.text.Collator;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class GetCategorySelectListForBudgetUseCase {

    @Autowired
    CategoryService categoryService;

    @Autowired
    CategoryMapper categoryMapper;

    private final Collator nameCollator;

    public GetCategorySelectListForBudgetUseCase() {
        Collator collator = Collator.getInstance(Locale.getDefault());
        collator.setStrength(Collator.PRIMARY);
        collator.setDecomposition(Collator.CANONICAL_DECOMPOSITION);
        this.nameCollator = collator;
    }

    public List<CategorySelectGroup> getCategorySelectListForBudgetUseCase(UserDetails userDetails, List<Category> categoryList) {
        return groupSubCategoriesByRootCategories(categoryList);
    }

    public List<CategorySelectGroup> groupSubCategoriesByRootCategories(List<Category> categoryList) {
        List<CategoryDto> categoryDtoList = categoryMapper.toDtoList(categoryList, categoryService);

        Map<UUID, List<CategoryDto>> subcategoriesByParentId = categoryDtoList.stream()
                .filter(categoryDto -> categoryDto.getParentId() != null)
                .collect(Collectors.groupingBy(CategoryDto::getParentId));

        List<CategorySelectGroup> groupedCategories = new ArrayList<>();
        Set<UUID> processedRootIds = new HashSet<>();

        categoryDtoList.stream()
                .filter(categoryDto -> categoryDto.getParentId() == null)
                .forEach(rootCategory -> {
                    List<CategoryDto> nestedCategories = subcategoriesByParentId.getOrDefault(rootCategory.getId(), List.of());

                    if (!nestedCategories.isEmpty()) {
                        groupedCategories.add(new CategorySelectGroup(
                                rootCategory.getName(),
                                nestedCategories.stream()
                                        .sorted(categoryComparator())
                                        .toList()
                        ));
                        processedRootIds.add(rootCategory.getId());
                    } else {
                        groupedCategories.add(new CategorySelectGroup(null, List.of(rootCategory)));
                    }
                });

        Map<String, List<CategoryDto>> orphanedSubcategories = categoryDtoList.stream()
                .filter(categoryDto -> categoryDto.getParentId() != null)
                .filter(categoryDto -> !processedRootIds.contains(categoryDto.getParentId()))
                .collect(Collectors.groupingBy(CategoryDto::getParentName));

        groupedCategories.addAll(orphanedSubcategories.entrySet().stream()
                .map(entry -> new CategorySelectGroup(
                        entry.getKey(),
                        entry.getValue().stream()
                                .sorted(categoryComparator())
                                .toList()
                ))
                .toList());

        return groupedCategories.stream()
                .sorted(groupComparator())
                .toList();
    }

    private Comparator<CategoryDto> categoryComparator() {
        return Comparator.comparing(category -> normalizedName(category.getName()), nameCollator);
    }

    private Comparator<CategorySelectGroup> groupComparator() {
        return Comparator.comparing(group -> normalizedName(group.sortKey()), nameCollator);
    }

    private String normalizedName(String value) {
        return value == null ? "" : value.trim();
    }
}
