package com.example.personalFinance.validator;


import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class EnumNamePatternValidator implements ConstraintValidator<EnumNamePattern, Enum<?>> {

    @Override
    public void initialize(EnumNamePattern annotation) {
    }

    @Override
    public boolean isValid(Enum<?> value, ConstraintValidatorContext context) {
        return  value != null;

    }
}
