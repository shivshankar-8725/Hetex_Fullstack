package com.hetex.service.courier;

import com.hetex.entity.Courier;
import com.hetex.entity.PaymentMode;
import com.hetex.entity.ShipmentStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * One generic mock implementation parameterized by the courier's seeded config row.
 * A real integration is added by writing a `Live<Code>CourierAdapter` with the same
 * CourierAdapter shape and selecting it in CourierRegistry — no other code changes.
 */
public class MockCourierAdapter implements CourierAdapter {

    private static final Set<String> UNSERVICEABLE_PINCODE_PREFIXES = Set.of("19", "79");

    private final Courier courier;

    public MockCourierAdapter(Courier courier) {
        this.courier = courier;
    }

    private int zoneDistance(String fromPincode, String toPincode) {
        if (fromPincode.substring(0, 2).equals(toPincode.substring(0, 2))) return 1; // same zone
        return 1 + Math.abs(fromPincode.charAt(0) - toPincode.charAt(0));
    }

    @Override
    public ServiceabilityResult checkServiceability(String fromPincode, String toPincode) {
        boolean dead = UNSERVICEABLE_PINCODE_PREFIXES.stream()
            .anyMatch(p -> toPincode.startsWith(p) || fromPincode.startsWith(p));
        int zones = zoneDistance(fromPincode, toPincode);
        int estimatedDays = courier.getEtaMinDays() + Math.min(zones - 1, courier.getEtaMaxDays() - courier.getEtaMinDays());
        return new ServiceabilityResult(!dead, !dead && zones <= 4, estimatedDays);
    }

    @Override
    public RateResult getRate(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode) {
        int zones = zoneDistance(fromPincode, toPincode);
        double zoneMultiplier = 1 + (zones - 1) * 0.18;
        double freightCharge = round(courier.getBaseRatePerKg() * billableWeight * zoneMultiplier);
        double codCharge = paymentMode == PaymentMode.COD
            ? round(courier.getCodChargeFlat() + (freightCharge * courier.getCodChargePercent()) / 100)
            : 0;
        return new RateResult(freightCharge, codCharge);
    }

    @Override
    public ShipmentCreationResult createShipment(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode) {
        String awbNumber = courier.getCode() + (System.currentTimeMillis() % 100_000_000L) + ThreadLocalRandom.current().nextInt(100, 999);
        Instant pickupScheduledFor = Instant.now().plus(1, ChronoUnit.DAYS);
        return new ShipmentCreationResult(awbNumber, true, pickupScheduledFor);
    }

    @Override
    public TrackingUpdate nextTrackingUpdate(ShipmentStatus currentStatus) {
        return switch (currentStatus) {
            case READY_TO_SHIP -> new TrackingUpdate(ShipmentStatus.MANIFESTED, "Shipment manifested with courier", "Origin Hub");
            case MANIFESTED -> new TrackingUpdate(ShipmentStatus.PICKUP_SCHEDULED, "Pickup scheduled from seller warehouse", "Origin Hub");
            case PICKUP_SCHEDULED -> new TrackingUpdate(ShipmentStatus.IN_TRANSIT, "Shipment picked up and in transit", courier.getName() + " Sort Facility");
            case IN_TRANSIT -> new TrackingUpdate(ShipmentStatus.OUT_FOR_DELIVERY, "Out for delivery", "Destination Hub");
            case OUT_FOR_DELIVERY -> new TrackingUpdate(ShipmentStatus.DELIVERED, "Delivered to consignee", "Destination");
            default -> null;
        };
    }

    private double round(double value) {
        return Math.round(value * 100) / 100.0;
    }

    public static final List<String> NDR_REASONS = List.of(
        "Customer not available", "Address not found", "Customer refused delivery", "COD amount not ready"
    );
}
