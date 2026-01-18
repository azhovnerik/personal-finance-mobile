package com.example.personalFinance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "change_balance")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private Long date;

    private BigDecimal newBalance;

    private String comment;

    @Column(name = "user_id")
    private UUID userId;

    @ManyToOne(targetEntity = Account.class, fetch = FetchType.EAGER)
    @JoinColumn(name = "account_id", foreignKey = @ForeignKey(name = "fk_account"))
    private Account account;


    public ChangeBalance(UUID userId, Long date, BigDecimal newBalance, Account account, String comment) {
        this.userId = userId;
        this.date = date;
        this.newBalance = newBalance;
        this.account = account;
        this.comment = comment;
    }
}
