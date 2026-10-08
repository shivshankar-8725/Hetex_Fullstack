package com.hetex.service.courier.shipmozo;

import com.hetex.service.courier.shipmozo.dto.ShipmozoCreateWarehouseRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoWarehouse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ShipmozoWarehouseService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoWarehouseService.class);
    
    private final ShipmozoApiClient apiClient;

    public ShipmozoWarehouseService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public List<ShipmozoWarehouse> getWarehouses() {
        log.info("Fetching Shipmozo warehouses");
        ShipmozoResponse<List<ShipmozoWarehouse>> response = apiClient.get("/get-warehouses", new ParameterizedTypeReference<ShipmozoResponse<List<ShipmozoWarehouse>>>() {});
        return response.data() != null ? response.data() : List.of();
    }

    public Optional<ShipmozoWarehouse> findWarehouseByAddressTitle(String addressTitle) {
        if (addressTitle == null || addressTitle.isBlank()) {
            return Optional.empty();
        }
        return getWarehouses().stream()
                .filter(w -> addressTitle.equalsIgnoreCase(w.address_title()))
                .findFirst();
    }

    public ShipmozoWarehouse createWarehouse(ShipmozoCreateWarehouseRequest request) {
        validateCreateWarehouseRequest(request);

        // Avoid duplicate creation by finding existing one first
        Optional<ShipmozoWarehouse> existing = findWarehouseByAddressTitle(request.addressTitle());
        if (existing.isPresent()) {
            log.info("Warehouse with title '{}' already exists, reusing ID: {}", request.addressTitle(), existing.get().id());
            return existing.get();
        }

        log.info("Creating new Shipmozo warehouse with title '{}'", request.addressTitle());
        // We assume the response data might be a single warehouse or just a success message.
        // We will return the response data if it returns the created warehouse,
        // otherwise we will fetch the list and find it.
        ShipmozoResponse<ShipmozoWarehouse> response = apiClient.post(
            "/create-warehouse", 
            request, 
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoWarehouse>>() {}
        );
        
        // If API returns the created object, return it.
        if (response.data() != null && response.data().id() != null) {
            return response.data();
        }

        // If it just returns success without the object, fetch it again.
        Optional<ShipmozoWarehouse> newlyCreated = findWarehouseByAddressTitle(request.addressTitle());
        return newlyCreated.orElseThrow(() -> new ShipmozoException("Warehouse creation succeeded but could not retrieve the created warehouse ID"));
    }

    private void validateCreateWarehouseRequest(ShipmozoCreateWarehouseRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Warehouse request cannot be null");
        }
        if (request.addressTitle() == null || request.addressTitle().isBlank()) {
            throw new IllegalArgumentException("address_title is required to create a warehouse");
        }
        if (request.pinCode() == null || request.pinCode().isBlank()) {
            throw new IllegalArgumentException("pin_code is required to create a warehouse");
        }
    }
}
