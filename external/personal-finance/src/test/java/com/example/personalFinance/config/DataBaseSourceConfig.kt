package com.example.personalFinance.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.testcontainers.containers.PostgreSQLContainer
import javax.sql.DataSource

@Configuration
open class DataBaseSourceConfig {
    companion object {
        @JvmStatic
        private val postgreSqlContainer = PostgreSQLContainer("postgres:13-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .apply { start() }
    }

    @Bean
    open fun postgreSqlContainer(): PostgreSQLContainer<*> {
        return postgreSqlContainer
    }

    @Bean
    open fun dataSourceCofig(postgreSqlContainer: PostgreSQLContainer<*>): DataSource {
        val config = HikariConfig().apply {
            driverClassName = postgreSqlContainer.driverClassName
            jdbcUrl = postgreSqlContainer.jdbcUrl
            username = postgreSqlContainer.username
            password = postgreSqlContainer.password
        }
        return HikariDataSource(config)
    }
}
