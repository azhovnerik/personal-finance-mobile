package com.example.personalFinance.repository;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.VerificationToken;
import com.example.personalFinance.model.VerificationTokenType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {
    Optional<VerificationToken> findByToken(String name);
    Optional<VerificationToken> findByUser(UserApp user);
    Optional<VerificationToken> findByUserAndType(UserApp user, VerificationTokenType type);
    Optional<VerificationToken> findByTokenAndType(String token, VerificationTokenType type);
}
