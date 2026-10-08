package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoPushOrderResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPushReturnOrderRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoReturnReason;
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
class ShipmozoReturnServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoReturnService returnService;

    @BeforeEach
    void setUp() {
        returnService = new ShipmozoReturnService(apiClient);
    }

    @Test
    void testGetReturnReasons() {
        ShipmozoReturnReason reason = new ShipmozoReturnReason("9", "Item is damaged");
        ShipmozoResponse<List<ShipmozoReturnReason>> mockResponse = new ShipmozoResponse<>("1", "Success", List.of(reason));

        when(apiClient.get(eq("/get-return-reason"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        List<ShipmozoReturnReason> result = returnService.getReturnReasons();
        assertEquals(1, result.size());
        assertEquals("9", result.get(0).id());
    }

    @Test
    void testPushReturnOrder_Success() {
        ShipmozoReturnReason reason = new ShipmozoReturnReason("9", "Item is damaged");
        ShipmozoResponse<List<ShipmozoReturnReason>> reasonsResponse = new ShipmozoResponse<>("1", "Success", List.of(reason));

        when(apiClient.get(eq("/get-return-reason"), any(ParameterizedTypeReference.class)))
                .thenReturn(reasonsResponse);

        ShipmozoPushOrderResponse data = new ShipmozoPushOrderResponse("ORD-1", "REF-2", "Success");
        ShipmozoResponse<ShipmozoPushOrderResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/push-return-order"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoPushReturnOrderRequest req = new ShipmozoPushReturnOrderRequest(
            "ORD-1", "2026-10-08", "John", "9876543210", "j@e.com", "Address", "", "110001", "Delhi", "Delhi", List.of(), "PREPAID", 1.0, 10, 10, 10, "", "9", "REFUND", "", ""
        );

        ShipmozoPushOrderResponse result = returnService.pushReturnOrder(req);
        assertEquals("ORD-1", result.orderId());
        assertEquals("REF-2", result.referenceId());
    }

    @Test
    void testPushReturnOrder_InvalidReason() {
        ShipmozoReturnReason reason = new ShipmozoReturnReason("9", "Item is damaged");
        ShipmozoResponse<List<ShipmozoReturnReason>> reasonsResponse = new ShipmozoResponse<>("1", "Success", List.of(reason));

        when(apiClient.get(eq("/get-return-reason"), any(ParameterizedTypeReference.class)))
                .thenReturn(reasonsResponse);

        ShipmozoPushReturnOrderRequest req = new ShipmozoPushReturnOrderRequest(
            "ORD-1", "2026-10-08", "John", "9876543210", "j@e.com", "Address", "", "110001", "Delhi", "Delhi", List.of(), "PREPAID", 1.0, 10, 10, 10, "", "10", "REFUND", "", ""
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> returnService.pushReturnOrder(req));
        assertTrue(ex.getMessage().contains("Invalid return_reason_id"));
    }
}
