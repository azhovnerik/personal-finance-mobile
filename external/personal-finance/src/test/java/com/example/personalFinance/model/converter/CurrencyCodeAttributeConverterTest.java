package com.example.personalFinance.model.converter;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.personalFinance.model.CurrencyCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CurrencyCodeAttributeConverterTest {

    private CurrencyCodeAttributeConverter converter;

    @BeforeEach
    void setUp() {
        converter = new CurrencyCodeAttributeConverter();
    }

    @Test
    void shouldConvertEnumToDatabaseValue() {
        assertThat(converter.convertToDatabaseColumn(CurrencyCode.EUR)).isEqualTo("EUR");
    }

    @Test
    void shouldReturnNullForNullEnum() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    void shouldConvertDatabaseValueToEnumIgnoringCase() {
        assertThat(converter.convertToEntityAttribute("usd")).isEqualTo(CurrencyCode.USD);
    }

    @Test
    void shouldReturnNullForNullDatabaseValue() {
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void shouldReturnNullForBlankDatabaseValue() {
        assertThat(converter.convertToEntityAttribute("   ")).isNull();
    }

    @Test
    void shouldReturnNullForUnknownValue() {
        assertThat(converter.convertToEntityAttribute("XYZ")).isNull();
    }
}
