package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.model.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;


@Mapper(componentModel = "spring", uses = TransferMapper.class)
public abstract class TransactionMapper {
    @Mapping(source = "date", target = "date", qualifiedBy = LongToString.class)
    public abstract TransactionDto toDto(Transaction transaction);

    public abstract List<TransactionDto> toDtoList(List<Transaction> transactionList);

    @Mapping(source = "date", target = "date", qualifiedBy = StringToLong.class)
    public abstract Transaction toModel(TransactionDto transactionDto);

    public abstract List<Transaction> toModelList(List<TransactionDto> transactionDtoList);

    @LongToString
    public static String LongToString(Long dateSec) {
        Instant instant = Instant.ofEpochSecond(dateSec);
        ZonedDateTime zdt = instant.atZone(ZoneId.of("UTC"));
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return zdt.format(formatter);
    }

    @StringToLong
    public static Long StringToLong(String dateString) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime dt = LocalDateTime.parse(dateString, formatter);
        Instant instant = dt.toInstant(ZoneOffset.UTC);
        return instant.getEpochSecond();
    }
}
