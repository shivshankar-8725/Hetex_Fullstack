package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCourierRate;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmozoRateServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoRateService rateService;

    @BeforeEach
    void setUp() {
        rateService = new ShipmozoRateService(apiClient);
    }

    @Test
    void testCalculateRateForNewShipment() {
        ShipmozoCourierRate rate1 = new ShipmozoCourierRate(1, "Bluedart", "2 days", 150.0, 100.0, 50.0, 0.0, 150.0);
        ShipmozoResponse<List<ShipmozoCourierRate>> mockResponse = new ShipmozoResponse<>("1", "Success", List.of(rate1));

        when(apiClient.post(eq("/rate-calculator"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        List<ShipmozoCourierRate> result = rateService.calculateRateForNewShipment(
            "110001", "400001", "COD", 1000.0, 1.5, 10.0, 10.0, 10.0, 50.0
        );

        assertEquals(1, result.size());
        assertEquals("Bluedart", result.get(0).courierName());
    }

    @Test
    void testValidationFailure() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> rateService.calculateRateForNewShipment(
                null, "400001", "COD", 1000.0, 1.5, 10.0, 10.0, 10.0, 50.0
            ));
        assertTrue(ex.getMessage().contains("pickup_pincode is required"));
        
        ex = assertThrows(IllegalArgumentException.class, 
            () -> rateService.calculateRateForExistingOrder(
                null, "110001", "400001", "COD", 1000.0, 1.5, 10.0, 10.0, 10.0, 50.0
            ));
        assertTrue(ex.getMessage().contains("order_id is required"));
    }
}
