package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.Order;
import com.hetex.entity.Shipment;
import com.hetex.entity.ShipmentStatus;
import com.hetex.grpc.proto.*;
import com.hetex.repository.CourierRepository;
import com.hetex.repository.OrderRepository;
import com.hetex.repository.ShipmentRepository;
import com.hetex.service.JwtService;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@GrpcService
public class AnalyticsServiceImpl extends AnalyticsServiceGrpc.AnalyticsServiceImplBase {

    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final CourierRepository courierRepository;

    public AnalyticsServiceImpl(OrderRepository orderRepository, ShipmentRepository shipmentRepository, CourierRepository courierRepository) {
        this.orderRepository = orderRepository;
        this.shipmentRepository = shipmentRepository;
        this.courierRepository = courierRepository;
    }

    @Override
    public void getAnalytics(Empty request, StreamObserver<AnalyticsResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Instant since = Instant.now().minus(14, ChronoUnit.DAYS);

        var orders = orderRepository.findByUserIdAndCreatedAtAfter(session.userId(), since);

        Map<String, Integer> byDay = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        for (int i = 0; i < 14; i++) {
            LocalDate d = LocalDate.now(ZoneId.systemDefault()).minusDays(13 - i);
            byDay.put(d.format(fmt), 0);
        }

        Map<String, Integer> courierCounts = new LinkedHashMap<>();
        Map<String, String> courierNames = new LinkedHashMap<>();
        int codCount = 0, prepaidCount = 0, rtoCount = 0, deliveredCount = 0;

        for (Order order : orders) {
            String day = LocalDate.ofInstant(order.getCreatedAt(), ZoneId.systemDefault()).format(fmt);
            byDay.merge(day, 1, Integer::sum);

            if (order.getPaymentMode().name().equals("COD")) codCount++;
            else prepaidCount++;

            var shipmentOpt = shipmentRepository.findByOrderId(order.getId());
            if (shipmentOpt.isEmpty()) continue;
            Shipment shipment = shipmentOpt.get();
            if (shipment.getStatus() == ShipmentStatus.RTO_INITIATED || shipment.getStatus() == ShipmentStatus.RTO_DELIVERED) rtoCount++;
            if (shipment.getStatus() == ShipmentStatus.DELIVERED) deliveredCount++;

            courierCounts.merge(shipment.getCourierId(), 1, Integer::sum);
            courierNames.computeIfAbsent(shipment.getCourierId(), id -> courierRepository.findById(id).map(c -> c.getName()).orElse("Unknown"));
        }

        AnalyticsResponse.Builder builder = AnalyticsResponse.newBuilder();
        byDay.forEach((date, count) -> builder.addOrdersPerDay(OrdersPerDay.newBuilder().setDate(date).setCount(count).build()));
        courierCounts.forEach((id, count) -> builder.addCourierSplit(CourierSplitEntry.newBuilder().setName(courierNames.get(id)).setCount(count).build()));
        builder.addPaymentSplit(PaymentSplitEntry.newBuilder().setName("COD").setValue(codCount).build());
        builder.addPaymentSplit(PaymentSplitEntry.newBuilder().setName("Prepaid").setValue(prepaidCount).build());

        int totalOrders = orders.size();
        double rtoPercent = totalOrders == 0 ? 0 : Math.round((double) rtoCount / totalOrders * 1000) / 10.0;
        builder.setTotals(AnalyticsTotals.newBuilder().setOrders(totalOrders).setDelivered(deliveredCount).setRto(rtoCount).setRtoPercent(rtoPercent).build());

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
