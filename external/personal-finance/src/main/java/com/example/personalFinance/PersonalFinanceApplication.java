package com.example.personalFinance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class PersonalFinanceApplication extends SpringBootServletInitializer {
	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		return application.sources(PersonalFinanceApplication.class);
	}
	public static void main(String[] args) {
		SpringApplication.run(PersonalFinanceApplication.class, args);
	}



}
