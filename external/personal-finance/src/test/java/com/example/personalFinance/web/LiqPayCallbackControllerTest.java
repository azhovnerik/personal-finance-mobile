package com.example.personalFinance.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.personalFinance.dto.LiqPayCallbackResult;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.service.subscription.LiqPayCallbackService;
import com.example.personalFinance.service.subscription.SubscriptionPaymentFlowLogger;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class LiqPayCallbackControllerTest {

    @Mock
    private LiqPayCallbackService liqPayCallbackService;

    @Mock
    private SubscriptionPaymentFlowLogger paymentFlowLogger;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LiqPayCallbackController controller = new LiqPayCallbackController(liqPayCallbackService, paymentFlowLogger);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldAcknowledgeCallbackProbeViaGet() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/subscriptions/liqpay/callback"))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.content().string("ok"));

        verify(paymentFlowLogger).logStep(ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("SERVER_CALLBACK_PROBED"),
                eq("Received LiqPay callback availability probe"));
        verify(liqPayCallbackService, never()).processCallback(any(), any());
    }

    @Test
    void shouldAcknowledgeCallbackProbeViaHead() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.head("/subscriptions/liqpay/callback"))
                .andExpect(MockMvcResultMatchers.status().isOk());

        verify(paymentFlowLogger).logStep(ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("SERVER_CALLBACK_PROBED"),
                eq("Received LiqPay callback availability probe"));
        verify(liqPayCallbackService, never()).processCallback(any(), any());
    }

    @Test
    void shouldProcessCallbackPayload() throws Exception {
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setCode("STANDARD_YEARLY");
        LiqPayCallbackResult result = LiqPayCallbackResult.builder()
                .orderId("order")
                .userId(UUID.randomUUID())
                .plan(plan)
                .providerStatus("success")
                .activated(true)
                .build();
        when(liqPayCallbackService.processCallback("data", "signature")).thenReturn(result);

        mockMvc.perform(MockMvcRequestBuilders.post("/subscriptions/liqpay/callback")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("data", "data")
                        .param("signature", "signature"))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.content().string("ok"));

        verify(paymentFlowLogger).logStep(ArgumentMatchers.isNull(), ArgumentMatchers.isNull(),
                eq("SERVER_CALLBACK_RECEIVED"), eq("Received LiqPay server callback"), ArgumentMatchers.anyMap());
        verify(paymentFlowLogger).logStep(eq(result.getUserId()), eq(result.getOrderId()),
                eq("SERVER_CALLBACK_PROCESSED"), eq("LiqPay server callback processed successfully"),
                ArgumentMatchers.anyMap());
        verify(liqPayCallbackService).processCallback("data", "signature");
    }
}
