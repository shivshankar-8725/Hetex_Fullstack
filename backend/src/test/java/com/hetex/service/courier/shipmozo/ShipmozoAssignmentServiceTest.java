package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoAssignCourierResponse;
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
class ShipmozoAssignmentServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoAssignmentService assignmentService;

    @BeforeEach
    void setUp() {
        assignmentService = new ShipmozoAssignmentService(apiClient);
    }

    @Test
    void testAssignCourier_Success() {
        ShipmozoAssignCourierResponse data = new ShipmozoAssignCourierResponse("ORD-1", "REF-1", "Bluedart", "AWB123", "Bluedart", "Surface");
        ShipmozoResponse<ShipmozoAssignCourierResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/assign-courier"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoAssignCourierResponse result = assignmentService.assignCourier("ORD-1", 101);
        assertEquals("ORD-1", result.orderId());
        assertEquals("AWB123", result.awbNumber());
    }

    @Test
    void testAutoAssignCourier_Success() {
        ShipmozoAssignCourierResponse data = new ShipmozoAssignCourierResponse("ORD-2", "REF-2", "Delhivery", "AWB456", "Delhivery", "Express");
        ShipmozoResponse<ShipmozoAssignCourierResponse> mockResponse = new ShipmozoResponse<>("1", "Success", data);

        when(apiClient.post(eq("/auto-assign-order"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoAssignCourierResponse result = assignmentService.autoAssignCourier("ORD-2");
        assertEquals("ORD-2", result.orderId());
        assertEquals("AWB456", result.awbNumber());
    }

    @Test
    void testAutoAssignCourier_NotConfigured() {
        when(apiClient.post(eq("/auto-assign-order"), any(), any(ParameterizedTypeReference.class)))
                .thenThrow(new ShipmozoException("please setup auto assign"));

        ShipmozoException ex = assertThrows(ShipmozoException.class, () -> assignmentService.autoAssignCourier("ORD-3"));
        assertTrue(ex.getMessage().contains("Auto assignment is not configured"));
    }

    @Test
    void testValidationFailure() {
        assertThrows(IllegalArgumentException.class, () -> assignmentService.assignCourier(null, 101));
        assertThrows(IllegalArgumentException.class, () -> assignmentService.assignCourier("ORD-1", null));
        assertThrows(IllegalArgumentException.class, () -> assignmentService.autoAssignCourier(null));
    }
}
