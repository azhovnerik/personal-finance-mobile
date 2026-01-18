package com.example.personalFinance.model;

import jakarta.persistence.*;
import lombok.*;


import java.util.UUID;

@Entity
@Table(name = "onboarding_state")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardingState {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserApp user;

    @Column(name = "is_completed")
    private boolean isCompleted;
}
