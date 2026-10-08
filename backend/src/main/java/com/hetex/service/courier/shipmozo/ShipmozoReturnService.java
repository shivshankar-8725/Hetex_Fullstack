package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoPushOrderResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPushReturnOrderRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoReturnReason;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShipmozoReturnService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoReturnService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoReturnService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public List<ShipmozoReturnReason> getReturnReasons() {
        log.info("Fetching Shipmozo return reasons");
        ShipmozoResponse<List<ShipmozoReturnReason>> response = apiClient.get(
            "/get-return-reason",
            new ParameterizedTypeReference<ShipmozoResponse<List<ShipmozoReturnReason>>>() {}
        );

        return response.data() != null ? response.data() : List.of();
    }

    public ShipmozoPushOrderResponse pushReturnOrder(ShipmozoPushReturnOrderRequest request) {
        validateReturnRequest(request);

        // Validate reason id exists
        boolean validReason = getReturnReasons().stream()
                .anyMatch(r -> r.id().equals(request.returnReasonId()));
        
        if (!validReason) {
            throw new IllegalArgumentException("Invalid return_reason_id: " + request.returnReasonId());
        }

        log.info("Pushing return order for original order {}", request.orderId());

        ShipmozoResponse<ShipmozoPushOrderResponse> response = apiClient.post(
            "/push-return-order",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoPushOrderResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Push return order returned empty data for order " + request.orderId());
        }

        return response.data();
    }

    private void validateReturnRequest(ShipmozoPushReturnOrderRequest request) {
        if (request == null) throw new IllegalArgumentException("Request cannot be null");
        if (request.orderId() == null || request.orderId().isBlank()) throw new IllegalArgumentException("order_id is required");
        if (request.returnReasonId() == null || request.returnReasonId().isBlank()) throw new IllegalArgumentException("return_reason_id is required");
        if (request.pickupName() == null || request.pickupName().isBlank()) throw new IllegalArgumentException("pickup_name is required");
        if (request.pickupPhone() == null || request.pickupPhone().isBlank()) throw new IllegalArgumentException("pickup_phone is required");
        if (request.pickupAddressLineOne() == null || request.pickupAddressLineOne().isBlank()) throw new IllegalArgumentException("pickup_address_line_one is required");
        if (request.pickupPinCode() == null || request.pickupPinCode().isBlank()) throw new IllegalArgumentException("pickup_pin_code is required");
        if (request.pickupCity() == null || request.pickupCity().isBlank()) throw new IllegalArgumentException("pickup_city is required");
        if (request.pickupState() == null || request.pickupState().isBlank()) throw new IllegalArgumentException("pickup_state is required");
        if (request.weight() <= 0) throw new IllegalArgumentException("weight must be greater than 0");
    }
}
