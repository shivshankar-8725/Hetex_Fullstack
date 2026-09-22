package com.hetex.grpc;

import com.google.protobuf.ByteString;
import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.ListWeightDisputesResponse;
import com.hetex.grpc.proto.PdfResponse;
import com.hetex.grpc.proto.RespondToWeightDisputeRequest;
import com.hetex.grpc.proto.ShipmentIdRequest;
import com.hetex.grpc.proto.ShipmentMsg;
import com.hetex.grpc.proto.ShipmentServiceGrpc;
import com.hetex.grpc.proto.SimulateTrackingRequest;
import com.hetex.grpc.proto.TrackPublicRequest;
import com.hetex.grpc.proto.TrackPublicResponse;
import com.hetex.grpc.proto.WebhookRequest;
import com.hetex.grpc.proto.WeightDisputeMsg;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import com.hetex.service.NotifyService;
import com.hetex.service.PdfService;
import com.hetex.service.courier.CourierAdapter;
import com.hetex.service.courier.CourierRegistry;
import com.hetex.service.courier.MockCourierAdapter;
import com.hetex.service.courier.TrackingUpdate;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;

@GrpcService
public class ShipmentServiceImpl extends ShipmentServiceGrpc.ShipmentServiceImplBase {

    private static final Set<ShipmentStatus> FINAL_STATUSES = Set.of(ShipmentStatus.DELIVERED, ShipmentStatus.RTO_DELIVERED, ShipmentStatus.CANCELLED);
    private final SecureRandom random = new SecureRandom();

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final AddressRepository addressRepository;
    private final CourierRepository courierRepository;
    private final UserRepository userRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final NdrRecordRepository ndrRecordRepository;
    private final CodRemittanceRepository codRemittanceRepository;
    private final TrackingPageConfigRepository trackingPageConfigRepository;
    private final CourierRegistry courierRegistry;
    private final NotifyService notifyService;
    private final PdfService pdfService;
    private final GrpcMappers mappers;
    private final WeightDisputeRepository weightDisputeRepository;

