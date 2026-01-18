package com.example.personalFinance.web.util;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("userView")
@RequiredArgsConstructor
public class UserViewHelper {
    private final UserService userService;

    public String displayName(String email) {
        return userService.findByName(email)
                .map(UserApp::getName)
                .orElse(email);
    }
}
