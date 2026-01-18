package com.example.personalFinance.web.rest;

import com.example.personalFinance.service.ClientIpResolver;
import com.example.personalFinance.service.LandingClickEventService;
import com.example.personalFinance.web.rest.dto.LandingClickEventRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.ZonedDateTime;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class LandingClickEventControllerTest {

    @Mock
    private LandingClickEventService landingClickEventService;

    @Mock
    private ClientIpResolver clientIpResolver;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @BeforeEach
    void setUp() {
        LandingClickEventController controller = new LandingClickEventController(landingClickEventService, clientIpResolver);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setValidator(new LocalValidatorFactoryBean())
                .build();
    }

    @Test
    void shouldAcceptValidLandingClickEvent() throws Exception {
        LandingClickEventRequest request = LandingClickEventRequest.builder()
                .clickedAt(ZonedDateTime.parse("2024-07-01T10:00:00+03:00[Europe/Kyiv]"))
                .countryCode("UA")
                .deviceType("mobile")
                .ipAddress("192.168.0.1")
                .build();

        mockMvc.perform(post("/api/landing-clicks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        ArgumentCaptor<LandingClickEventRequest> captor = ArgumentCaptor.forClass(LandingClickEventRequest.class);
        verify(landingClickEventService).saveLandingClick(captor.capture(), any());
        assertThat(captor.getValue().getDeviceType()).isEqualTo("mobile");
        assertThat(captor.getValue().getIpAddress()).isEqualTo("192.168.0.1");
    }

    @Test
    void shouldAcceptFormUrlencodedPayload() throws Exception {
        mockMvc.perform(post("/api/landing-clicks")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("clickedAt", "2024-07-01T10:00:00+03:00[Europe/Kyiv]")
                        .param("countryCode", "UA")
                        .param("deviceType", "MOBILE")
                        .param("ipAddress", "127.0.0.1"))
                .andExpect(status().isAccepted());

        ArgumentCaptor<LandingClickEventRequest> captor = ArgumentCaptor.forClass(LandingClickEventRequest.class);
        verify(landingClickEventService).saveLandingClick(captor.capture(), any());
        assertThat(captor.getValue().getDeviceType()).isEqualToIgnoringCase("mobile");
        assertThat(captor.getValue().getIpAddress()).isEqualTo("127.0.0.1");
    }

    @Test
    void shouldRejectInvalidDeviceType() throws Exception {
        String payload = "{" +
                "\"clickedAt\":\"2024-07-01T10:00:00+03:00[Europe/Kyiv]\"," +
                "\"countryCode\":\"UA\"," +
                "\"deviceType\":\"console\"," +
                "\"ipAddress\":\"192.168.0.1\"}";

        mockMvc.perform(post("/api/landing-clicks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(landingClickEventService);
    }

    @Test
    void shouldAcceptMissingCountryCode() throws Exception {
        String payload = "{" +
                "\"clickedAt\":\"2024-07-01T10:00:00+03:00[Europe/Kyiv]\"," +
                "\"deviceType\":\"mobile\"," +
                "\"ipAddress\":\"10.0.0.1\"}";

        mockMvc.perform(post("/api/landing-clicks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isAccepted());

        ArgumentCaptor<LandingClickEventRequest> captor = ArgumentCaptor.forClass(LandingClickEventRequest.class);
        verify(landingClickEventService).saveLandingClick(captor.capture(), any());
        assertThat(captor.getValue().getCountryCode()).isNull();
    }
}
