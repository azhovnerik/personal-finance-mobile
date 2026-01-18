package com.example.personalFinance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "verification_token")
public class VerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String token;

    @OneToOne
    @JoinColumn(name = "user_id")
    private UserApp user;

    private LocalDateTime expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "token_type")
    private VerificationTokenType type = VerificationTokenType.REGISTRATION;

    @Column(name = "target_email")
    private String targetEmail;
}
