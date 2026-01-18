package com.example.personalFinance.dto;

import com.example.personalFinance.model.Account;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferDto implements Serializable {
    private UUID id;
    private Long date;
    private String comment;
    private UUID userId;
    private Account fromAccount;
    private Account toAccount;
}
