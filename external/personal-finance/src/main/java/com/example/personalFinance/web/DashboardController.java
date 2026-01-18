package com.example.personalFinance.web;

import com.example.personalFinance.dto.DashboardSummary;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.DashboardService;
import com.example.personalFinance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final SecurityService securityService;
    private final UserService userService;
    private final DashboardService dashboardService;

    @GetMapping({"/", "/index"})
    public String showDashboard(Model model,
                                @RequestParam(value = "startDate", required = false)
                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                @RequestParam(value = "endDate", required = false)
                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (!securityService.isAuthenticated()) {
            return "index";
        }

        Optional<UserApp> maybeUser = userService.findByName(securityService.getCurrentUser());
        if (maybeUser.isEmpty()) {
            model.addAttribute("message", "User is not authorized!");
            return "error";
        }

        LocalDate[] normalizedPeriod = normalizePeriod(startDate, endDate);
        LocalDate normalizedStart = normalizedPeriod[0];
        LocalDate normalizedEnd = normalizedPeriod[1];

        DashboardSummary dashboardSummary = dashboardService.buildSummary(maybeUser.get().getId(), normalizedStart, normalizedEnd);
        model.addAttribute("dashboard", dashboardSummary);
        model.addAttribute("startDate", normalizedStart);
        model.addAttribute("endDate", normalizedEnd);
        return "index";
    }

    private LocalDate[] normalizePeriod(LocalDate startDate, LocalDate endDate) {
        LocalDate today = LocalDate.now();
        LocalDate defaultStart = today.withDayOfMonth(1);
        LocalDate defaultEnd = today.withDayOfMonth(today.lengthOfMonth());

        if (startDate == null && endDate == null) {
            startDate = defaultStart;
            endDate = defaultEnd;
        } else if (startDate == null) {
            startDate = endDate;
        } else if (endDate == null) {
            endDate = startDate;
        }

        if (endDate.isBefore(startDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        return new LocalDate[]{startDate, endDate};
    }
}
