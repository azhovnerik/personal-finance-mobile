package com.example.personalFinance.exception;

public class AccountCurrencyChangeNotAllowedException extends RuntimeException {

    public AccountCurrencyChangeNotAllowedException(String message) {
        super(message);
    }
}
