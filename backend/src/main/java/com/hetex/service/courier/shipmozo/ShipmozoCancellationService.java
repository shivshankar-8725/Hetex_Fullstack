package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCancelOrderRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoCancelOrderResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoCancellationService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoCancellationService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoCancellationService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoCancelOrderResponse cancelOrder(String orderId, String awbNumber) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required to cancel an order");
        }
        if (awbNumber == null || awbNumber.isBlank()) {
            throw new IllegalArgumentException("awb_number is required to cancel an order");
        }

        ShipmozoCancelOrderRequest request = new ShipmozoCancelOrderRequest(orderId, awbNumber);
        log.info("Cancelling order: {} with AWB: {}", orderId, awbNumber);

        ShipmozoResponse<ShipmozoCancelOrderResponse> response = apiClient.post(
            "/cancel-order",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoCancelOrderResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Cancellation returned empty data for order " + orderId);
        }

        return response.data();
    }
}
