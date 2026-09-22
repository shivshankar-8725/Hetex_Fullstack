package com.hetex.service.courier;

import com.hetex.entity.PaymentMode;
import com.hetex.entity.ShipmentStatus;

/**
 * Every real courier (Delhivery, Ekart, Xpressbees, BlueDart, DTDC, ...) implements this
 * same interface. Swap in a `Live<Name>CourierAdapter` and select it in CourierRegistry —
 * nothing upstream (rate engine, booking flow, tracking) needs to change.
 */
public interface CourierAdapter {
    ServiceabilityResult checkServiceability(String fromPincode, String toPincode);
    RateResult getRate(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode);
    ShipmentCreationResult createShipment(String fromPincode, String toPincode, double billableWeight, PaymentMode paymentMode);
    TrackingUpdate nextTrackingUpdate(ShipmentStatus currentStatus);
}
