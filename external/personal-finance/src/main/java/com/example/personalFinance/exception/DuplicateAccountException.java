package com.example.personalFinance.exception;

public class DuplicateAccountException extends RuntimeException {
    public DuplicateAccountException(String msg) {
        super(msg);
    }
}
