package com.example.personalFinance.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

@Data
public class SubscriptionSelectionForm {

    @NotNull
    private UUID planId;
}
