package com.example.personalFinance.service;

import com.example.personalFinance.model.CurrencyCode;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class CurrencyConversionWarningContext {

    private final ThreadLocal<LinkedHashSet<MissingCurrencyRate>> warnings =
            ThreadLocal.withInitial(LinkedHashSet::new);

    public void addMissingRate(CurrencyCode currency, LocalDate rateDate) {
        if (currency == null || rateDate == null) {
            return;
        }
        warnings.get().add(new MissingCurrencyRate(currency, rateDate));
    }

    public Set<MissingCurrencyRate> consumeWarnings() {
        LinkedHashSet<MissingCurrencyRate> current = warnings.get();
        warnings.remove();
        return Set.copyOf(current);
    }

    public void clear() {
        warnings.remove();
    }
}
