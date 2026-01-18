package com.example.personalFinance.config;

@org.springframework.boot.test.context.SpringBootTest
@org.springframework.test.context.ActiveProfiles("test")
public abstract class IntegrationTestBase {
  @org.springframework.boot.test.mock.mockito.MockBean
  private org.springframework.mail.javamail.JavaMailSender mailSender;
}
