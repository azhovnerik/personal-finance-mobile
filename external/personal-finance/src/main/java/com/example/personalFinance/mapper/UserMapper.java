package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.UserApp;
import org.mapstruct.Mapper;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.List;


@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(UserApp user);
    List<UserDto> toDtoList(List<UserApp> users);
    UserApp toModel(UserDto userDto);
    List<UserApp> toModelList(List<UserDto> userDtoList);
}
