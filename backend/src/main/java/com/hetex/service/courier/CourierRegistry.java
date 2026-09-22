package com.hetex.service.courier;

import com.hetex.entity.Courier;
import com.hetex.repository.CourierRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CourierRegistry {

    private final CourierRepository courierRepository;

    public CourierRegistry(CourierRepository courierRepository) {
        this.courierRepository = courierRepository;
    }

    public record ActiveAdapter(Courier courier, CourierAdapter adapter) {}

    public List<ActiveAdapter> getActiveAdapters() {
        return courierRepository.findByActiveTrue().stream()
            .map(c -> new ActiveAdapter(c, new MockCourierAdapter(c)))
            .toList();
    }

    public CourierAdapter getAdapter(Courier courier) {
        return new MockCourierAdapter(courier);
    }
}
