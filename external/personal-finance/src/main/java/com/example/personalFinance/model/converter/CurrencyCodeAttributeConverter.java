package com.example.personalFinance.model.converter;

import com.example.personalFinance.model.CurrencyCode;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Converter(autoApply = false)
public class CurrencyCodeAttributeConverter implements AttributeConverter<CurrencyCode, String> {

    private static final Logger log = LoggerFactory.getLogger(CurrencyCodeAttributeConverter.class);

    @Override
    public String convertToDatabaseColumn(CurrencyCode attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public CurrencyCode convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        String trimmed = dbData.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            return CurrencyCode.valueOf(trimmed.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            log.warn("Unknown currency code '{}' encountered while reading from the database; treating it as null.", trimmed);
            return null;
        }
    }
}
