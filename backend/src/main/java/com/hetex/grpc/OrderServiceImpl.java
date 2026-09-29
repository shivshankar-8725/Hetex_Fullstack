package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.BulkUploadOrdersRequest;
import com.hetex.grpc.proto.BulkUploadOrdersResponse;
import com.hetex.grpc.proto.CancelOrderRequest;
import com.hetex.grpc.proto.CreateOrderRequest;
import com.hetex.grpc.proto.CreateOrderResponse;
import com.hetex.grpc.proto.GetOrderRequest;
import com.hetex.grpc.proto.ListOrdersRequest;
import com.hetex.grpc.proto.ListOrdersResponse;
import com.hetex.grpc.proto.OrderDetail;
import com.hetex.grpc.proto.OrderServiceGrpc;
import com.hetex.grpc.proto.OrderSummary;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import com.hetex.service.NotifyService;
import com.hetex.service.VolumetricUtil;
import com.hetex.service.courier.CourierAdapter;
import com.hetex.service.courier.CourierRegistry;
import com.hetex.service.courier.DelhiveryService;
import com.hetex.service.courier.ShipmentCreationResult;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@GrpcService
public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {

    private static final Set<String> CANCELLABLE_STATUSES = Set.of("READY_TO_SHIP", "MANIFESTED", "PICKUP_SCHEDULED");
    private static final List<String> REQUIRED_CSV_COLUMNS = List.of(
        "buyerName", "buyerPhone", "addressLine1", "city", "state", "pincode",
        "itemDescription", "declaredValue", "weight", "length", "width", "height", "paymentMode"
    );

    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final AddressRepository addressRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CodRemittanceRepository codRemittanceRepository;
    private final UserRepository userRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final CourierRegistry courierRegistry;
    private final NotifyService notifyService;
    private final GrpcMappers mappers;
    private final DelhiveryService delhiveryService;

    public OrderServiceImpl(
        OrderRepository orderRepository, ShipmentRepository shipmentRepository, AddressRepository addressRepository,
        WalletRepository walletRepository, WalletTransactionRepository walletTransactionRepository,
        CodRemittanceRepository codRemittanceRepository, UserRepository userRepository,
        TrackingEventRepository trackingEventRepository, CourierRegistry courierRegistry,
        NotifyService notifyService, GrpcMappers mappers, DelhiveryService delhiveryService
    ) {
        this.orderRepository = orderRepository;
        this.shipmentRepository = shipmentRepository;
        this.addressRepository = addressRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.codRemittanceRepository = codRemittanceRepository;
        this.userRepository = userRepository;
        this.trackingEventRepository = trackingEventRepository;
        this.courierRegistry = courierRegistry;
        this.notifyService = notifyService;
        this.mappers = mappers;
        this.delhiveryService = delhiveryService;
    }

    @Override
    public void listOrders(ListOrdersRequest request, StreamObserver<ListOrdersResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(session.userId());
        String statusFilter = request.getStatusFilter();

        ListOrdersResponse.Builder builder = ListOrdersResponse.newBuilder();
        for (Order order : orders) {
            var shipmentOpt = shipmentRepository.findByOrderId(order.getId());
            if (!statusFilter.isBlank() && !statusFilter.equals("ALL")) {
                boolean matches = shipmentOpt.map(s -> s.getStatus().name().equals(statusFilter)).orElse(false);
                if (!matches) continue;
            }
            builder.addOrders(toSummary(order, shipmentOpt.orElse(null)));
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    private OrderSummary toSummary(Order order, Shipment shipment) {
        Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
        OrderSummary.Builder builder = OrderSummary.newBuilder()
            .setId(order.getId())
            .setOrderNumber(order.getOrderNumber())
            .setPaymentMode(order.getPaymentMode().name())
            .setBillableWeight(order.getBillableWeight())
            .setCreatedAt(order.getCreatedAt().toString())
            .setStatus(order.getStatus().name())
            .setBuyerContactName(buyer.getContactName())
            .setBuyerCity(buyer.getCity());
        if (shipment != null) {
            builder.setShipment(mappers.shipmentToMsg(shipment)).setHasShipment(true).setStatus(shipment.getStatus().name());
        }
        return builder.build();
    }

    @Override
    public void getOrder(GetOrderRequest request, StreamObserver<OrderDetail> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Order order = orderRepository.findById(request.getOrderId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (!order.getUserId().equals(session.userId()) && session.role() != Role.ADMIN) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }

        Address pickup = addressRepository.findById(order.getPickupAddressId()).orElseThrow();
        Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
        var shipmentOpt = shipmentRepository.findByOrderId(order.getId());

        OrderDetail.Builder builder = OrderDetail.newBuilder()
            .setId(order.getId())
            .setOrderNumber(order.getOrderNumber())
            .setCreatedAt(order.getCreatedAt().toString())
            .setStatus(order.getStatus().name())
            .setItemDescription(order.getItemDescription())
            .setDeclaredValue(order.getDeclaredValue())
            .setWeight(order.getWeight())
            .setLength(order.getLength())
            .setWidth(order.getWidth())
            .setHeight(order.getHeight())
            .setVolumetricWeight(order.getVolumetricWeight())
            .setBillableWeight(order.getBillableWeight())
            .setPaymentMode(order.getPaymentMode().name())
            .setCodAmount(order.getCodAmount())
            .setPickupAddress(mappers.addressToMsg(pickup))
            .setBuyerAddress(mappers.addressToMsg(buyer));

        shipmentOpt.ifPresent(s -> builder.setShipment(mappers.shipmentToMsg(s)).setHasShipment(true));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void createOrder(CreateOrderRequest request, StreamObserver<CreateOrderResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        Address pickup = addressRepository.findById(request.getPickupAddressId()).orElse(null);
        Address buyer = addressRepository.findById(request.getBuyerAddressId()).orElse(null);
        Wallet wallet = walletRepository.findByUserId(session.userId()).orElse(null);

        if (pickup == null || !pickup.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Invalid pickup address").asRuntimeException());
            return;
        }
        if (buyer == null || !buyer.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Invalid buyer address").asRuntimeException());
            return;
        }
        if (wallet == null) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Wallet not found").asRuntimeException());
            return;
        }
        if (wallet.getBalance() < request.getSellerPrice()) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Insufficient wallet balance. Please recharge your wallet.").asRuntimeException());
            return;
        }

        Courier courier = courierRegistry.getActiveAdapters().stream()
            .map(CourierRegistry.ActiveAdapter::courier)
            .filter(c -> c.getId().equals(request.getCourierId()))
            .findFirst()
            .orElseThrow(() -> Status.INVALID_ARGUMENT.withDescription("Invalid courier").asRuntimeException());

        double billable = VolumetricUtil.roundToSlab(
            VolumetricUtil.billableWeight(request.getWeight(), request.getLength(), request.getWidth(), request.getHeight())
        );
        PaymentMode paymentMode = PaymentMode.valueOf(request.getPaymentMode());

        Order order = new Order();
        order.setOrderNumber("HTX-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase());
        order.setUserId(session.userId());
        order.setPickupAddressId(pickup.getId());
        order.setBuyerAddressId(buyer.getId());
        order.setItemDescription(request.getItemDescription());
        order.setDeclaredValue(request.getDeclaredValue());
        order.setWeight(request.getWeight());
        order.setLength(request.getLength());
        order.setWidth(request.getWidth());
        order.setHeight(request.getHeight());
        order.setVolumetricWeight(VolumetricUtil.volumetricWeight(request.getLength(), request.getWidth(), request.getHeight()));
        order.setBillableWeight(billable);
        order.setPaymentMode(paymentMode);
        order.setCodAmount(paymentMode == PaymentMode.COD ? request.getCodAmount() : 0);
        order.setStatus(OrderStatus.BOOKED);
        Order savedOrder = orderRepository.save(order);

        String awbNumber;
        boolean labelReady = true;

        if ("DLV".equalsIgnoreCase(courier.getCode()) || "Delhivery".equalsIgnoreCase(courier.getName())) {
            DelhiveryService.DelhiveryShipmentResult dlvResult = delhiveryService.createShipment(savedOrder, pickup, buyer);
            awbNumber = dlvResult.awbNumber();
        } else {
            CourierAdapter adapter = courierRegistry.getAdapter(courier);
            ShipmentCreationResult shipmentResult = adapter.createShipment(pickup.getPincode(), buyer.getPincode(), billable, paymentMode);
            awbNumber = shipmentResult.awbNumber();
            labelReady = shipmentResult.labelReady();
        }

        Shipment shipment = new Shipment();
        shipment.setOrderId(savedOrder.getId());
        shipment.setCourierId(courier.getId());
        shipment.setAwbNumber(awbNumber);
        shipment.setRateCharged(request.getSellerPrice());
        shipment.setMarginEarned(request.getMargin());
        shipment.setStatus(ShipmentStatus.READY_TO_SHIP);
        shipment.setLabelGenerated(labelReady);
        Shipment savedShipment = shipmentRepository.save(shipment);

        TrackingEvent event = new TrackingEvent();
        event.setShipmentId(savedShipment.getId());
        event.setStatus(ShipmentStatus.READY_TO_SHIP);
        event.setDescription("Order booked with " + courier.getName() + ", awaiting manifest");
        event.setLocation(pickup.getCity());
        trackingEventRepository.save(event);

        double newBalance = wallet.getBalance() - request.getSellerPrice();
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction txn = new WalletTransaction();
        txn.setWalletId(wallet.getId());
        txn.setType(WalletTxnType.DEBIT);
        txn.setAmount(request.getSellerPrice());
        txn.setBalanceAfter(newBalance);
        txn.setReason("Shipping charge for " + savedOrder.getOrderNumber());
        txn.setOrderId(savedOrder.getId());
        walletTransactionRepository.save(txn);

        if (paymentMode == PaymentMode.COD && request.getCodAmount() > 0) {
            CodRemittance remittance = new CodRemittance();
            remittance.setShipmentId(savedShipment.getId());
            remittance.setAmount(request.getCodAmount());
            codRemittanceRepository.save(remittance);
        }

        User seller = userRepository.findById(session.userId()).orElseThrow();
        notifyService.notifyAllChannels(session.userId(), seller.getPhone(), seller.getEmail(),
            "Order " + savedOrder.getOrderNumber() + " booked successfully. AWB: " + awbNumber + ".", savedOrder.getId());

        responseObserver.onNext(CreateOrderResponse.newBuilder()
            .setOrderId(savedOrder.getId())
            .setOrderNumber(savedOrder.getOrderNumber())
            .setAwbNumber(awbNumber)
            .build());
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void cancelOrder(CancelOrderRequest request, StreamObserver<Empty> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Order order = orderRepository.findById(request.getOrderId()).orElse(null);
        if (order == null || !order.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }
        Shipment shipment = shipmentRepository.findByOrderId(order.getId()).orElse(null);
        if (shipment == null || !CANCELLABLE_STATUSES.contains(shipment.getStatus().name())) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("This order can no longer be cancelled").asRuntimeException());
            return;
        }

        shipment.setStatus(ShipmentStatus.CANCELLED);
        shipmentRepository.save(shipment);
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        Wallet wallet = walletRepository.findByUserId(session.userId()).orElseThrow();
        double newBalance = wallet.getBalance() + shipment.getRateCharged();
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction txn = new WalletTransaction();
        txn.setWalletId(wallet.getId());
        txn.setType(WalletTxnType.CREDIT);
        txn.setAmount(shipment.getRateCharged());
        txn.setBalanceAfter(newBalance);
        txn.setReason("Refund for cancelled order " + order.getOrderNumber());
        txn.setOrderId(order.getId());
        walletTransactionRepository.save(txn);

        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }

    @Override
    public void bulkUploadOrders(BulkUploadOrdersRequest request, StreamObserver<BulkUploadOrdersResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        Address pickup = addressRepository.findFirstByUserIdAndTypeOrderByIsDefaultDesc(session.userId(), AddressType.PICKUP).orElse(null);
        if (pickup == null) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Add a pickup address before bulk uploading").asRuntimeException());
            return;
        }

        List<String> errors = new ArrayList<>();
        int created = 0;

        try (CSVParser parser = CSVParser.parse(new StringReader(request.getCsvContent()), CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {
            List<String> headers = parser.getHeaderNames();
            List<String> missing = REQUIRED_CSV_COLUMNS.stream().filter(c -> !headers.contains(c)).toList();
            if (!missing.isEmpty()) {
                responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Missing columns: " + String.join(", ", missing)).asRuntimeException());
                return;
            }

            int rowIndex = 0;
            for (CSVRecord row : parser) {
                rowIndex++;
                try {
                    double weight = Double.parseDouble(row.get("weight"));
                    double length = Double.parseDouble(row.get("length"));
                    double width = Double.parseDouble(row.get("width"));
                    double height = Double.parseDouble(row.get("height"));
                    if (row.get("buyerName").isBlank() || row.get("pincode").isBlank()) {
                        errors.add("Row " + (rowIndex + 1) + ": missing or invalid required fields");
                        continue;
                    }

                    Address buyerAddress = new Address();
                    buyerAddress.setUserId(session.userId());
                    buyerAddress.setType(AddressType.BUYER);
                    buyerAddress.setLabel("Bulk import");
                    buyerAddress.setContactName(row.get("buyerName"));
                    buyerAddress.setPhone(row.get("buyerPhone"));
                    buyerAddress.setAddressLine1(row.get("addressLine1"));
                    buyerAddress.setCity(row.get("city"));
                    buyerAddress.setState(row.get("state"));
                    buyerAddress.setPincode(row.get("pincode"));
                    Address savedBuyer = addressRepository.save(buyerAddress);

                    Order order = new Order();
                    order.setOrderNumber("BLK-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase() + "-" + rowIndex);
                    order.setUserId(session.userId());
                    order.setPickupAddressId(pickup.getId());
                    order.setBuyerAddressId(savedBuyer.getId());
                    order.setItemDescription(row.get("itemDescription"));
                    order.setDeclaredValue(parseDoubleOrZero(row.get("declaredValue")));
                    order.setWeight(weight);
                    order.setLength(length);
                    order.setWidth(width);
                    order.setHeight(height);
                    order.setVolumetricWeight(VolumetricUtil.volumetricWeight(length, width, height));
                    order.setBillableWeight(VolumetricUtil.billableWeight(weight, length, width, height));
                    order.setPaymentMode("COD".equals(row.get("paymentMode")) ? PaymentMode.COD : PaymentMode.PREPAID);
                    order.setCodAmount(row.isMapped("codAmount") ? parseDoubleOrZero(row.get("codAmount")) : 0);
                    order.setStatus(OrderStatus.DRAFT);
                    order.setSource("BULK_CSV");
                    orderRepository.save(order);
                    created++;
                } catch (Exception e) {
                    errors.add("Row " + (rowIndex + 1) + ": failed to import");
                }
            }
        } catch (Exception e) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Failed to parse CSV: " + e.getMessage()).asRuntimeException());
            return;
        }

        responseObserver.onNext(BulkUploadOrdersResponse.newBuilder().setCreated(created).addAllErrors(errors).build());
        responseObserver.onCompleted();
    }

    private double parseDoubleOrZero(String value) {
        try {
            return value == null || value.isBlank() ? 0 : Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
