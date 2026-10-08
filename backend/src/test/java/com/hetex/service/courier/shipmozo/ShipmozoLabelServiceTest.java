package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoLabelResponse;
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
class ShipmozoLabelServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoLabelService labelService;

    @BeforeEach
    void setUp() {
        labelService = new ShipmozoLabelService(apiClient);
    }

    @Test
    void testGetOrderLabel_Success() {
        ShipmozoLabelResponse data = new ShipmozoLabelResponse("data:image/png;base64,mockbase64", "2026-10-08");
        ShipmozoResponse<ShipmozoLabelResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.get(eq("/get-order-label/AWB123"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoLabelResponse result = labelService.getOrderLabel("AWB123");
        assertEquals("data:image/png;base64,mockbase64", result.label());
        assertEquals("2026-10-08", result.createdAt());
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> labelService.getOrderLabel(null));
        assertThrows(IllegalArgumentException.class, () -> labelService.getOrderLabel(""));
    }
}
