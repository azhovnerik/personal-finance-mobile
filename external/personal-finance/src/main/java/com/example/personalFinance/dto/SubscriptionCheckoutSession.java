package com.example.personalFinance.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SubscriptionCheckoutSession {
    String checkoutUrl;
    String data;
    String signature;
    String checkoutFormHtml;
    String language;
    String providerReference;
    String orderId;
    String orderDescription;
    long amount;
    String currency;
}
