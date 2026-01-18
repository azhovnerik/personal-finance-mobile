package com.example.personalFinance.web.interceptor;

import com.example.personalFinance.service.CurrencyConversionWarningContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

@Component
@RequiredArgsConstructor
public class CurrencyConversionWarningInterceptor implements HandlerInterceptor {

    private final CurrencyConversionWarningContext warningContext;

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                           ModelAndView modelAndView) {
        if (modelAndView == null) {
            return;
        }
        Set<?> warnings = warningContext.consumeWarnings();
        if (!warnings.isEmpty()) {
            modelAndView.addObject("currencyConversionWarnings", warnings);
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        warningContext.clear();
    }
}
