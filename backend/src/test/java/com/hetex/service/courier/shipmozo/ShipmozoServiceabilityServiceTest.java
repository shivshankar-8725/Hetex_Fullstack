package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoServiceabilityResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmozoServiceabilityServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoServiceabilityService serviceabilityService;

    @BeforeEach
    void setUp() {
        serviceabilityService = new ShipmozoServiceabilityService(apiClient);
    }

    @Test
    void testCheckServiceability_Serviceable() {
        ShipmozoServiceabilityResponse data = new ShipmozoServiceabilityResponse(true);
        ShipmozoResponse<ShipmozoServiceabilityResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/pincode-serviceability"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        boolean result = serviceabilityService.checkServiceability("122001", "110001");
        assertTrue(result);
    }

    @Test
    void testCheckServiceability_NotServiceable() {
        ShipmozoServiceabilityResponse data = new ShipmozoServiceabilityResponse(false);
        ShipmozoResponse<ShipmozoServiceabilityResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/pincode-serviceability"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        boolean result = serviceabilityService.checkServiceability("122001", "999999");
        assertFalse(result);
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> serviceabilityService.checkServiceability(null, "110001"));
        assertThrows(IllegalArgumentException.class, () -> serviceabilityService.checkServiceability("122001", null));
    }
}
