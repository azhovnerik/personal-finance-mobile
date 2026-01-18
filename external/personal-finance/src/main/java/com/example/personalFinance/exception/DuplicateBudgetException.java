package com.example.personalFinance.exception;

public class DuplicateBudgetException extends RuntimeException {
    public DuplicateBudgetException(String msg) {
        super(msg);
    }
}
