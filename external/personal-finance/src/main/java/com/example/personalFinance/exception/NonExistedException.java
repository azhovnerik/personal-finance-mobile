package com.example.personalFinance.exception;

public class NonExistedException extends RuntimeException {
    public NonExistedException(String msg) {
        super(msg);
    }
}
