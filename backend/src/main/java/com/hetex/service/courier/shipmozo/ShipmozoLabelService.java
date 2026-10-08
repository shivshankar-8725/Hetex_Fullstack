package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoLabelResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoLabelService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoLabelService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoLabelService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoLabelResponse getOrderLabel(String awbNumber) {
        if (awbNumber == null || awbNumber.isBlank()) {
            throw new IllegalArgumentException("awb_number is required to fetch label");
        }

        log.info("Fetching label for AWB: {}", awbNumber);
        
        String endpoint = "/get-order-label/" + awbNumber;
        
        ShipmozoResponse<ShipmozoLabelResponse> response = apiClient.get(
            endpoint,
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoLabelResponse>>() {}
        );

        if (response.data() == null || response.data().label() == null) {
            throw new ShipmozoException("Label API returned empty data for AWB " + awbNumber);
        }

        return response.data();
    }
}
