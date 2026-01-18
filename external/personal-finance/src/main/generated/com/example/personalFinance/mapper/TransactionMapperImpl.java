package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.TransactionDto;
import com.example.personalFinance.model.Transaction;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-06T17:15:13+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.13 (Amazon.com Inc.)"
)
@Component
public class TransactionMapperImpl extends TransactionMapper {

    @Autowired
    private TransferMapper transferMapper;

    @Override
    public TransactionDto toDto(Transaction transaction) {
        if ( transaction == null ) {
            return null;
        }

        TransactionDto transactionDto = new TransactionDto();

        transactionDto.setDate( TransactionMapper.LongToString( transaction.getDate() ) );
        transactionDto.setId( transaction.getId() );
        transactionDto.setCategory( transaction.getCategory() );
        transactionDto.setAccount( transaction.getAccount() );
        transactionDto.setDirection( transaction.getDirection() );
        transactionDto.setType( transaction.getType() );
        transactionDto.setAmount( transaction.getAmount() );
        transactionDto.setCurrency( transaction.getCurrency() );
        transactionDto.setUser( transaction.getUser() );
        transactionDto.setComment( transaction.getComment() );
        transactionDto.setTransfer( transferMapper.toDto( transaction.getTransfer() ) );

        return transactionDto;
    }

    @Override
    public List<TransactionDto> toDtoList(List<Transaction> transactionList) {
        if ( transactionList == null ) {
            return null;
        }

        List<TransactionDto> list = new ArrayList<TransactionDto>( transactionList.size() );
        for ( Transaction transaction : transactionList ) {
            list.add( toDto( transaction ) );
        }

        return list;
    }

    @Override
    public Transaction toModel(TransactionDto transactionDto) {
        if ( transactionDto == null ) {
            return null;
        }

        Transaction.TransactionBuilder transaction = Transaction.builder();

        transaction.date( TransactionMapper.StringToLong( transactionDto.getDate() ) );
        transaction.id( transactionDto.getId() );
        transaction.amount( transactionDto.getAmount() );
        transaction.comment( transactionDto.getComment() );
        transaction.user( transactionDto.getUser() );
        transaction.category( transactionDto.getCategory() );
        transaction.account( transactionDto.getAccount() );
        transaction.type( transactionDto.getType() );
        transaction.direction( transactionDto.getDirection() );
        transaction.currency( transactionDto.getCurrency() );
        transaction.transfer( transferMapper.toModel( transactionDto.getTransfer() ) );

        return transaction.build();
    }

    @Override
    public List<Transaction> toModelList(List<TransactionDto> transactionDtoList) {
        if ( transactionDtoList == null ) {
            return null;
        }

        List<Transaction> list = new ArrayList<Transaction>( transactionDtoList.size() );
        for ( TransactionDto transactionDto : transactionDtoList ) {
            list.add( toModel( transactionDto ) );
        }

        return list;
    }
}
