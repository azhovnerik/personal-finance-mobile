package com.example.personalFinance.web;

import com.example.personalFinance.dto.LiqPayCallbackResult;
import com.example.personalFinance.dto.SubscriptionCancellationForm;
import com.example.personalFinance.dto.SubscriptionCheckoutSession;
import com.example.personalFinance.dto.SubscriptionPlanOption;
import com.example.personalFinance.dto.SubscriptionSelectionForm;
import com.example.personalFinance.dto.SubscriptionView;
import com.example.personalFinance.model.SubscriptionCancellationReasonType;
import com.example.personalFinance.model.SubscriptionPlan;
import com.example.personalFinance.model.SubscriptionStatus;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.UserSubscription;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.LocalizationService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.LiqPayCallbackService;
import com.example.personalFinance.service.subscription.LiqPayCheckoutService;
import com.example.personalFinance.service.subscription.SubscriptionPaymentFlowLogger;
import com.example.personalFinance.service.subscription.SubscriptionPlanFormatter;
import com.example.personalFinance.service.subscription.SubscriptionPlanService;
import com.example.personalFinance.service.subscription.SubscriptionService;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.util.StringUtils;
import jakarta.validation.Valid;

@Controller
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private static final EnumSet<SubscriptionStatus> ACTIVATION_PENDING_STATUSES =
            EnumSet.of(SubscriptionStatus.PAST_DUE);

    private final SubscriptionService subscriptionService;
    private final SubscriptionPlanService subscriptionPlanService;
    private final LiqPayCheckoutService liqPayCheckoutService;
    private final LiqPayCallbackService liqPayCallbackService;
    private final SecurityService securityService;
    private final UserService userService;
    private final SubscriptionPaymentFlowLogger paymentFlowLogger;
    private final SubscriptionPlanFormatter subscriptionPlanFormatter;
    private final MessageSource messageSource;
    private final LocalizationService localizationService;

    @ModelAttribute("cancellationReasons")
    public List<SubscriptionCancellationReasonType> cancellationReasons() {
        return Arrays.asList(SubscriptionCancellationReasonType.values());
    }

    @GetMapping
    public String viewSubscriptions(Model model,
                                    @RequestParam(value = "accessBlocked", required = false) String accessBlocked,
                                    @RequestParam(value = "data", required = false) String liqPayData,
                                    @RequestParam(value = "signature", required = false) String liqPaySignature,
                                    @RequestParam(value = "activated", required = false) String activatedPlanCode) {
        UserApp user = currentUser();
        Locale locale = resolveLocale(user);
        handleLiqPayResult(model, liqPayData, liqPaySignature, user);
        Optional<UserSubscription> subscription = subscriptionService.findCurrentSubscription(user);
        if (!model.containsAttribute("selectionForm")) {
            model.addAttribute("selectionForm", new SubscriptionSelectionForm());
        }
        if (!model.containsAttribute("cancellationForm")) {
            model.addAttribute("cancellationForm", new SubscriptionCancellationForm());
        }
        if (accessBlocked != null && !model.containsAttribute("warningMessage")) {
            model.addAttribute("warningMessage", message("subscription.warning.accessBlocked", locale));
        }
        SubscriptionView view = buildView(subscription, user);
        model.addAttribute("subscription", view);
        if (StringUtils.hasText(activatedPlanCode)) {
            String normalizedActivatedCode = activatedPlanCode.trim();
            if (!model.containsAttribute("successMessage")) {
                subscription.ifPresent(sub -> {
                    SubscriptionPlan plan = sub.getPlan();
                    if (plan != null && plan.getCode().equalsIgnoreCase(normalizedActivatedCode)
                            && SubscriptionStatus.ACTIVE.equals(sub.getStatus())) {
                        model.addAttribute("successMessage",
                                message("subscription.success.activation", locale,
                                        subscriptionPlanFormatter.formatPlanName(plan)));
                    }
                });
            }
            boolean activationPending = shouldShowActivationPendingMessage(subscription, normalizedActivatedCode);
            if (activationPending) {
                if (!model.containsAttribute("infoMessage")) {
                    model.addAttribute("infoMessage",
                            message("subscription.info.activationPending", locale));
                }
                model.addAttribute("activationPendingPlan", normalizedActivatedCode);
            }
        }
        return "subscription";
    }

    @PostMapping(value = "/select", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<?> initiateCheckoutAjax(@Valid @ModelAttribute("selectionForm") SubscriptionSelectionForm form,
                                                  BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please choose a subscription plan."));
        }
        UserApp user = currentUser();
        Locale locale = resolveLocale(user);
        try {
            SubscriptionPlan plan = subscriptionPlanService.getPlan(form.getPlanId());
            if (!subscriptionPlanService.isPlanAvailableForUser(plan, user)) {
                String errorMessage = message("subscription.error.planUnavailable", locale);
                return ResponseEntity.badRequest().body(Map.of("error", errorMessage));
            }
            if (subscriptionService.hasActiveSubscriptionForPlan(user, plan)) {
                String errorMessage = message("subscription.error.alreadyActive", locale,
                        subscriptionPlanFormatter.formatPlanName(plan));
                return ResponseEntity.badRequest().body(Map.of("error", errorMessage));
            }
            SubscriptionCheckoutSession session = liqPayCheckoutService.createCheckoutSession(user, plan);
            log.info("User {} initiated checkout for plan {} (ajax)", user.getId(), plan.getCode());
            Map<String, String> context = new LinkedHashMap<>();
            context.put("plan", plan.getCode());
            context.put("delivery", "ajax");
            paymentFlowLogger.logStep(user.getId(), session.getOrderId(), "CHECKOUT_SESSION_DELIVERED",
                    "Delivered LiqPay checkout session to client", context);
            return ResponseEntity.ok(session);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping(value = "/select", produces = MediaType.TEXT_HTML_VALUE, consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public String initiateCheckout(@Valid @ModelAttribute("selectionForm") SubscriptionSelectionForm form,
                                    BindingResult bindingResult,
                                    RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.selectionForm", bindingResult);
            redirectAttributes.addFlashAttribute("selectionForm", form);
            redirectAttributes.addFlashAttribute("errorMessage", "Please choose a subscription plan.");
            return "redirect:/subscriptions";
        }
        UserApp user = currentUser();
        Locale locale = resolveLocale(user);
        try {
            SubscriptionPlan plan = subscriptionPlanService.getPlan(form.getPlanId());
            if (!subscriptionPlanService.isPlanAvailableForUser(plan, user)) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        message("subscription.error.planUnavailable", locale));
                return "redirect:/subscriptions";
            }
            if (subscriptionService.hasActiveSubscriptionForPlan(user, plan)) {
                String message = message("subscription.error.alreadyActive", locale,
                        subscriptionPlanFormatter.formatPlanName(plan));
                redirectAttributes.addFlashAttribute("errorMessage", message);
                return "redirect:/subscriptions";
            }
            SubscriptionCheckoutSession session = liqPayCheckoutService.createCheckoutSession(user, plan);
            if (StringUtils.hasText(session.getCheckoutFormHtml())) {
                redirectAttributes.addFlashAttribute("checkoutFormHtml", session.getCheckoutFormHtml());
                redirectAttributes.addFlashAttribute("infoMessage", "Complete your subscription using the LiqPay form below.");
            }
            if (StringUtils.hasText(session.getCheckoutUrl())) {
                redirectAttributes.addFlashAttribute("checkoutUrl", session.getCheckoutUrl());
                if (!StringUtils.hasText(session.getCheckoutFormHtml())) {
                    redirectAttributes.addFlashAttribute("infoMessage", "To continue, follow the checkout link to add your card details.");
                }
            }
            log.info("User {} initiated checkout for plan {}", user.getId(), plan.getCode());
            Map<String, String> context = new LinkedHashMap<>();
            context.put("plan", plan.getCode());
            context.put("delivery", "html");
            paymentFlowLogger.logStep(user.getId(), session.getOrderId(), "CHECKOUT_SESSION_DELIVERED",
                    "Delivered LiqPay checkout session to client", context);
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/subscriptions";
    }

    @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public String handleLiqPayResultPost(@RequestParam(value = "data", required = false) String data,
                                         @RequestParam(value = "signature", required = false) String signature,
                                         RedirectAttributes redirectAttributes) {
        UserApp user = currentUser();
        Locale locale = resolveLocale(user);
        Map<String, String> context = new LinkedHashMap<>();
        context.put("data_length", data != null ? String.valueOf(data.length()) : "0");
        context.put("signature_length", signature != null ? String.valueOf(signature.length()) : "0");
        paymentFlowLogger.logStep(user.getId(), null, "RESULT_CALLBACK_RECEIVED",
                "Received LiqPay result callback on subscriptions page", context);
        if (!StringUtils.hasText(data) || !StringUtils.hasText(signature)) {
            paymentFlowLogger.logStep(user.getId(), null, "RESULT_CALLBACK_REJECTED",
                    "Missing LiqPay data or signature", context);
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Payment status could not be verified. Please try again or contact support.");
            return "redirect:/subscriptions";
        }
        try {
            LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);
            if (result.isPaymentFailed()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        message("subscription.error.paymentFailed", locale));
            } else if (result.isActivationPending()) {
                redirectAttributes.addFlashAttribute("infoMessage",
                        message("subscription.info.activationPending", locale));
            } else {
                String planName = subscriptionPlanFormatter.formatPlanName(result.getPlan());
                String successMessage = result.isAlreadyActive()
                        ? message("subscription.success.alreadyActive", locale, planName)
                        : message("subscription.success.activation", locale, planName);
                redirectAttributes.addFlashAttribute("successMessage", successMessage);
            }
            Map<String, String> successContext = new LinkedHashMap<>();
            successContext.put("plan", result.getPlan().getCode());
            successContext.put("status", result.getProviderStatus());
            paymentFlowLogger.logStep(result.getUserId(), result.getOrderId(), "RESULT_CALLBACK_PROCESSED",
                    "LiqPay result callback processed successfully", successContext);
        } catch (IllegalArgumentException ex) {
            paymentFlowLogger.logError(user.getId(), null, "RESULT_CALLBACK_INVALID",
                    "Invalid LiqPay result payload", ex);
            redirectAttributes.addFlashAttribute("errorMessage",
                    "We could not verify your payment. Please try again or contact support.");
        } catch (IllegalStateException ex) {
            paymentFlowLogger.logError(user.getId(), null, "RESULT_CALLBACK_IGNORED",
                    "LiqPay result callback ignored", ex);
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/subscriptions";
    }

    private void handleLiqPayResult(Model model, String data, String signature, UserApp user) {
        if (!StringUtils.hasText(data) || !StringUtils.hasText(signature)) {
            return;
        }
        Locale locale = resolveLocale(user);
        Map<String, String> context = new LinkedHashMap<>();
        context.put("data_length", String.valueOf(data.length()));
        context.put("signature_length", String.valueOf(signature.length()));
        paymentFlowLogger.logStep(user != null ? user.getId() : null, null, "RESULT_QUERY_RECEIVED",
                "Received LiqPay result query parameters", context);
        try {
            LiqPayCallbackResult result = liqPayCallbackService.processCallback(data, signature);
            Map<String, String> successContext = new LinkedHashMap<>();
            successContext.put("plan", result.getPlan().getCode());
            successContext.put("status", result.getProviderStatus());
            paymentFlowLogger.logStep(result.getUserId(), result.getOrderId(), "RESULT_QUERY_PROCESSED",
                    "LiqPay result query parameters processed", successContext);
            if (result.isPaymentFailed()) {
                if (!model.containsAttribute("errorMessage")) {
                    model.addAttribute("errorMessage", message("subscription.error.paymentFailed", locale));
                }
            } else if (result.isActivationPending()) {
                if (!model.containsAttribute("infoMessage")) {
                    model.addAttribute("infoMessage", message("subscription.info.activationPending", locale));
                }
            } else if (!model.containsAttribute("successMessage")) {
                String planName = subscriptionPlanFormatter.formatPlanName(result.getPlan());
                String successMessage = result.isAlreadyActive()
                        ? message("subscription.success.alreadyActive", locale, planName)
                        : message("subscription.success.activation", locale, planName);
                model.addAttribute("successMessage", successMessage);
            }
        } catch (IllegalArgumentException ex) {
            paymentFlowLogger.logError(user != null ? user.getId() : null, null, "RESULT_QUERY_INVALID",
                    "Invalid LiqPay result payload in query", ex);
            if (!model.containsAttribute("errorMessage")) {
                model.addAttribute("errorMessage", "We could not verify your payment. Please try again or contact support.");
            }
        } catch (IllegalStateException ex) {
            paymentFlowLogger.logError(user != null ? user.getId() : null, null, "RESULT_QUERY_IGNORED",
                    "LiqPay result query ignored", ex);
            if (!model.containsAttribute("errorMessage")) {
                model.addAttribute("errorMessage", ex.getMessage());
            }
        }
    }

    private String message(String code, Locale locale, Object... args) {
        return messageSource.getMessage(code, args, locale);
    }

    private boolean shouldShowActivationPendingMessage(Optional<UserSubscription> subscription,
                                                       String normalizedActivatedCode) {
        if (!StringUtils.hasText(normalizedActivatedCode)) {
            return false;
        }
        return subscription.map(sub -> {
            SubscriptionPlan plan = sub.getPlan();
            if (plan == null) {
                return true;
            }
            if (!plan.getCode().equalsIgnoreCase(normalizedActivatedCode)) {
                return true;
            }
            SubscriptionStatus status = sub.getStatus();
            return status == null || ACTIVATION_PENDING_STATUSES.contains(status);
        }).orElse(true);
    }

    private Locale resolveLocale(UserApp user) {
        if (user == null) {
            return localizationService.getDefaultLocale();
        }
        return localizationService.resolveLocale(user.getInterfaceLanguage());
    }

    @PostMapping("/cancel")
    public String cancelSubscription(@Valid @ModelAttribute("cancellationForm") SubscriptionCancellationForm form,
                                     BindingResult bindingResult,
                                     RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("org.springframework.validation.BindingResult.cancellationForm", bindingResult);
            redirectAttributes.addFlashAttribute("cancellationForm", form);
            redirectAttributes.addFlashAttribute("errorMessage", "Please select a cancellation reason.");
            return "redirect:/subscriptions";
        }
        UserApp user = currentUser();
        try {
            subscriptionService.cancelSubscription(user, form.getReasonType(), form.getAdditionalDetails());
            redirectAttributes.addFlashAttribute("successMessage", "Subscription cancelled. Access remains until the end of the current period.");
        } catch (IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/subscriptions";
    }

    @GetMapping(value = "/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getSubscriptionStatus() {
        UserApp user = currentUser();
        Optional<UserSubscription> subscription = subscriptionService.findCurrentSubscription(user);
        if (subscription.isEmpty()) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("status", "NONE");
            payload.put("planCode", null);
            payload.put("planDisplayName", null);
            payload.put("currentPeriodEndsAt", null);
            payload.put("nextBillingAt", null);
            payload.put("updatedAt", null);
            payload.put("autoRenew", Boolean.FALSE);
            return ResponseEntity.ok(payload);
        }
        UserSubscription sub = subscription.get();
        SubscriptionPlan plan = sub.getPlan();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", sub.getStatus() != null ? sub.getStatus().name() : null);
        if (plan != null) {
            payload.put("planCode", plan.getCode());
            payload.put("planDisplayName", subscriptionPlanFormatter.formatPlanDisplayName(plan));
        } else {
            payload.put("planCode", null);
            payload.put("planDisplayName", null);
        }
        payload.put("currentPeriodEndsAt", sub.getCurrentPeriodEndsAt());
        payload.put("nextBillingAt", sub.getNextBillingAt());
        payload.put("updatedAt", sub.getUpdatedAt());
        payload.put("autoRenew", sub.isAutoRenew());
        return ResponseEntity.ok(payload);
    }

    private SubscriptionView buildView(Optional<UserSubscription> optionalSubscription, UserApp user) {
        List<SubscriptionPlanOption> plans = subscriptionPlanService.getActivePaidPlansForUser(user).stream()
                .map(this::toOption)
                .collect(Collectors.toList());
        if (optionalSubscription.isEmpty()) {
            return SubscriptionView.builder()
                    .plans(plans)
                    .paymentRequired(true)
                    .trial(false)
                    .cancellable(false)
                    .status(null)
                    .planCode(null)
                    .planDisplayName(null)
                    .build();
        }
        UserSubscription subscription = optionalSubscription.get();
        boolean trial = SubscriptionStatus.TRIAL.equals(subscription.getStatus());
        boolean cancellable = !trial && EnumSet.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE)
                .contains(subscription.getStatus());
        boolean paymentRequired = !subscriptionService.hasActiveAccess(user);
        SubscriptionPlan plan = subscription.getPlan();
        String planDisplayName = plan != null ? subscriptionPlanFormatter.formatPlanDisplayName(plan) : null;
        return SubscriptionView.builder()
                .status(subscription.getStatus())
                .planCode(plan != null ? plan.getCode() : null)
                .planDisplayName(planDisplayName)
                .trialEndsAt(subscription.getTrialEndsAt())
                .currentPeriodEndsAt(subscription.getCurrentPeriodEndsAt())
                .paymentRequired(paymentRequired)
                .trial(trial)
                .cancellable(cancellable)
                .plans(plans)
                .build();
    }

    private SubscriptionPlanOption toOption(SubscriptionPlan plan) {
        Locale locale = LocaleContextHolder.getLocale();
        return SubscriptionPlanOption.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .type(plan.getType())
                .billingPeriod(plan.getBillingPeriod())
                .price(plan.getPrice())
                .oldPrice(plan.getOldPrice())
                .currency(plan.getCurrency())
                .currencyLabel(subscriptionPlanFormatter.formatCurrencyLabel(plan.getCurrency(), locale))
                .trialPeriodDays(plan.getTrialPeriodDays())
                .displayName(subscriptionPlanFormatter.formatPlanName(plan))
                .build();
    }

    private UserApp currentUser() {
        String username = securityService.getCurrentUser();
        if (username == null) {
            throw new IllegalStateException("User must be authenticated to manage subscriptions");
        }
        return userService.findByName(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

}
