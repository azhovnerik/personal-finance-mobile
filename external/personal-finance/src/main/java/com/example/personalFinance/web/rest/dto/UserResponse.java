package com.example.personalFinance.web.rest.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String email;
    private String name;
}
