package com.example.personalFinance.web;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class UserController {
    @Autowired
    UserService userService;

    @Autowired
    SecurityService securityService;


    @GetMapping("/api/v1/users")
    public List<UserDto> getUsers() {
        return userService.getUsers();
    }

}
