package com.example.personalFinance.repository;

import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.CurrencyRate;
import com.example.personalFinance.model.UserApp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CurrencyRateRepository extends JpaRepository<CurrencyRate, UUID> {

    Optional<CurrencyRate> findFirstByUserAndCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(UserApp user,
                                                                                               CurrencyCode currency,
                                                                                               LocalDate rateDate);

    Optional<CurrencyRate> findByUserAndId(UserApp user, UUID id);

    List<CurrencyRate> findByUserOrderByRateDateDesc(UserApp user);
}
