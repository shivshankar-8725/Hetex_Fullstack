package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoUpdateWarehouseResponse;
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
class ShipmozoWarehouseUpdateServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoWarehouseUpdateService updateService;

    @BeforeEach
    void setUp() {
        updateService = new ShipmozoWarehouseUpdateService(apiClient);
    }

    @Test
    void testUpdateOrderWarehouse_Success() {
        ShipmozoUpdateWarehouseResponse data = new ShipmozoUpdateWarehouseResponse("ORD-1", "REF-1");
        ShipmozoResponse<ShipmozoUpdateWarehouseResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/order/update-warehouse"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoUpdateWarehouseResponse result = updateService.updateOrderWarehouse("ORD-1", "WH-2");
        assertEquals("ORD-1", result.orderId());
        assertEquals("REF-1", result.referenceId());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> updateService.updateOrderWarehouse(null, "WH-2"));
        assertThrows(IllegalArgumentException.class, () -> updateService.updateOrderWarehouse("ORD-1", null));
    }
}
