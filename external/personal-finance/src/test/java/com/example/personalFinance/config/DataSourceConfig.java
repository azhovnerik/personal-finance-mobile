//package com.example.personalFinance.config;
//
//import com.zaxxer.hikari.HikariConfig;
//import com.zaxxer.hikari.HikariDataSource;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.testcontainers.containers.PostgreSQLContainer;
//
//import javax.sql.DataSource;
//
//@Configuration
//public class DataSourceConfig {
//
//    private final static PostgreSQLContainer<?> postgreSqlContainer;
//
//    static {
//        postgreSqlContainer = new PostgreSQLContainer<>("postgres:13-alpine")
//                .withDatabaseName("testdb")
//                .withUsername("test")
//                .withPassword("test");
//        postgreSqlContainer.start();
//    }
//
//    @Bean
//    public PostgreSQLContainer<?> postgreSQLContainer() {
//        return postgreSqlContainer;
//    }
//
//    @Bean
//    public DataSource dataSourceConfig(PostgreSQLContainer<?> container) {
//        HikariConfig config = new HikariConfig();
//        config.setDriverClassName(container.getDriverClassName());
//        config.setJdbcUrl(container.getJdbcUrl());
//        config.setUsername(container.getUsername());
//        config.setPassword(container.getPassword());
//        return new HikariDataSource(config);
//    }
//}
