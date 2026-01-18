package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.ChangeBalanceDto;
import com.example.personalFinance.model.ChangeBalance;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2025-12-29T16:59:21+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.13 (Amazon.com Inc.)"
)
@Component
public class ChangeBalanceMapperImpl extends ChangeBalanceMapper {

    @Override
    public ChangeBalanceDto toDto(ChangeBalance changeBalance) {
        if ( changeBalance == null ) {
            return null;
        }

        ChangeBalanceDto changeBalanceDto = new ChangeBalanceDto();

        changeBalanceDto.setDate( ChangeBalanceMapper.LongToString( changeBalance.getDate() ) );
        changeBalanceDto.setId( changeBalance.getId() );
        changeBalanceDto.setAccount( changeBalance.getAccount() );
        changeBalanceDto.setNewBalance( changeBalance.getNewBalance() );
        changeBalanceDto.setComment( changeBalance.getComment() );

        return changeBalanceDto;
    }

    @Override
    public List<ChangeBalanceDto> toDtoList(List<ChangeBalance> changeBalanceList) {
        if ( changeBalanceList == null ) {
            return null;
        }

        List<ChangeBalanceDto> list = new ArrayList<ChangeBalanceDto>( changeBalanceList.size() );
        for ( ChangeBalance changeBalance : changeBalanceList ) {
            list.add( toDto( changeBalance ) );
        }

        return list;
    }

    @Override
    public ChangeBalance toModel(ChangeBalanceDto changeBalanceDto) {
        if ( changeBalanceDto == null ) {
            return null;
        }

        ChangeBalance.ChangeBalanceBuilder changeBalance = ChangeBalance.builder();

        changeBalance.date( ChangeBalanceMapper.StringToLong( changeBalanceDto.getDate() ) );
        changeBalance.id( changeBalanceDto.getId() );
        changeBalance.newBalance( changeBalanceDto.getNewBalance() );
        changeBalance.comment( changeBalanceDto.getComment() );
        changeBalance.account( changeBalanceDto.getAccount() );

        return changeBalance.build();
    }

    @Override
    public List<ChangeBalance> toModelList(List<ChangeBalanceDto> changeBalanceDtoList) {
        if ( changeBalanceDtoList == null ) {
            return null;
        }

        List<ChangeBalance> list = new ArrayList<ChangeBalance>( changeBalanceDtoList.size() );
        for ( ChangeBalanceDto changeBalanceDto : changeBalanceDtoList ) {
            list.add( toModel( changeBalanceDto ) );
        }

        return list;
    }
}
