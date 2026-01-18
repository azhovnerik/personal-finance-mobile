package com.example.personalFinance.mapper;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TransactionMapperTest {



    @Test
    @DisplayName("long date should convert to string format")
    void longToString() {
        Long dateLong = 0L;
        assertEquals("1970-01-01 00:00:00", TransactionMapper.LongToString(dateLong));
    }

    @Test
    void stringToLong() {
        String dateString = "1970-01-01 00:00:00";
        assertEquals(0L, TransactionMapper.StringToLong(dateString));
    }
}
