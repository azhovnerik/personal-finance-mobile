package com.example.personalFinance.repository;

import com.example.personalFinance.model.SupportRequest;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupportRequestRepository extends JpaRepository<SupportRequest, UUID> {
}
