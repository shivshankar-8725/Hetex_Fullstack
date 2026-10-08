package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoUpdateWarehouseRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoUpdateWarehouseResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoWarehouseUpdateService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoWarehouseUpdateService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoWarehouseUpdateService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoUpdateWarehouseResponse updateOrderWarehouse(String orderId, String warehouseId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required to update warehouse");
        }
        if (warehouseId == null || warehouseId.isBlank()) {
            throw new IllegalArgumentException("warehouse_id is required to update warehouse");
        }

        ShipmozoUpdateWarehouseRequest request = new ShipmozoUpdateWarehouseRequest(orderId, warehouseId);
        log.info("Updating warehouse for order {} to {}", orderId, warehouseId);

        ShipmozoResponse<ShipmozoUpdateWarehouseResponse> response = apiClient.post(
            "/order/update-warehouse",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoUpdateWarehouseResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Update warehouse returned empty data for order " + orderId);
        }

        return response.data();
    }
}