    public ShipmentServiceImpl(
        ShipmentRepository shipmentRepository, OrderRepository orderRepository, AddressRepository addressRepository,
        CourierRepository courierRepository, UserRepository userRepository, TrackingEventRepository trackingEventRepository,
        NdrRecordRepository ndrRecordRepository, CodRemittanceRepository codRemittanceRepository,
        TrackingPageConfigRepository trackingPageConfigRepository, CourierRegistry courierRegistry,
        NotifyService notifyService, PdfService pdfService, GrpcMappers mappers, WeightDisputeRepository weightDisputeRepository
    ) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.addressRepository = addressRepository;
        this.courierRepository = courierRepository;
        this.userRepository = userRepository;
        this.trackingEventRepository = trackingEventRepository;
        this.ndrRecordRepository = ndrRecordRepository;
        this.codRemittanceRepository = codRemittanceRepository;
        this.trackingPageConfigRepository = trackingPageConfigRepository;
        this.courierRegistry = courierRegistry;
        this.notifyService = notifyService;
        this.pdfService = pdfService;
        this.weightDisputeRepository = weightDisputeRepository;
        this.mappers = mappers;
    }

    private Shipment loadOwnedShipment(String shipmentId, JwtService.SessionPayload session) {
        Shipment shipment = shipmentRepository.findById(shipmentId).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        if (!order.getUserId().equals(session.userId()) && session.role() != Role.ADMIN) {
            throw Status.NOT_FOUND.asRuntimeException();
        }
        return shipment;
    }

    @Override
    @Transactional
    public void simulateTracking(SimulateTrackingRequest request, StreamObserver<ShipmentMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Shipment shipment = loadOwnedShipment(request.getShipmentId(), session);

        if (FINAL_STATUSES.contains(shipment.getStatus())) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Shipment has reached a final status").asRuntimeException());
            return;
        }

        Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
        CourierAdapter adapter = courierRegistry.getAdapter(courier);
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        User seller = userRepository.findById(order.getUserId()).orElseThrow();

        if (shipment.getStatus() == ShipmentStatus.OUT_FOR_DELIVERY && random.nextDouble() < 0.25) {
            String reason = MockCourierAdapter.NDR_REASONS.get(random.nextInt(MockCourierAdapter.NDR_REASONS.size()));
            shipment.setStatus(ShipmentStatus.NDR);
            shipmentRepository.save(shipment);

            TrackingEvent event = new TrackingEvent();
            event.setShipmentId(shipment.getId());
            event.setStatus(ShipmentStatus.NDR);
            event.setDescription(reason);
            event.setLocation("Destination Hub");
            trackingEventRepository.save(event);

            NdrRecord ndr = new NdrRecord();
            ndr.setShipmentId(shipment.getId());
            ndr.setReason(reason);
            ndrRecordRepository.save(ndr);

            notifyService.notifyAllChannels(order.getUserId(), seller.getPhone(), seller.getEmail(),
                "Delivery attempt failed for " + shipment.getAwbNumber() + ": " + reason + ". Visit the NDR panel to take action.", order.getId());

            responseObserver.onNext(mappers.shipmentToMsg(shipment));
            responseObserver.onCompleted();
            return;
        }

        TrackingUpdate next = adapter.nextTrackingUpdate(shipment.getStatus());
        if (next == null) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("No further tracking update available").asRuntimeException());
            return;
        }

        shipment.setStatus(next.status());
        shipment.setCurrentLocation(next.location());
        shipmentRepository.save(shipment);

        TrackingEvent event = new TrackingEvent();
        event.setShipmentId(shipment.getId());
        event.setStatus(next.status());
        event.setDescription(next.description());
        event.setLocation(next.location());
        trackingEventRepository.save(event);

        if (next.status() == ShipmentStatus.DELIVERED) {
            codRemittanceRepository.findByShipmentId(shipment.getId()).ifPresent(remittance -> {
                remittance.setStatus(RemittanceStatus.PROCESSING);
                remittance.setSettledAt(Instant.now().plus(2, ChronoUnit.DAYS));
                codRemittanceRepository.save(remittance);
            });
        }

        notifyService.notifyAllChannels(order.getUserId(), seller.getPhone(), seller.getEmail(),
            "Shipment " + shipment.getAwbNumber() + " update: " + next.description() + ".", order.getId());

        responseObserver.onNext(mappers.shipmentToMsg(shipment));
        responseObserver.onCompleted();
    }

    @Override
    public void getLabelPdf(ShipmentIdRequest request, StreamObserver<PdfResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Shipment shipment = loadOwnedShipment(request.getShipmentId(), session);
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        Address pickup = addressRepository.findById(order.getPickupAddressId()).orElseThrow();
        Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
        Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();

        byte[] bytes = pdfService.generateLabel(shipment, order, pickup, buyer, courier.getName());
        responseObserver.onNext(PdfResponse.newBuilder()
            .setContent(ByteString.copyFrom(bytes))
            .setFilename("label-" + shipment.getAwbNumber() + ".pdf")
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void getInvoicePdf(ShipmentIdRequest request, StreamObserver<PdfResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Shipment shipment = loadOwnedShipment(request.getShipmentId(), session);
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        Address pickup = addressRepository.findById(order.getPickupAddressId()).orElseThrow();
        Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
        User seller = userRepository.findById(order.getUserId()).orElseThrow();

        byte[] bytes = pdfService.generateInvoice(shipment, order, pickup, buyer, seller);
        responseObserver.onNext(PdfResponse.newBuilder()
            .setContent(ByteString.copyFrom(bytes))
            .setFilename("invoice-" + order.getOrderNumber() + ".pdf")
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void trackPublic(TrackPublicRequest request, StreamObserver<TrackPublicResponse> responseObserver) {
        Shipment shipment = shipmentRepository.findByAwbNumber(request.getAwbNumber()).orElse(null);
        if (shipment == null) {
            responseObserver.onError(Status.NOT_FOUND.withDescription("No shipment found for this AWB").asRuntimeException());
            return;
        }
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
        Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
        TrackingPageConfig branding = trackingPageConfigRepository.findByUserId(order.getUserId()).orElse(null);

        TrackPublicResponse.Builder builder = TrackPublicResponse.newBuilder()
            .setAwbNumber(shipment.getAwbNumber())
            .setStatus(shipment.getStatus().name())
            .setCurrentLocation(shipment.getCurrentLocation())
            .setCourierName(courier.getName())
            .setDestinationCity(buyer.getCity())
            .setBrandName(branding != null ? branding.getBrandName() : "HetEx")
            .setPrimaryColor(branding != null ? branding.getPrimaryColor() : "#2c3958")
            .setLogoUrl(branding != null && branding.getLogoUrl() != null ? branding.getLogoUrl() : "");

        trackingEventRepository.findByShipmentIdOrderByTimestampAsc(shipment.getId()).forEach(e -> builder.addEvents(mappers.eventToMsg(e)));

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void receiveWebhook(WebhookRequest request, StreamObserver<Empty> responseObserver) {
        Shipment shipment = shipmentRepository.findByAwbNumber(request.getAwbNumber()).orElse(null);
        if (shipment == null) {
            responseObserver.onError(Status.NOT_FOUND.withDescription("Unknown AWB").asRuntimeException());
            return;
        }
        ShipmentStatus status = ShipmentStatus.valueOf(request.getStatus());
        shipment.setStatus(status);
        shipment.setCurrentLocation(request.getLocation());
        shipmentRepository.save(shipment);

        TrackingEvent event = new TrackingEvent();
        event.setShipmentId(shipment.getId());
        event.setStatus(status);
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        trackingEventRepository.save(event);

        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }

    private WeightDisputeMsg disputeToMsg(WeightDispute d, Shipment shipment, Order order, Courier courier) {
        return WeightDisputeMsg.newBuilder()
            .setId(d.getId())
            .setShipmentId(d.getShipmentId())
            .setOrderNumber(order.getOrderNumber())
            .setAwbNumber(shipment.getAwbNumber())
            .setCourierName(courier.getName())
            .setDeclaredWeight(d.getDeclaredWeight())
            .setCourierWeight(d.getCourierWeight())
            .setExtraCharge(d.getExtraCharge())
            .setStatus(d.getStatus().name())
            .setResolutionNote(d.getResolutionNote() == null ? "" : d.getResolutionNote())
            .setCreatedAt(d.getCreatedAt().toString())
            .build();
    }

    @Override
    public void listWeightDisputes(Empty request, StreamObserver<ListWeightDisputesResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        ListWeightDisputesResponse.Builder builder = ListWeightDisputesResponse.newBuilder();
        for (Order order : orderRepository.findByUserIdOrderByCreatedAtDesc(session.userId())) {
            shipmentRepository.findByOrderId(order.getId()).ifPresent(shipment ->
                weightDisputeRepository.findByShipmentId(shipment.getId()).ifPresent(d -> {
                    Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
                    builder.addDisputes(disputeToMsg(d, shipment, order, courier));
                })
            );
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void respondToWeightDispute(RespondToWeightDisputeRequest request, StreamObserver<Empty> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        WeightDispute dispute = weightDisputeRepository.findById(request.getDisputeId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        Shipment shipment = shipmentRepository.findById(dispute.getShipmentId()).orElseThrow();
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        if (!order.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }

        dispute.setStatus(DisputeStatus.valueOf(request.getStatus()));
        dispute.setResolutionNote(request.getResolutionNote());
        weightDisputeRepository.save(dispute);

        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }

    /** Demo trigger standing in for a courier's post-pickup weight-check flagging a mismatch. */
    @Override
    @Transactional
    public void raiseWeightDispute(ShipmentIdRequest request, StreamObserver<WeightDisputeMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Shipment shipment = loadOwnedShipment(request.getShipmentId(), session);
        Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
        Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();

        if (weightDisputeRepository.findByShipmentId(shipment.getId()).isPresent()) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("A weight dispute already exists for this shipment").asRuntimeException());
            return;
        }

        double courierWeight = Math.round((order.getBillableWeight() + 0.4 + random.nextDouble()) * 100) / 100.0;
        double extraCharge = Math.round((courierWeight - order.getBillableWeight()) * courier.getBaseRatePerKg() * 100) / 100.0;

        WeightDispute dispute = new WeightDispute();
        dispute.setShipmentId(shipment.getId());
        dispute.setDeclaredWeight(order.getBillableWeight());
        dispute.setCourierWeight(courierWeight);
        dispute.setExtraCharge(Math.max(extraCharge, 0));
        WeightDispute saved = weightDisputeRepository.save(dispute);

        User seller = userRepository.findById(order.getUserId()).orElseThrow();
        notifyService.notifyAllChannels(order.getUserId(), seller.getPhone(), seller.getEmail(),
            "Weight discrepancy flagged for " + shipment.getAwbNumber() + ": courier recorded " + courierWeight + "kg vs your " + order.getBillableWeight() + "kg.",
            order.getId());

        responseObserver.onNext(disputeToMsg(saved, shipment, order, courier));
        responseObserver.onCompleted();
    }
}
