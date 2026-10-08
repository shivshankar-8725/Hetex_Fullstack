package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoOrderDetailResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoOrderDetailService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoOrderDetailService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoOrderDetailService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoOrderDetailResponse getOrderDetail(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required to fetch details");
        }

        log.info("Fetching details for order: {}", orderId);
        
        String endpoint = "/get-order-detail/" + orderId;
        
        ShipmozoResponse<ShipmozoOrderDetailResponse> response = apiClient.get(
            endpoint,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoOrderDetailResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Order detail API returned empty data for order " + orderId);
        }

        return response.data();
    }
}
