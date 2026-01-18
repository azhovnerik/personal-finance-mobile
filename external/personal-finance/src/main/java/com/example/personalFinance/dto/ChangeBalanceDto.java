package com.example.personalFinance.dto;

import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.UserApp;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;


@ToString
@Getter
@Setter
public class ChangeBalanceDto implements Serializable {

    private UUID id;

    @NotNull
    private String date;

    @NotNull
    private Account account;

    @NotNull
    private BigDecimal newBalance;

    private UserApp user;

    private String comment;

    public ChangeBalanceDto() {

    }

    public ChangeBalanceDto(UserApp userApp, String date, BigDecimal newBalance, Account account, String comment) {
        this.user = userApp;
        this.date = date;
        this.newBalance = newBalance;
        this.account = account;
        this.comment = comment;
    }
}
