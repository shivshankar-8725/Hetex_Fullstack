package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoOrderDetailResponse;
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
class ShipmozoOrderDetailServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoOrderDetailService detailService;

    @BeforeEach
    void setUp() {
        detailService = new ShipmozoOrderDetailService(apiClient);
    }

    @Test
    void testGetOrderDetail_Success() {
        ShipmozoOrderDetailResponse data = new ShipmozoOrderDetailResponse("ORD-1", "REF-1", "Delivered", "AWB123", "Bluedart");
        ShipmozoResponse<ShipmozoOrderDetailResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.get(eq("/get-order-detail/ORD-1"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoOrderDetailResponse result = detailService.getOrderDetail("ORD-1");
        assertEquals("ORD-1", result.orderId());
        assertEquals("Delivered", result.status());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> detailService.getOrderDetail(null));
        assertThrows(IllegalArgumentException.class, () -> detailService.getOrderDetail(""));
    }
}
