package com.example.personalFinance.security.oauth;

import com.example.personalFinance.model.OnboardingState;
import com.example.personalFinance.model.Role;
import com.example.personalFinance.model.Status;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.OnboardingStateRepository;
import com.example.personalFinance.repository.UserRepository;
import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.GeoIpService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Loads user information from Google and synchronizes it with the local database.
 */
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;
    private final OnboardingStateRepository onboardingStateRepository;
    private final SubscriptionService subscriptionService;
    private final UserService userService;
    private final GeoIpService geoIpService;
    private final ClientIpResolver clientIpResolver;
    private final ObjectProvider<HttpServletRequest> httpServletRequestProvider;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        UserApp user = userRepository.findByEmail(email)
                .map(this::markAsOauthUser)
                .orElseGet(() -> createUserFromOAuthProfile(email, name));

        onboardingStateRepository.findByUser(user).orElseGet(() ->
                onboardingStateRepository.save(OnboardingState.builder()
                        .user(user)
                        .isCompleted(false)
                        .build()));

        subscriptionService.findCurrentSubscription(user)
                .orElseGet(() -> subscriptionService.provisionTrial(user));

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }

    private UserApp createUserFromOAuthProfile(String email, String name) {
        UserApp newUser = UserApp.builder()
                .email(email)
                .name(name)
                .role(Role.USER)
                .status(Status.ACTIVE)
                .verified(true)
                .oauthUser(true)
                .countryCode(resolveCountryCodeFromRequest())
                .build();
        UserApp savedUser = userRepository.save(newUser);

        subscriptionService.provisionTrial(savedUser);
        userService.notifySupportAboutNewUser(savedUser);

        return savedUser;
    }

    private UserApp markAsOauthUser(UserApp user) {
        if (!user.isOauthUser()) {
            user.setOauthUser(true);
            return userRepository.save(user);
        }
        return user;
    }

    private String resolveCountryCodeFromRequest() {
        if (geoIpService == null) {
            return null;
        }
        HttpServletRequest request = httpServletRequestProvider.getIfAvailable();
        String clientIp = clientIpResolver.resolve(request);
        if (!StringUtils.hasText(clientIp)) {
            return null;
        }
        return geoIpService.resolveCountryCode(clientIp);
    }
}

