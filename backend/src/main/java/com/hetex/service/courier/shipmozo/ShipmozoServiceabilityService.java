package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoServiceabilityRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoServiceabilityResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

@Service
public class ShipmozoServiceabilityService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoServiceabilityService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoServiceabilityService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public boolean checkServiceability(String pickupPincode, String deliveryPincode) {
        if (pickupPincode == null || pickupPincode.isBlank()) {
            throw new IllegalArgumentException("pickup_pincode is required to check serviceability");
        }
        if (deliveryPincode == null || deliveryPincode.isBlank()) {
            throw new IllegalArgumentException("delivery_pincode is required to check serviceability");
        }

        ShipmozoServiceabilityRequest request = new ShipmozoServiceabilityRequest(pickupPincode, deliveryPincode);
        log.info("Checking serviceability between {} and {}", pickupPincode, deliveryPincode);

        try {
            ShipmozoResponse<ShipmozoServiceabilityResponse> response = apiClient.post(
                "/pincode-serviceability",
                request,
                new ParameterizedTypeReference<ShipmozoResponse<ShipmozoServiceabilityResponse>>() {}
            );

            if (response.data() != null) {
                return response.data().serviceable();
            }
            return false;
        } catch (Exception e) {
            log.warn("Serviceability check failed: {}", e.getMessage());
            return false;
        }
    }
}
