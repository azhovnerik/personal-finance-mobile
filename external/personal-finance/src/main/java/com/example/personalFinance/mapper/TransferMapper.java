package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.TransferDto;
import com.example.personalFinance.model.Transfer;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransferMapper {
    TransferDto toDto(Transfer transfer);

    List<TransferDto> toDtoList(List<Transfer> transfers);

    Transfer toModel(TransferDto transferDto);

    List<Transfer> toModelList(List<TransferDto> transferDtos);
}
