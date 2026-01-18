package com.example.personalFinance.security;

import com.example.personalFinance.model.OnboardingState;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.OnboardingStateRepository;
import com.example.personalFinance.service.UserService;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service("userDetailServiceImpl")
public class UserDetailServiceImpl implements UserDetailsService {

    private final UserService userService;
    private final OnboardingStateRepository onboardingStateRepository;

    @Autowired
    public UserDetailServiceImpl(UserService userService, OnboardingStateRepository onboardingStateRepository) {
        this.userService = userService;
        this.onboardingStateRepository = onboardingStateRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserApp user = userService.findByName(username)
                .orElseThrow(() -> new UsernameNotFoundException("user doesn't exist!"));

        List<OnboardingState> states = onboardingStateRepository.findAllByUserId(user.getId());
        if (states.isEmpty()) {
            onboardingStateRepository.save(OnboardingState.builder()
                    .user(user)
                    .isCompleted(false)
                    .build());
        } else if (states.size() > 1) {
            onboardingStateRepository.deleteAll(states.subList(1, states.size()));
        }

        return SecurityUser.fromUser(user);
    }
}
