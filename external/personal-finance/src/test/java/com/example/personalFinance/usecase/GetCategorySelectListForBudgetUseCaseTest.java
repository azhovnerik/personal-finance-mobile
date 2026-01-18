package com.example.personalFinance.usecase;

import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.repository.CategoryRepository;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.usecase.CategorySelectGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.runner.RunWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.MockReset;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
@RunWith(SpringRunner.class)
@SpringBootTest
class GetCategorySelectListForBudgetUseCaseTest extends IntegrationTestBase {

    @MockBean(reset = MockReset.NONE)
    CategoryService categoryService;

    @MockBean(reset = MockReset.NONE)
    CategoryRepository categoryRepository;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;


    @Test
    void groupsCategoriesWithAlphabeticalOrderAcrossRootsAndSingles() {
        UUID uuidCategory1 = UUID.randomUUID();
        UUID uuidCategory2 = UUID.randomUUID();
        UUID uuidCategory3 = UUID.randomUUID();
        UUID uuidCategory4 = UUID.randomUUID();
        UUID uuidCategory5 = UUID.randomUUID();
        UUID uuidCategory6 = UUID.randomUUID();

        UUID uuidUserId1 = UUID.randomUUID();


        Category category1 = new Category(uuidCategory1, null, "Medicines", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        Category category2 = new Category(uuidCategory2, null, "Emergency", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        Category category3 = new Category(uuidCategory3, null, "Food", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        Category category4 = new Category(uuidCategory4, null, "Auto", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        Category category5 = new Category(uuidCategory5, uuidCategory4, "Fuel", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        Category category6 = new Category(uuidCategory6, uuidCategory4, "Cleaning auto", "", uuidUserId1, CategoryType.EXPENSES, false, null, null);
        List<Category> categoryList = List.of(category1, category2, category3, category4, category5, category6);

        List<CategorySelectGroup> expected = List.of(
                new CategorySelectGroup("Auto", categoryMapper.toDtoList(List.of(category6, category5), categoryService)),
                new CategorySelectGroup(null, List.of(categoryMapper.toDto(category2, categoryService))),
                new CategorySelectGroup(null, List.of(categoryMapper.toDto(category3, categoryService))),
                new CategorySelectGroup(null, List.of(categoryMapper.toDto(category1, categoryService)))
        );

        assertEquals(expected, getCategorySelectListForBudgetUseCase.groupSubCategoriesByRootCategories(categoryList));

    }
}
