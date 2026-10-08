package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoAssignCourierRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoAssignCourierResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoAutoAssignRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoAssignmentService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoAssignmentService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoAssignmentService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoAssignCourierResponse assignCourier(String orderId, Integer courierId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required for assignment");
        }
        if (courierId == null) {
            throw new IllegalArgumentException("courier_id is required for manual assignment");
        }

        ShipmozoAssignCourierRequest request = new ShipmozoAssignCourierRequest(orderId, courierId);
        log.info("Assigning courier {} manually to order {}", courierId, orderId);

        ShipmozoResponse<ShipmozoAssignCourierResponse> response = apiClient.post(
            "/assign-courier",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoAssignCourierResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Manual assignment returned empty data for order " + orderId);
        }
        
        return response.data();
    }

    public ShipmozoAssignCourierResponse autoAssignCourier(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required for assignment");
        }

        ShipmozoAutoAssignRequest request = new ShipmozoAutoAssignRequest(orderId);
        log.info("Auto-assigning courier to order {}", orderId);

        try {
            ShipmozoResponse<ShipmozoAssignCourierResponse> response = apiClient.post(
                "/auto-assign-order",
                request,
                new ParameterizedTypeReference<ShipmozoResponse<ShipmozoAssignCourierResponse>>() {}
            );

            if (response.data() == null) {
                throw new ShipmozoException("Auto assignment returned empty data for order " + orderId);
            }
            
            return response.data();
        } catch (ShipmozoException e) {
            if (e.getMessage() != null && e.getMessage().toLowerCase().contains("please setup auto assign")) {
                throw new ShipmozoException("Auto assignment is not configured in the Shipmozo panel. Please set it up or use manual assignment.", e);
            }
            throw e;
        }
    }
}
