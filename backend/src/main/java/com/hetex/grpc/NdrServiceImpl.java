package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.ActOnNdrRequest;
import com.hetex.grpc.proto.ListNdrResponse;
import com.hetex.grpc.proto.NdrRow;
import com.hetex.grpc.proto.NdrServiceGrpc;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

@GrpcService
public class NdrServiceImpl extends NdrServiceGrpc.NdrServiceImplBase {

    private final NdrRecordRepository ndrRecordRepository;
    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final AddressRepository addressRepository;
    private final CourierRepository courierRepository;
    private final TrackingEventRepository trackingEventRepository;

    public NdrServiceImpl(
        NdrRecordRepository ndrRecordRepository, ShipmentRepository shipmentRepository, OrderRepository orderRepository,
        AddressRepository addressRepository, CourierRepository courierRepository, TrackingEventRepository trackingEventRepository
    ) {
        this.ndrRecordRepository = ndrRecordRepository;
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.addressRepository = addressRepository;
        this.courierRepository = courierRepository;
        this.trackingEventRepository = trackingEventRepository;
    }

    @Override
    public void listNdr(Empty request, StreamObserver<ListNdrResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        ListNdrResponse.Builder builder = ListNdrResponse.newBuilder();
        for (Order order : orderRepository.findByUserIdOrderByCreatedAtDesc(session.userId())) {
            shipmentRepository.findByOrderId(order.getId()).ifPresent(shipment -> {
                for (NdrRecord ndr : ndrRecordRepository.findByShipmentIdOrderByCreatedAtDesc(shipment.getId())) {
                    Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
                    Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
                    builder.addRecords(NdrRow.newBuilder()
                        .setId(ndr.getId())
                        .setReason(ndr.getReason())
                        .setAttemptNumber(ndr.getAttemptNumber())
                        .setAction(ndr.getAction().name())
                        .setNotes(ndr.getNotes() == null ? "" : ndr.getNotes())
                        .setShipmentAwb(shipment.getAwbNumber())
                        .setCourierName(courier.getName())
                        .setOrderNumber(order.getOrderNumber())
                        .setBuyerContactName(buyer.getContactName())
                        .setBuyerCity(buyer.getCity())
                        .build());
                }
            });
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void actOnNdr(ActOnNdrRequest request, StreamObserver<Empty> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        NdrRecord record = ndrRecordRepository.findById(request.getNdrId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        Shipment shipment = shipmentRepository.findById(record.getShipmentId()).orElseThrow();
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        if (!order.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }

        NdrAction action = NdrAction.valueOf(request.getAction());
        record.setAction(action);
        record.setNotes(request.getNotes());
        ndrRecordRepository.save(record);

        ShipmentStatus newStatus = action == NdrAction.REATTEMPT ? ShipmentStatus.OUT_FOR_DELIVERY : ShipmentStatus.RTO_INITIATED;
        shipment.setStatus(newStatus);
        shipmentRepository.save(shipment);

        TrackingEvent event = new TrackingEvent();
        event.setShipmentId(shipment.getId());
        event.setStatus(newStatus);
        event.setDescription(action == NdrAction.REATTEMPT ? "Reattempt scheduled by seller" : "RTO initiated by seller");
        event.setLocation(shipment.getCurrentLocation());
        trackingEventRepository.save(event);

        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }
}
