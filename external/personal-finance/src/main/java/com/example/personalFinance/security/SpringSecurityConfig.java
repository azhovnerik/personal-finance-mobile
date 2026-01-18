package com.example.personalFinance.security;

import com.example.personalFinance.security.filter.JwtAuthorizationFilter;
import com.example.personalFinance.security.oauth.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import org.springframework.http.HttpStatus;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SpringSecurityConfig {

    private final UserDetailsService userDetailsService;

    private final JwtAuthorizationFilter jwtAuthorizationFilter;

    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomAuthenticationFailureHandler authenticationFailureHandler;
    private final BaseCurrencyAuthenticationSuccessHandler baseCurrencyAuthenticationSuccessHandler;

    @Bean
    public PasswordEncoder getPassWordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }


    @Bean
    SecurityFilterChain web(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.ignoringRequestMatchers(
                        new AntPathRequestMatcher("/api/**"),
                        new AntPathRequestMatcher("/subscriptions/liqpay/callback")
                ))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))// ← ВКЛЮЧЕНО
                .addFilterBefore(jwtAuthorizationFilter, UsernamePasswordAuthenticationFilter.class)
                .securityMatcher("/**")
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/login",
                                "/css/**", "/js/**", "/images/**", "/webjars/**", "/assets/**",
                                "/favicon.ico", "/robots.txt", "/manifest.webmanifest",
                                "/api/v1/user/registration", "/api/v1/register", "/api/v1/user/verify",
                                "/api/v1/user/resend-verification", "/api/v2/user/auth/login", "/api/v2/user/signup",
                                "/api/v2/user/me",
                                "/api/v2/user/verify", "/api/v2/user/resend-verification", "/oauth2/**",
                                "/settings/email/confirm", "/settings/password/setup", "/settings/password/setup/**",
                                "/api/landing-clicks",
                                "/auth/forgot-password", "/password/reset", "/password/reset/**",
                                "/support",
                                "/subscriptions/liqpay/callback")
                        .permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                new AntPathRequestMatcher("/api/**"))
                )
                .formLogin(login -> login
                        .loginPage("/login")
                        .loginProcessingUrl("/auth/login-form")    // POST /login обрабатывается тут
                        .successHandler(baseCurrencyAuthenticationSuccessHandler)
                        .failureHandler(authenticationFailureHandler)
                        .permitAll()
                )
                .oauth2Login(oauth -> oauth
                        .loginPage("/login")
                        .successHandler(baseCurrencyAuthenticationSuccessHandler)
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                )
                .logout(Customizer.withDefaults())
//                .csrf(Customizer.withDefaults())    // CSRF включен для MVC
                .sessionManagement(sm -> sm
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(-1)
                        .sessionRegistry(sessionRegistry()));
        return http.build();
    }


    @Bean
    protected DaoAuthenticationProvider authProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(getPassWordEncoder());
        return authProvider;
    }

    @Bean
    public ProviderManager authManagerBean(HttpSecurity security) throws Exception {
        return (ProviderManager) security.getSharedObject(AuthenticationManagerBuilder.class)
                .authenticationProvider(authProvider()).
                build();
    }


    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOrigins(List.of("http://localhost:3000"));
        corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        corsConfiguration.setExposedHeaders(List.of("Authorization"));

        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type"));
        corsConfiguration.setExposedHeaders(List.of("Authorization"));
        corsConfiguration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }



    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
}
