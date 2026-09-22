package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.ListRemittancesResponse;
import com.hetex.grpc.proto.RemittanceRow;
import com.hetex.grpc.proto.RemittanceSummary;
import com.hetex.grpc.proto.CodServiceGrpc;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class CodServiceImpl extends CodServiceGrpc.CodServiceImplBase {

    private final CodRemittanceRepository codRemittanceRepository;
    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final CourierRepository courierRepository;

    public CodServiceImpl(
        CodRemittanceRepository codRemittanceRepository, ShipmentRepository shipmentRepository,
        OrderRepository orderRepository, CourierRepository courierRepository
    ) {
        this.codRemittanceRepository = codRemittanceRepository;
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.courierRepository = courierRepository;
    }

    @Override
    public void listRemittances(Empty request, StreamObserver<ListRemittancesResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        double total = 0, pending = 0, processing = 0, settled = 0;
        ListRemittancesResponse.Builder builder = ListRemittancesResponse.newBuilder();

        for (Order order : orderRepository.findByUserIdOrderByCreatedAtDesc(session.userId())) {
            var shipmentOpt = shipmentRepository.findByOrderId(order.getId());
            if (shipmentOpt.isEmpty()) continue;
            Shipment shipment = shipmentOpt.get();
            var remittanceOpt = codRemittanceRepository.findByShipmentId(shipment.getId());
            if (remittanceOpt.isEmpty()) continue;
            CodRemittance remittance = remittanceOpt.get();
            Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();

            total += remittance.getAmount();
            switch (remittance.getStatus()) {
                case PENDING -> pending += remittance.getAmount();
                case PROCESSING -> processing += remittance.getAmount();
                case SETTLED -> settled += remittance.getAmount();
            }

            builder.addRemittances(RemittanceRow.newBuilder()
                .setId(remittance.getId())
                .setOrderNumber(order.getOrderNumber())
                .setCourierName(courier.getName())
                .setAmount(remittance.getAmount())
                .setStatus(remittance.getStatus().name())
                .setSettledAt(remittance.getSettledAt() == null ? "" : remittance.getSettledAt().toString())
                .build());
        }

        builder.setSummary(RemittanceSummary.newBuilder().setTotal(total).setPending(pending).setProcessing(processing).setSettled(settled).build());
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
