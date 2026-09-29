package com.hetex.service.courier;

import com.hetex.entity.Courier;
import com.hetex.entity.PaymentMode;
import com.hetex.entity.ShipmentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DelhiveryCourierAdapterTest {

    private Courier courier;
    private DelhiveryCourierAdapter adapter;

    @BeforeEach
    void setUp() {
        courier = new Courier();
        courier.setId("c_delhivery");
        courier.setName("Delhivery");
        courier.setCode("DLV");
        courier.setActive(true);
        courier.setBaseRatePerKg(45.0);

        adapter = new DelhiveryCourierAdapter(courier, "mock-token", "https://track.delhivery.com", "HETEX");
    }

    @Test
    @DisplayName("Serviceability check returns result for valid pincodes")
    void testServiceability() {
        ServiceabilityResult result = adapter.checkServiceability("110001", "400001");
        assertNotNull(result);
        assertTrue(result.serviceable());
        assertTrue(result.codAvailable());
    }

    @Test
    @DisplayName("Rate calculation calculates freight based on weight")
    void testGetRatePrepaid() {
        RateResult result = adapter.getRate("110001", "400001", 2.0, PaymentMode.PREPAID);
        assertNotNull(result);
        assertTrue(result.freightCharge() > 0);
        assertEquals(0.0, result.codCharge(), "Prepaid should have 0 COD charge");
    }

    @Test
    @DisplayName("Rate calculation includes COD charge for COD payment mode")
    void testGetRateCod() {
        RateResult result = adapter.getRate("110001", "400001", 2.0, PaymentMode.COD);
        assertNotNull(result);
        assertTrue(result.freightCharge() > 0);
        assertTrue(result.codCharge() > 0, "COD should have COD charge");
    }

    @Test
    @DisplayName("Shipment creation generates valid AWB in fallback/mock mode")
    void testCreateShipment() {
        ShipmentCreationResult result = adapter.createShipment("110001", "400001", 1.5, PaymentMode.PREPAID);
        assertNotNull(result);
        assertNotNull(result.awbNumber());
        assertTrue(result.awbNumber().startsWith("DLV"));
    }

    @Test
    @DisplayName("Tracking update transitions correctly through lifecycle")
    void testNextTrackingUpdate() {
        TrackingUpdate update = adapter.nextTrackingUpdate(ShipmentStatus.READY_TO_SHIP);
        assertNotNull(update);
        assertNotNull(update.status());
        assertNotNull(update.location());
    }
}
