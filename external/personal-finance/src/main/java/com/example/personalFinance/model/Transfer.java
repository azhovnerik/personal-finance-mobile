package com.example.personalFinance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "transfer")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transfer {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private Long date;

    private String comment;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_account_id", foreignKey = @ForeignKey(name = "fk_transfer_from_account"))
    private Account fromAccount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_account_id", foreignKey = @ForeignKey(name = "fk_transfer_to_account"))
    private Account toAccount;
}
