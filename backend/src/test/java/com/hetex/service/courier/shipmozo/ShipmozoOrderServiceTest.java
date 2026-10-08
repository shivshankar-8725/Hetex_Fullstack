package com.hetex.service.courier.shipmozo;

import com.hetex.entity.Address;
import com.hetex.entity.Order;
import com.hetex.entity.PaymentMode;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPushOrderResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmozoOrderServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoOrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new ShipmozoOrderService(apiClient);
    }

    @Test
    void testPushOrder_Success() {
        Order order = new Order();
        order.setOrderNumber("ORD-123");
        order.setPaymentMode(PaymentMode.PREPAID);
        order.setBillableWeight(1.5);
        order.setDeclaredValue(100.0);
        order.setCreatedAt(java.time.Instant.now());
        
        Address buyer = new Address();
        buyer.setContactName("John Doe");
        buyer.setPhone("9876543210");
        buyer.setAddressLine1("123 Main St");
        buyer.setPincode("110001");
        buyer.setCity("New Delhi");
        buyer.setState("Delhi");

        ShipmozoPushOrderResponse mockResponseData = new ShipmozoPushOrderResponse("ORD-123", "REF-456", "Success");
        ShipmozoResponse<ShipmozoPushOrderResponse> mockResponse = new ShipmozoResponse<>("1", "Success", mockResponseData);

        when(apiClient.post(eq("/push-order"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoPushOrderResponse result = orderService.pushOrder(order, buyer, "WH-1", 10.0, 10.0, 10.0);
        
        assertEquals("ORD-123", result.orderId());
        assertEquals("REF-456", result.referenceId());
    }

    @Test
    void testPushOrder_ValidationFailure_MissingFields() {
        Order order = new Order();
        Address buyer = new Address();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> orderService.pushOrder(order, buyer, "WH-1", 10.0, 10.0, 10.0));
        assertTrue(ex.getMessage().contains("order_id is required"));

        order.setOrderNumber("ORD-123");
        ex = assertThrows(IllegalArgumentException.class, 
            () -> orderService.pushOrder(order, buyer, "WH-1", 10.0, 10.0, 10.0));
        assertTrue(ex.getMessage().contains("consignee_name is required"));
    }

    @Test
    void testPushOrder_ValidationFailure_InvalidDimensionsOrWeight() {
        Order order = new Order();
        order.setOrderNumber("ORD-123");
        order.setBillableWeight(0);
        
        Address buyer = new Address();
        buyer.setContactName("John Doe");
        buyer.setPhone("9876543210");
        buyer.setAddressLine1("123 Main St");
        buyer.setPincode("110001");
        buyer.setCity("New Delhi");
        buyer.setState("Delhi");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> orderService.pushOrder(order, buyer, "WH-1", 10.0, 10.0, 10.0));
        assertTrue(ex.getMessage().contains("weight must be greater than 0"));

        order.setBillableWeight(1.0);
        ex = assertThrows(IllegalArgumentException.class, 
            () -> orderService.pushOrder(order, buyer, "WH-1", 0, 10.0, 10.0));
        assertTrue(ex.getMessage().contains("dimensions (length, width, height) must be greater than 0"));
    }
}
