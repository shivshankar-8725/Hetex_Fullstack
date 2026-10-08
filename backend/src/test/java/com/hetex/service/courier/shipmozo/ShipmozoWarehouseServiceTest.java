package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCreateWarehouseRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoWarehouse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShipmozoWarehouseServiceTest {

    @Mock
    private ShipmozoApiClient apiClient;

    private ShipmozoWarehouseService warehouseService;

    @BeforeEach
    void setUp() {
        warehouseService = new ShipmozoWarehouseService(apiClient);
    }

    @Test
    void testGetWarehouses() {
        ShipmozoWarehouse w1 = new ShipmozoWarehouse("1", "Main WH", null, null, null, null, null, null, null, null, null, null, null, null);
        ShipmozoResponse<List<ShipmozoWarehouse>> mockResponse = new ShipmozoResponse<>("1", "Success", List.of(w1));

        when(apiClient.get(eq("/get-warehouses"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        List<ShipmozoWarehouse> result = warehouseService.getWarehouses();
        assertEquals(1, result.size());
        assertEquals("Main WH", result.get(0).address_title());
    }

    @Test
    void testFindWarehouseByAddressTitle_Found() {
        ShipmozoWarehouse w1 = new ShipmozoWarehouse("1", "Main WH", null, null, null, null, null, null, null, null, null, null, null, null);
        ShipmozoResponse<List<ShipmozoWarehouse>> mockResponse = new ShipmozoResponse<>("1", "Success", List.of(w1));

        when(apiClient.get(eq("/get-warehouses"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        Optional<ShipmozoWarehouse> result = warehouseService.findWarehouseByAddressTitle("main wh");
        assertTrue(result.isPresent());
        assertEquals("1", result.get().id());
    }

    @Test
    void testCreateWarehouse_ValidationFailure() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, 
            () -> warehouseService.createWarehouse(new ShipmozoCreateWarehouseRequest(null, "123456", null, null, null, null, null)));
        assertTrue(ex.getMessage().contains("address_title is required"));

        ex = assertThrows(IllegalArgumentException.class, 
            () -> warehouseService.createWarehouse(new ShipmozoCreateWarehouseRequest("Title", null, null, null, null, null, null)));
        assertTrue(ex.getMessage().contains("pin_code is required"));
    }

    @Test
    void testCreateWarehouse_AlreadyExists() {
        ShipmozoWarehouse existing = new ShipmozoWarehouse("1", "Main WH", null, null, null, null, null, null, null, null, null, null, null, null);
        ShipmozoResponse<List<ShipmozoWarehouse>> mockResponse = new ShipmozoResponse<>("1", "Success", List.of(existing));

        when(apiClient.get(eq("/get-warehouses"), any(ParameterizedTypeReference.class)))
                .thenReturn(mockResponse);

        ShipmozoCreateWarehouseRequest req = new ShipmozoCreateWarehouseRequest("Main WH", "123456", null, null, null, null, null);
        ShipmozoWarehouse result = warehouseService.createWarehouse(req);

        assertEquals("1", result.id());
        verify(apiClient, never()).post(anyString(), any(), any());
    }

    @Test
    void testCreateWarehouse_NewWarehouse() {
        // Mock getWarehouses to return empty
        ShipmozoResponse<List<ShipmozoWarehouse>> emptyListResponse = new ShipmozoResponse<>("1", "Success", List.of());
        when(apiClient.get(eq("/get-warehouses"), any(ParameterizedTypeReference.class)))
                .thenReturn(emptyListResponse);

        ShipmozoWarehouse created = new ShipmozoWarehouse("2", "New WH", null, null, null, null, null, null, null, null, null, null, null, null);
        ShipmozoResponse<ShipmozoWarehouse> createResponse = new ShipmozoResponse<>("1", "Success", created);

        when(apiClient.post(eq("/create-warehouse"), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(createResponse);

        ShipmozoCreateWarehouseRequest req = new ShipmozoCreateWarehouseRequest("New WH", "123456", null, null, null, null, null);
        ShipmozoWarehouse result = warehouseService.createWarehouse(req);

        assertEquals("2", result.id());
        verify(apiClient).post(eq("/create-warehouse"), eq(req), any(ParameterizedTypeReference.class));
    }
}
