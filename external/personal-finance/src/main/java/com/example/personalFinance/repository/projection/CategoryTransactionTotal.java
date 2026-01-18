package com.example.personalFinance.repository.projection;

import com.example.personalFinance.model.Category;

import java.math.BigDecimal;

public interface CategoryTransactionTotal {

    Category getCategory();

    BigDecimal getTotalAmount();
}
