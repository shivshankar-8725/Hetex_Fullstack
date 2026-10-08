package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoPickupRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPickupResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoPickupService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoPickupService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoPickupService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoPickupResponse schedulePickup(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required to schedule pickup");
        }

        ShipmozoPickupRequest request = new ShipmozoPickupRequest(orderId);
        log.info("Scheduling pickup for order {}", orderId);

        ShipmozoResponse<ShipmozoPickupResponse> response = apiClient.post(
            "/schedule-pickup",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoPickupResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Schedule pickup returned empty data for order " + orderId);
        }

        return response.data();
    }
}
