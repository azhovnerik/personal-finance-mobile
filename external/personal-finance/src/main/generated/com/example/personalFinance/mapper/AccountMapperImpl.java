package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.AccountDto;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CurrencyConversionService;
import com.example.personalFinance.service.UserService;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-06T17:15:13+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.13 (Amazon.com Inc.)"
)
@Component
public class AccountMapperImpl extends AccountMapper {

    @Override
    public AccountDto toDto(Account account, AccountService accountService, CurrencyConversionService currencyConversionService, UserService userService) {
        if ( account == null ) {
            return null;
        }

        AccountDto accountDto = new AccountDto();

        accountDto.setId( account.getId() );
        accountDto.setUserId( account.getUserId() );
        accountDto.setName( account.getName() );
        accountDto.setDescription( account.getDescription() );
        accountDto.setType( account.getType() );
        accountDto.setCurrency( account.getCurrency() );

        setBalanceAfterMapping( accountDto, accountService, currencyConversionService, userService );

        return accountDto;
    }

    @Override
    public List<AccountDto> toDtoList(List<Account> accountList, AccountService accountService, CurrencyConversionService currencyConversionService, UserService userService) {
        if ( accountList == null ) {
            return null;
        }

        List<AccountDto> list = new ArrayList<AccountDto>( accountList.size() );
        for ( Account account : accountList ) {
            list.add( toDto( account, accountService, currencyConversionService, userService ) );
        }

        return list;
    }

    @Override
    public Account toModel(AccountDto accountDto) {
        if ( accountDto == null ) {
            return null;
        }

        Account.AccountBuilder account = Account.builder();

        account.id( accountDto.getId() );
        account.name( accountDto.getName() );
        account.description( accountDto.getDescription() );
        account.userId( accountDto.getUserId() );
        account.type( accountDto.getType() );
        account.currency( accountDto.getCurrency() );

        return account.build();
    }

    @Override
    public List<Account> toModelList(List<AccountDto> accountDtoList) {
        if ( accountDtoList == null ) {
            return null;
        }

        List<Account> list = new ArrayList<Account>( accountDtoList.size() );
        for ( AccountDto accountDto : accountDtoList ) {
            list.add( toModel( accountDto ) );
        }

        return list;
    }
}
