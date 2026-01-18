package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.TransferDto;
import com.example.personalFinance.model.Transfer;
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
public class TransferMapperImpl implements TransferMapper {

    @Override
    public TransferDto toDto(Transfer transfer) {
        if ( transfer == null ) {
            return null;
        }

        TransferDto.TransferDtoBuilder transferDto = TransferDto.builder();

        transferDto.id( transfer.getId() );
        transferDto.date( transfer.getDate() );
        transferDto.comment( transfer.getComment() );
        transferDto.userId( transfer.getUserId() );
        transferDto.fromAccount( transfer.getFromAccount() );
        transferDto.toAccount( transfer.getToAccount() );

        return transferDto.build();
    }

    @Override
    public List<TransferDto> toDtoList(List<Transfer> transfers) {
        if ( transfers == null ) {
            return null;
        }

        List<TransferDto> list = new ArrayList<TransferDto>( transfers.size() );
        for ( Transfer transfer : transfers ) {
            list.add( toDto( transfer ) );
        }

        return list;
    }

    @Override
    public Transfer toModel(TransferDto transferDto) {
        if ( transferDto == null ) {
            return null;
        }

        Transfer.TransferBuilder transfer = Transfer.builder();

        transfer.id( transferDto.getId() );
        transfer.date( transferDto.getDate() );
        transfer.comment( transferDto.getComment() );
        transfer.userId( transferDto.getUserId() );
        transfer.fromAccount( transferDto.getFromAccount() );
        transfer.toAccount( transferDto.getToAccount() );

        return transfer.build();
    }

    @Override
    public List<Transfer> toModelList(List<TransferDto> transferDtos) {
        if ( transferDtos == null ) {
            return null;
        }

        List<Transfer> list = new ArrayList<Transfer>( transferDtos.size() );
        for ( TransferDto transferDto : transferDtos ) {
            list.add( toModel( transferDto ) );
        }

        return list;
    }
}
