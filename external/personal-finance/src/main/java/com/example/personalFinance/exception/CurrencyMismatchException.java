package com.example.personalFinance.exception;

/**
 * Thrown when a transfer is attempted between accounts that use different currencies.
 */
public class CurrencyMismatchException extends IllegalArgumentException {

    public CurrencyMismatchException(String message) {
        super(message);
    }
}
