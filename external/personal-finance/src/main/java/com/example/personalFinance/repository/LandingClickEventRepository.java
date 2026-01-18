package com.example.personalFinance.repository;

import com.example.personalFinance.model.LandingClickEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LandingClickEventRepository extends JpaRepository<LandingClickEvent, UUID> {
}
