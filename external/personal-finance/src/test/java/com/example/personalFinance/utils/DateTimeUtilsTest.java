package com.example.personalFinance.utils;

import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;


@org.junit.jupiter.api.extension.ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class DateTimeUtilsTest {

    @Test
    void shouldReturnStartOfMonthInEpochSecondForAnyDateWithinMonth() throws NoSuchMethodException {
        MockitoAnnotations.initMocks(this);

        Long startMonth = DateTimeUtils.getStartOfMonth(LocalDate.of(2023, 7, 15));
        assertEquals(1688169600L, startMonth);
    }

    @Test
    void shouldReturnEndOfMonthInEpochSecondForAnyDateWithinMonth() throws NoSuchMethodException {
        MockitoAnnotations.initMocks(this);

        Long startMonth = DateTimeUtils.getEndOfMonth(LocalDate.of(2023, 7, 15));
        assertEquals(1690847999L, startMonth);
    }

    @Test
    void shouldReturnFirstDayOfMonthLocalDate() throws NoSuchMethodException {
        MockitoAnnotations.initMocks(this);

        LocalDate startMonth = DateTimeUtils.convertStringToLocalDate("07-2023");
        assertEquals(LocalDate.of(2023, 7, 1), startMonth);
    }
}
