package com.example.personalFinance.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class ValidPasswordValidator implements ConstraintValidator<ValidPassword, String> {

    private static final int MIN_LENGTH = 8;
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern DIGIT_PATTERN = Pattern.compile(".*\\d.*");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        String password = value.trim();
        if (password.length() < MIN_LENGTH) {
            return false;
        }
        if (!UPPERCASE_PATTERN.matcher(password).matches()) {
            return false;
        }
        if (!LOWERCASE_PATTERN.matcher(password).matches()) {
            return false;
        }
        if (!DIGIT_PATTERN.matcher(password).matches()) {
            return false;
        }
        return true;
    }
}
