package com.example.personalFinance.exception;

public class DuplicateCategoryException extends RuntimeException {
    public DuplicateCategoryException(String msg) {
        super(msg);
    }
}
