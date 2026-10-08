package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoPickupResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
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
class ShipmozoPickupServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoPickupService pickupService;

    @BeforeEach
    void setUp() {
        pickupService = new ShipmozoPickupService(apiClient);
    }

    @Test
    void testSchedulePickup_Success() {
        ShipmozoPickupResponse data = new ShipmozoPickupResponse("ORD-1", "REF-1", "Bluedart", "AWB123", "LR789");
        ShipmozoResponse<ShipmozoPickupResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/schedule-pickup"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoPickupResponse result = pickupService.schedulePickup("ORD-1");
        assertEquals("ORD-1", result.orderId());
        assertEquals("AWB123", result.awbNumber());
        assertEquals("LR789", result.lrNumber());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> pickupService.schedulePickup(null));
    }
}
