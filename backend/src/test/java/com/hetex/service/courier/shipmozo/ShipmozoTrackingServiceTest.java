package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoTrackingResponse;
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
class ShipmozoTrackingServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoTrackingService trackingService;

    @BeforeEach
    void setUp() {
        trackingService = new ShipmozoTrackingService(apiClient);
    }

    @Test
    void testTrackOrder_Success() {
        ShipmozoTrackingResponse data = new ShipmozoTrackingResponse(
            "ORD-1", "REF-1", "AWB123", "Bluedart", "2026-10-10", "IN_TRANSIT", "2026-10-08 10:00:00", List.of()
        );
        ShipmozoResponse<ShipmozoTrackingResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.get(eq("/track-order?awb_number=AWB123"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoTrackingResponse result = trackingService.trackOrder("AWB123");
        assertEquals("AWB123", result.awbNumber());
        assertEquals("IN_TRANSIT", result.currentStatus());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> trackingService.trackOrder(null));
        assertThrows(IllegalArgumentException.class, () -> trackingService.trackOrder(""));
    }
}
