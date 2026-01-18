package com.example.personalFinance.service.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.example.personalFinance.model.SubscriptionBillingPeriod;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.SubscriptionPlanRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubscriptionPlanServiceTest {

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @InjectMocks
    private SubscriptionPlanService subscriptionPlanService;

    private SubscriptionPlan usdMonthlyPlan;
    private SubscriptionPlan usdYearlyPlan;
    private SubscriptionPlan uahMonthlyPlan;
    private SubscriptionPlan uahYearlyPlan;

    @BeforeEach
    void setUp() {
        usdMonthlyPlan = buildPlan(SubscriptionType.STANDART_MONTHLY, SubscriptionBillingPeriod.MONTHLY, "USD");
        usdYearlyPlan = buildPlan(SubscriptionType.STANDART_YEARLY, SubscriptionBillingPeriod.YEARLY, "USD");
        uahMonthlyPlan = buildPlan(SubscriptionType.STANDART_MONTHLY_UA, SubscriptionBillingPeriod.MONTHLY, "UAH");
        uahYearlyPlan = buildPlan(SubscriptionType.STANDART_YEARLY_UA, SubscriptionBillingPeriod.YEARLY, "UAH");

        lenient().when(subscriptionPlanRepository.findAllByActiveTrueOrderByPriceAsc())
                .thenReturn(List.of(usdMonthlyPlan, usdYearlyPlan, uahMonthlyPlan, uahYearlyPlan));
    }

    @Test
    void getActivePaidPlansForUserReturnsUaPlansForUkrainianUser() {
        UserApp user = new UserApp();
        user.setCountryCode("UA");

        List<SubscriptionPlan> plans = subscriptionPlanService.getActivePaidPlansForUser(user);

        assertThat(plans).containsExactly(uahMonthlyPlan, uahYearlyPlan);
    }

    @Test
    void getActivePaidPlansForUserReturnsUsdPlansForNonUkrainianUser() {
        UserApp user = new UserApp();
        user.setCountryCode("US");

        List<SubscriptionPlan> plans = subscriptionPlanService.getActivePaidPlansForUser(user);

        assertThat(plans).containsExactly(usdMonthlyPlan, usdYearlyPlan);
    }

    @Test
    void isPlanAvailableForUserMatchesCountrySpecificPlans() {
        UserApp ukrainianUser = new UserApp();
        ukrainianUser.setCountryCode("UA");

        UserApp otherUser = new UserApp();
        otherUser.setCountryCode("PL");

        assertThat(subscriptionPlanService.isPlanAvailableForUser(uahMonthlyPlan, ukrainianUser)).isTrue();
        assertThat(subscriptionPlanService.isPlanAvailableForUser(uahMonthlyPlan, otherUser)).isFalse();
        assertThat(subscriptionPlanService.isPlanAvailableForUser(usdYearlyPlan, otherUser)).isTrue();
    }

    private SubscriptionPlan buildPlan(SubscriptionType type, SubscriptionBillingPeriod period, String currency) {
        return SubscriptionPlan.builder()
                .id(UUID.randomUUID())
                .code(type.name())
                .type(type)
                .billingPeriod(period)
                .price(BigDecimal.ONE)
                .currency(currency)
                .trialAvailable(false)
                .active(true)
                .build();
    }
}
