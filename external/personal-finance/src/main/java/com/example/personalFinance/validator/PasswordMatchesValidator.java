package com.example.personalFinance.validator;

import com.example.personalFinance.dto.UserDto;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;


public class PasswordMatchesValidator implements ConstraintValidator<PasswordMatches, UserDto> {
    @Override
    public void initialize(PasswordMatches constraintAnnotation) {

    }

    @Override
    public boolean isValid(UserDto user, ConstraintValidatorContext context) {
        return user.getPassword().equals(user.getMatchingPassword());
    }
}
