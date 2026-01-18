package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.AccountDto;
import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.UserService;
import org.mapstruct.AfterMapping;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;


@Mapper(componentModel = "spring")
public abstract class AccountMapper {

    public abstract AccountDto toDto(Account account,
                                     @Context AccountService accountService,
                                     @Context CurrencyConversionService currencyConversionService,
                                     @Context UserService userService);

    public abstract List<AccountDto> toDtoList(List<Account> accountList,
                                              @Context AccountService accountService,
                                              @Context CurrencyConversionService currencyConversionService,
                                              @Context UserService userService);

    public abstract Account toModel(AccountDto accountDto);

    public abstract List<Account> toModelList(List<AccountDto> accountDtoList);

    @AfterMapping
    protected void setBalanceAfterMapping(@MappingTarget AccountDto accountDto,
                                          @Context AccountService accountService,
                                          @Context CurrencyConversionService currencyConversionService,
                                          @Context UserService userService) {
        LocalDateTime dt = LocalDateTime.now(ZoneId.systemDefault());
        BigDecimal balance = accountService.getAccountBalance(accountDto.getUserId(), accountDto.getId(),
                TransactionMapper.StringToLong(dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))));
        accountDto.setBalance(balance);
        if (accountDto.getCurrency() != null && accountDto.getUserId() != null) {
            userService.findById(accountDto.getUserId()).ifPresent(user -> {
                BigDecimal balanceInBase = currencyConversionService.convertToBase(user,
                        accountDto.getCurrency(), balance, LocalDate.now());
                accountDto.setBalanceInBase(balanceInBase);
            });
        }
    }
}
