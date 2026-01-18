package com.example.personalFinance;

import com.example.personalFinance.config.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class PersonalFinanceApplicationTests extends IntegrationTestBase {

    @Test
    void contextLoads() {
    }

}
