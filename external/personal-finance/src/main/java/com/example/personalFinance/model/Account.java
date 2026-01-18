package com.example.personalFinance.model;

import com.example.personalFinance.model.converter.CurrencyCodeAttributeConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;


@Entity
@Table(name = "account")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;

    private String description;

    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private AccountType type;

    @Convert(converter = CurrencyCodeAttributeConverter.class)
    private CurrencyCode currency;
}
