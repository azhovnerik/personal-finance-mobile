package com.example.personalFinance.utils;

import org.springframework.format.datetime.DateFormatter;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;


public  class DateTimeUtils {

    public static Long getEndOfMonth(LocalDate date) {
        return date.withDayOfMonth(date.lengthOfMonth()).atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC).getEpochSecond();
    }

    public static Long getStartOfMonth(LocalDate date) {
        return date.withDayOfMonth(1).atStartOfDay(ZoneId.of("UTC")).toInstant().getEpochSecond();
    }

    public static Long getStartOfDay(LocalDate date) {
        return date.atStartOfDay(ZoneId.of("UTC")).toInstant().getEpochSecond();
    }

    public static Long getEndOfDay(LocalDate date) {
        return date.atTime(LocalTime.MAX).atZone(ZoneId.of("UTC")).toInstant().getEpochSecond();
    }

    public static LocalDate convertStringToLocalDate(String str) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        return LocalDate.parse("01-" + str , formatter);
    }

    public static String convertLocalDateToString(LocalDate date) {
        DateTimeFormatter formatters = DateTimeFormatter.ofPattern("MM-yyyy");
        String dateText = date.format(formatters);
        return dateText;
    }

    public static LocalDate convertToLocalDate(String month) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-yyyy");
        YearMonth ym = YearMonth.parse(month, formatter);
        LocalDate date = ym.atDay(1);
        return date;
    }
}
