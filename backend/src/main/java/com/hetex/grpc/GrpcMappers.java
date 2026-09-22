package com.hetex.grpc;

import com.hetex.entity.*;
import com.hetex.grpc.proto.*;
import com.hetex.repository.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** Shared entity-to-proto conversions used by OrderService and ShipmentService. */
@Component
public class GrpcMappers {

    private final CourierRepository courierRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final NdrRecordRepository ndrRecordRepository;
    private final CodRemittanceRepository codRemittanceRepository;

    public GrpcMappers(
        CourierRepository courierRepository, TrackingEventRepository trackingEventRepository,
        NdrRecordRepository ndrRecordRepository, CodRemittanceRepository codRemittanceRepository
    ) {
        this.courierRepository = courierRepository;
        this.trackingEventRepository = trackingEventRepository;
        this.ndrRecordRepository = ndrRecordRepository;
        this.codRemittanceRepository = codRemittanceRepository;
    }

    public CourierMsg courierToMsg(Courier c) {
        return CourierMsg.newBuilder()
            .setId(c.getId())
            .setName(c.getName())
            .setCode(c.getCode())
            .setLogoColor(c.getLogoColor())
            .setActive(c.isActive())
            .setBaseRatePerKg(c.getBaseRatePerKg())
            .setRating(c.getRating())
            .setEtaMinDays(c.getEtaMinDays())
            .setEtaMaxDays(c.getEtaMaxDays())
            .setRtoRiskPercent(c.getRtoRiskPercent())
            .build();
    }

    public TrackingEventMsg eventToMsg(TrackingEvent e) {
        return TrackingEventMsg.newBuilder()
            .setId(e.getId())
            .setStatus(e.getStatus().name())
            .setDescription(e.getDescription())
            .setLocation(e.getLocation())
            .setTimestamp(e.getTimestamp().toString())
            .build();
    }

    public NdrRecordMsg ndrToMsg(NdrRecord n) {
        return NdrRecordMsg.newBuilder()
            .setId(n.getId())
            .setShipmentId(n.getShipmentId())
            .setAttemptNumber(n.getAttemptNumber())
            .setReason(n.getReason())
            .setAction(n.getAction().name())
            .setNotes(n.getNotes() == null ? "" : n.getNotes())
            .setCreatedAt(n.getCreatedAt().toString())
            .build();
    }

    public CodRemittanceMsg codToMsg(CodRemittance c) {
        return CodRemittanceMsg.newBuilder()
            .setId(c.getId())
            .setShipmentId(c.getShipmentId())
            .setAmount(c.getAmount())
            .setStatus(c.getStatus().name())
            .setSettledAt(c.getSettledAt() == null ? "" : c.getSettledAt().toString())
            .build();
    }

    public ShipmentMsg shipmentToMsg(Shipment s) {
        Courier courier = courierRepository.findById(s.getCourierId()).orElseThrow();
        ShipmentMsg.Builder builder = ShipmentMsg.newBuilder()
            .setId(s.getId())
            .setOrderId(s.getOrderId())
            .setCourier(courierToMsg(courier))
            .setAwbNumber(s.getAwbNumber())
            .setRateCharged(s.getRateCharged())
            .setMarginEarned(s.getMarginEarned())
            .setStatus(s.getStatus().name())
            .setCurrentLocation(s.getCurrentLocation());

        trackingEventRepository.findByShipmentIdOrderByTimestampAsc(s.getId()).forEach(e -> builder.addTrackingEvents(eventToMsg(e)));
        ndrRecordRepository.findByShipmentIdOrderByCreatedAtDesc(s.getId()).forEach(n -> builder.addNdrRecords(ndrToMsg(n)));

        Optional<CodRemittance> cod = codRemittanceRepository.findByShipmentId(s.getId());
        cod.ifPresent(c -> builder.setCodRemittance(codToMsg(c)).setHasCodRemittance(true));

        return builder.build();
    }

    public AddressMsg addressToMsg(Address a) {
        return AddressServiceImpl.toMsg(a);
    }
}
