package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCourierRate;
import com.hetex.service.courier.shipmozo.dto.ShipmozoDimension;
import com.hetex.service.courier.shipmozo.dto.ShipmozoRateCalculatorRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShipmozoRateService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoRateService.class);

    private final ShipmozoApiClient apiClient;

    public ShipmozoRateService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public List<ShipmozoCourierRate> calculateRateForNewShipment(
            String pickupPincode,
            String deliveryPincode,
            String paymentType,
            double orderAmount,
            double weight,
            double length,
            double width,
            double height,
            Double codAmount,
            String packageType) {
        
        validateRateRequest(pickupPincode, deliveryPincode, weight, length, width, height);

        ShipmozoDimension dim = new ShipmozoDimension("1", String.valueOf(length), String.valueOf(width), String.valueOf(height));

        ShipmozoRateCalculatorRequest request = new ShipmozoRateCalculatorRequest(
            pickupPincode,
            deliveryPincode,
            paymentType,
            "Forward", // Assuming Forward shipment by default
            orderAmount,
            packageType != null && !packageType.isBlank() ? packageType : "Document",
            "No", // Default rov_type
            weight,
            List.of(dim),
            null, // no order_id for new shipment
            codAmount
        );

        return fetchRates(request);
    }

    public List<ShipmozoCourierRate> calculateRateForExistingOrder(
            String orderId,
            String pickupPincode,
            String deliveryPincode,
            String paymentType,
            double orderAmount,
            double weight,
            double length,
            double width,
            double height,
            Double codAmount,
            String packageType) {
        
        validateRateRequest(pickupPincode, deliveryPincode, weight, length, width, height);
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("order_id is required for existing order rate calculation");
        }

        ShipmozoDimension dim = new ShipmozoDimension("1", String.valueOf(length), String.valueOf(width), String.valueOf(height));

        ShipmozoRateCalculatorRequest request = new ShipmozoRateCalculatorRequest(
            pickupPincode,
            deliveryPincode,
            paymentType,
            "Forward",
            orderAmount,
            packageType != null && !packageType.isBlank() ? packageType : "Box",
            "No",
            weight,
            List.of(dim),
            orderId,
            codAmount
        );

        return fetchRates(request);
    }

    private List<ShipmozoCourierRate> fetchRates(ShipmozoRateCalculatorRequest request) {
        log.info("Calculating rates for {} to {} (weight: {})", request.pickupPincode(), request.deliveryPincode(), request.weight());

        ShipmozoResponse<List<ShipmozoCourierRate>> response = apiClient.post(
            "/rate-calculator",
            request,
            new ParameterizedTypeReference<ShipmozoResponse<List<ShipmozoCourierRate>>>() {}
        );

        return response.data() != null ? response.data() : List.of();
    }

    private void validateRateRequest(String pickupPincode, String deliveryPincode, double weight, double length, double width, double height) {
        if (pickupPincode == null || pickupPincode.isBlank()) {
            throw new IllegalArgumentException("pickup_pincode is required");
        }
        if (deliveryPincode == null || deliveryPincode.isBlank()) {
            throw new IllegalArgumentException("delivery_pincode is required");
        }
        if (weight <= 0) {
            throw new IllegalArgumentException("weight must be greater than 0");
        }
        if (length <= 0 || width <= 0 || height <= 0) {
            throw new IllegalArgumentException("dimensions must be greater than 0");
        }
    }
}
