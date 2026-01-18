package com.example.personalFinance.service;

import com.example.personalFinance.model.CurrencyCode;
import java.time.LocalDate;
import lombok.EqualsAndHashCode;
import lombok.Getter;

@Getter
@EqualsAndHashCode
public class MissingCurrencyRate {

    private final CurrencyCode currency;
    private final LocalDate rateDate;

    public MissingCurrencyRate(CurrencyCode currency, LocalDate rateDate) {
        this.currency = currency;
        this.rateDate = rateDate;
    }
}
