package com.example.personalFinance.web;

import com.example.personalFinance.dto.LiqPayCallbackResult;
import com.example.personalFinance.service.subscription.LiqPayCallbackService;
import com.example.personalFinance.service.subscription.SubscriptionPaymentFlowLogger;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/subscriptions/liqpay")
@RequiredArgsConstructor
@Slf4j
public class LiqPayCallbackController {

    private final LiqPayCallbackService liqPayCallbackService;
    private final SubscriptionPaymentFlowLogger paymentFlowLogger;

    @RequestMapping(value = "/callback", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<String> acknowledgeCallbackEndpoint() {
        paymentFlowLogger.logStep(null, null, "SERVER_CALLBACK_PROBED",
                "Received LiqPay callback availability probe");
        return ResponseEntity.ok("ok");
    }

    @PostMapping(value = "/callback")
    public ResponseEntity<String> handleCallback(@RequestParam("data") String data,
                                                 @RequestParam("signature") String signature) {
        Map<String, String> receivedContext = new LinkedHashMap<>();
        receivedContext.put("data_length", data != null ? String.valueOf(data.length()) : "0");
        receivedContext.put("signature_length", signature != null ? String.valueOf(signature.length()) : "0");
        paymentFlowLogger.logStep(null, null, "SERVER_CALLBACK_RECEIVED",
                "Received LiqPay server callback", receivedContext);
        try {
            LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);
            log.info("LiqPay callback processed: orderId={}, userId={}, plan={}, status={}",
                    result.getOrderId(), result.getUserId(), result.getPlan().getCode(), result.getProviderStatus());
            Map<String, String> context = new LinkedHashMap<>();
            context.put("plan", result.getPlan().getCode());
            context.put("status", result.getProviderStatus());
            paymentFlowLogger.logStep(result.getUserId(), result.getOrderId(), "SERVER_CALLBACK_PROCESSED",
                    "LiqPay server callback processed successfully", context);
            return ResponseEntity.ok("ok");
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid LiqPay callback payload: {}", ex.getMessage());
            paymentFlowLogger.logError(null, null, "SERVER_CALLBACK_INVALID",
                    "Invalid LiqPay callback payload", ex);
            return ResponseEntity.ok("invalid");
        } catch (IllegalStateException ex) {
            log.warn("LiqPay callback ignored: {}", ex.getMessage());
            paymentFlowLogger.logError(null, null, "SERVER_CALLBACK_IGNORED",
                    "LiqPay callback ignored", ex);
            return ResponseEntity.ok("ignored");
        } catch (Exception ex) {
            log.error("Unexpected error while processing LiqPay callback", ex);
            paymentFlowLogger.logError(null, null, "SERVER_CALLBACK_ERROR",
                    "Unexpected error while processing LiqPay callback", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("error");
        }
    }
}
