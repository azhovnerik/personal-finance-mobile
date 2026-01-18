package com.example.personalFinance.web;

import com.example.personalFinance.model.Role;
import com.example.personalFinance.model.SubscriptionCancellation;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.SubscriptionCancellationRepository;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.UserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/subscriptions")
@RequiredArgsConstructor
public class SubscriptionAdminController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionAdminController.class);

    private final SubscriptionCancellationRepository subscriptionCancellationRepository;
    private final SecurityService securityService;
    private final UserService userService;

    @GetMapping("/cancellations")
    public String viewCancellations(Model model) {
        UserApp user = currentUser();
        if (user.getRole() != Role.ADMIN) {
            log.warn("User {} attempted to access subscription cancellations without admin role", user.getId());
            throw new AccessDeniedException("Only admins can view cancellations");
        }
        List<SubscriptionCancellation> cancellations = subscriptionCancellationRepository.findAllByOrderByCreatedAtDesc();
        model.addAttribute("cancellations", cancellations);
        return "admin/subscription-cancellations";
    }

    private UserApp currentUser() {
        String username = securityService.getCurrentUser();
        if (username == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return userService.findByName(username)
                .orElseThrow(() -> new AccessDeniedException("Authentication required"));
    }
}
