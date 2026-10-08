package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCancelOrderResponse;
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
class ShipmozoCancellationServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoCancellationService cancellationService;

    @BeforeEach
    void setUp() {
        cancellationService = new ShipmozoCancellationService(apiClient);
    }

    @Test
    void testCancelOrder_Success() {
        ShipmozoCancelOrderResponse data = new ShipmozoCancelOrderResponse("ORD-1", "REF-1");
        ShipmozoResponse<ShipmozoCancelOrderResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/cancel-order"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoCancelOrderResponse result = cancellationService.cancelOrder("ORD-1", "AWB123");
        assertEquals("ORD-1", result.orderId());
        assertEquals("REF-1", result.referenceId());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> cancellationService.cancelOrder(null, "AWB123"));
        assertThrows(IllegalArgumentException.class, () -> cancellationService.cancelOrder("ORD-1", null));
    }
}
