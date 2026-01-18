package com.example.personalFinance.dto;

import com.example.personalFinance.validator.PasswordMatches;
import com.example.personalFinance.validator.ValidPassword;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.ToString;

import java.io.Serializable;

@ToString
@PasswordMatches
public class UserDto implements Serializable {
    @NotNull
    @NotEmpty
    private String name;

    @NotNull
    @NotEmpty
    @ValidPassword
    private String password;


    private String matchingPassword;

    @NotNull
    @NotEmpty
    private String email;

    private String interfaceLanguage;


    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getMatchingPassword() {
        return matchingPassword;
    }

    public void setMatchingPassword(String matchingPassword) {
        this.matchingPassword = matchingPassword;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getInterfaceLanguage() {
        return interfaceLanguage;
    }

    public void setInterfaceLanguage(String interfaceLanguage) {
        this.interfaceLanguage = interfaceLanguage;
    }
}
