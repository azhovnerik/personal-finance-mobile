package com.example.personalFinance.security;

public interface SecurityService {
    boolean isAuthenticated();

    String getCurrentUser();
}

