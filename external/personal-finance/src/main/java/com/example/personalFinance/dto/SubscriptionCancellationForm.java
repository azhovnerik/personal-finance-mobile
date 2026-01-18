package com.example.personalFinance.dto;

import com.example.personalFinance.model.SubscriptionCancellationReasonType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubscriptionCancellationForm {

    @NotNull
    private SubscriptionCancellationReasonType reasonType;

    private String additionalDetails;
}
