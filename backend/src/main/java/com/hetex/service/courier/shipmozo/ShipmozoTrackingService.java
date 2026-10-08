package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoTrackingResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoTrackingService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoTrackingService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoTrackingService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoTrackingResponse trackOrder(String awbNumber) {
        if (awbNumber == null || awbNumber.isBlank()) {
            throw new IllegalArgumentException("awb_number is required for tracking");
        }

        log.info("Tracking AWB: {}", awbNumber);
        
        String endpoint = "/track-order?awb_number=" + awbNumber;
        
        ShipmozoResponse<ShipmozoTrackingResponse> response = apiClient.get(
            endpoint,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoTrackingResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Tracking API returned empty data for AWB " + awbNumber);
        }

        return response.data();
    }
}
