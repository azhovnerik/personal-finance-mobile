package com.example.personalFinance.security.oauth;

import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.OnboardingStateRepository;
import com.example.personalFinance.repository.UserRepository;
import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.GeoIpService;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.service.subscription.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private OnboardingStateRepository onboardingStateRepository;
    @Mock
    private SubscriptionService subscriptionService;
    @Mock
    private UserService userService;
    @Mock
    private GeoIpService geoIpService;
    @Mock
    private ClientIpResolver clientIpResolver;
    @Mock
    private ObjectProvider<HttpServletRequest> httpServletRequestProvider;

    private CustomOAuth2UserService service;

    @BeforeEach
    void setUp() {
        service = new CustomOAuth2UserService(
                userRepository,
                onboardingStateRepository,
                subscriptionService,
                userService,
                geoIpService,
                clientIpResolver,
                httpServletRequestProvider
        );
    }

    @Test
    void shouldPersistCountryCodeWhenCreatingNewOauthUser() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(httpServletRequestProvider.getIfAvailable()).thenReturn(request);
        when(clientIpResolver.resolve(request)).thenReturn("198.51.100.7");
        when(geoIpService.resolveCountryCode("198.51.100.7")).thenReturn("CA");
        when(userRepository.save(any(UserApp.class))).thenAnswer(invocation -> {
            UserApp user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(subscriptionService.provisionTrial(any())).thenReturn(null);
        doNothing().when(userService).notifySupportAboutNewUser(any());

        UserApp created = ReflectionTestUtils.invokeMethod(
                service,
                "createUserFromOAuthProfile",
                "user@example.com",
                "OAuth User");

        assertThat(created).isNotNull();
        assertThat(created.getCountryCode()).isEqualTo("CA");

        ArgumentCaptor<UserApp> userCaptor = ArgumentCaptor.forClass(UserApp.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getCountryCode()).isEqualTo("CA");
    }
}
