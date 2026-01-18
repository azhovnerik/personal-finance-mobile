package com.example.personalFinance.service;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.*;
import com.example.personalFinance.repository.OnboardingStateRepository;
import com.example.personalFinance.repository.UserRepository;
import com.example.personalFinance.security.UserDetailServiceImpl;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import static com.example.personalFinance.service.Impl.TestUtilities.STRONG_TEST_PASSWORD;

@IntegrationTest
class OnboardingStateIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserService userService;

    @Autowired
    private UserDetailServiceImpl userDetailService;

    @Autowired
    private OnboardingStateRepository onboardingStateRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void clearDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(
                jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "budget_categories",
                "transfer",
                "transaction",
                "change_balance",
                "account",
                "budget",
                "category",
                "onboarding_state",
                "verification_token",
                "users");
    }

    @Test
    void shouldCreateOnboardingStateDuringRegistration() {
        UserDto userDto = new UserDto();
        userDto.setName("john");
        userDto.setEmail("john@example.com");
        userDto.setPassword(STRONG_TEST_PASSWORD);
        userDto.setMatchingPassword(STRONG_TEST_PASSWORD);

        UserApp user = userService.registerNewUserAccount(userDto);

        var stateOpt = onboardingStateRepository.findByUser(user);
        Assertions.assertTrue(stateOpt.isPresent());
        Assertions.assertFalse(stateOpt.get().isCompleted());
    }

    @Test
    void shouldCreateOnboardingStateOnLoginIfMissing() {
        UserApp user = UserApp.builder()
                .name("mary")
                .email("mary@example.com")
                .password("pass")
                .role(Role.USER)
                .status(Status.ACTIVE)
                .build();
        userRepository.save(user);

        userDetailService.loadUserByUsername("mary@example.com");

        var stateOpt = onboardingStateRepository.findByUser(user);
        Assertions.assertTrue(stateOpt.isPresent());
        Assertions.assertFalse(stateOpt.get().isCompleted());
    }
}

