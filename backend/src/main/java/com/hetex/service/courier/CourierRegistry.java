package com.hetex.service.courier;

import com.hetex.entity.Courier;
import com.hetex.repository.CourierRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CourierRegistry {

    private final CourierRepository courierRepository;

    @Value("${hetex.delhivery.token:mock-delhivery-token}")
    private String delhiveryToken;

    @Value("${hetex.delhivery.base-url:https://track.delhivery.com}")
    private String delhiveryBaseUrl;

    @Value("${hetex.delhivery.client-name:HETEX}")
    private String delhiveryClientName;

    public CourierRegistry(CourierRepository courierRepository) {
        this.courierRepository = courierRepository;
    }

    public record ActiveAdapter(Courier courier, CourierAdapter adapter) {}

    public List<ActiveAdapter> getActiveAdapters() {
        return courierRepository.findByActiveTrue().stream()
            .map(c -> new ActiveAdapter(c, getAdapter(c)))
            .toList();
    }

    public CourierAdapter getAdapter(Courier courier) {
        if ("DLV".equalsIgnoreCase(courier.getCode()) || "Delhivery".equalsIgnoreCase(courier.getName())) {
            return new DelhiveryCourierAdapter(courier, delhiveryToken, delhiveryBaseUrl, delhiveryClientName);
        }
        return new MockCourierAdapter(courier);
    }
}
