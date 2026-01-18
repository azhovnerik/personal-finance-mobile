package com.example.personalFinance.service.Impl;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.UserService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import java.util.Optional;
import java.util.UUID;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;

@IntegrationTest
class CategoryServiceImplTest extends IntegrationTestBase {

    @Autowired
    private CategoryService categoryService;
    @Autowired
    private UserService userService;

    @Test
    @DisplayName("Test context up")
    public void testContext() {
        assert true;
    }

    @BeforeEach
    void clearDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "budget_categories",
                "category",
                "budget",
                "onboarding_state",
                "users");
    }

    @Test
    void save() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);
        Category categoryResult = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);

        Assertions.assertNotNull(categoryResult);
        Assertions.assertEquals("Salary", categoryResult.getName());
        Assertions.assertEquals(userApp.getId(), categoryResult.getUserId());
        Assertions.assertEquals("Salary", categoryResult.getDescription());
        Assertions.assertEquals(null, categoryResult.getParentId());
    }


    @Test
    void getRootCategoriesByUserIdAndType() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);

        Category categoryResult = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);

        Category categoryResult1 = TestUtilities.createCategory(categoryService, userApp, "Fix", CategoryType.INCOME, "Fix", categoryResult.getId(), false);
        ;

        categoryResult = TestUtilities.createCategory(categoryService, userApp, "Royalty", CategoryType.INCOME, "Royalty", null, false);

        categoryResult = TestUtilities.createCategory(categoryService, userApp, "Food", CategoryType.EXPENSES, "Food", null, false);

        Assertions.assertEquals(2, categoryService.getRootCategoriesByUserIdAndType(userApp.getId(), CategoryType.INCOME).size());
        Assertions.assertEquals(0, categoryService.getRootCategoriesByUserIdAndType(UUID.randomUUID(), CategoryType.INCOME).size());
        Assertions.assertEquals(1, categoryService.getRootCategoriesByUserIdAndType(userApp.getId(), CategoryType.EXPENSES).size());
    }

    @Test
    void deleteBudget() {

        UserApp userApp = TestUtilities.createUser(userService, "a@a.com", "aa", STRONG_TEST_PASSWORD);

        Category categoryResult = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);
        UUID id = categoryResult.getId();

        boolean operationResult = categoryService.deleteCategory(userApp.getId(), categoryResult.getId());

        Assertions.assertTrue(operationResult);
        Assertions.assertEquals(Optional.empty(), categoryService.findById(userApp.getId(), id));

        categoryResult = TestUtilities.createCategory(categoryService, userApp, "Salary", CategoryType.INCOME, "Salary", null, false);
        id = categoryResult.getId();

        Category categoryResult1 = TestUtilities.createCategory(categoryService, userApp, "Fix", CategoryType.INCOME, "Fix", categoryResult.getId(), false);

        operationResult = categoryService.deleteCategory(userApp.getId(), categoryResult.getId());

        Assertions.assertFalse(operationResult);
        Assertions.assertEquals(Optional.of(categoryResult), categoryService.findById(userApp.getId(), id));

    }
}
