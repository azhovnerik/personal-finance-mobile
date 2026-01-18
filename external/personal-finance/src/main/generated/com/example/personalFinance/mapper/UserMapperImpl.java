package com.example.personalFinance.mapper;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.UserApp;
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
public class UserMapperImpl implements UserMapper {

    @Override
    public UserDto toDto(UserApp user) {
        if ( user == null ) {
            return null;
        }

        UserDto userDto = new UserDto();

        userDto.setName( user.getName() );
        userDto.setPassword( user.getPassword() );
        userDto.setEmail( user.getEmail() );
        userDto.setInterfaceLanguage( user.getInterfaceLanguage() );

        return userDto;
    }

    @Override
    public List<UserDto> toDtoList(List<UserApp> users) {
        if ( users == null ) {
            return null;
        }

        List<UserDto> list = new ArrayList<UserDto>( users.size() );
        for ( UserApp userApp : users ) {
            list.add( toDto( userApp ) );
        }

        return list;
    }

    @Override
    public UserApp toModel(UserDto userDto) {
        if ( userDto == null ) {
            return null;
        }

        UserApp.UserAppBuilder userApp = UserApp.builder();

        userApp.name( userDto.getName() );
        userApp.email( userDto.getEmail() );
        userApp.password( userDto.getPassword() );
        userApp.interfaceLanguage( userDto.getInterfaceLanguage() );

        return userApp.build();
    }

    @Override
    public List<UserApp> toModelList(List<UserDto> userDtoList) {
        if ( userDtoList == null ) {
            return null;
        }

        List<UserApp> list = new ArrayList<UserApp>( userDtoList.size() );
        for ( UserDto userDto : userDtoList ) {
            list.add( toModel( userDto ) );
        }

        return list;
    }
}
