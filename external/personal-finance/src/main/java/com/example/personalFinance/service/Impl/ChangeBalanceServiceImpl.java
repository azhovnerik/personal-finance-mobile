package com.example.personalFinance.service.Impl;

import com.example.personalFinance.changeBalance.repository.ChangeBalanceRepository;
import com.example.personalFinance.model.ChangeBalance;
import com.example.personalFinance.service.ChangeBalanceService;
import com.example.personalFinance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChangeBalanceServiceImpl implements ChangeBalanceService {

    @Autowired
    private UserService userService;

    @Autowired
    private ChangeBalanceRepository changeBalanceRepository;

    @Override
    public List<ChangeBalance> findByUserId(UUID userId) {
        return changeBalanceRepository.findByUserId(userId);
    }

    @Override
    public ChangeBalance save(UUID userId, ChangeBalance changeBalance) {
        return changeBalanceRepository.save(changeBalance);
    }

    @Override
    public Optional<ChangeBalance> findByUserIdAndId(UUID userId, UUID id) {
        return changeBalanceRepository.findByUserIdAndId(userId, id);
    }

    @Override
    public void deleteChangeBalance(ChangeBalance changeBalance) {
        changeBalanceRepository.delete(changeBalance);
    }
}
