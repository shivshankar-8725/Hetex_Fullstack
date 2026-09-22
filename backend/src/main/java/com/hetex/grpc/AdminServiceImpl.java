package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.AdjustWalletRequest;
import com.hetex.grpc.proto.AdjustWalletResponse;
import com.hetex.grpc.proto.AdminOverviewResponse;
import com.hetex.grpc.proto.AdminServiceGrpc;
import com.hetex.grpc.proto.AllShipmentRow;
import com.hetex.grpc.proto.CommissionRuleMsg;
import com.hetex.grpc.proto.CourierMsg;
import com.hetex.grpc.proto.CreateCommissionRuleRequest;
import com.hetex.grpc.proto.DeleteCommissionRuleRequest;
import com.hetex.grpc.proto.GetSellerDetailRequest;
import com.hetex.grpc.proto.ListAllShipmentsResponse;
import com.hetex.grpc.proto.ListCommissionRulesResponse;
import com.hetex.grpc.proto.ListCouriersResponse;
import com.hetex.grpc.proto.ListNdrRtoOversightResponse;
import com.hetex.grpc.proto.ListSellersResponse;
import com.hetex.grpc.proto.NdrRtoRow;
import com.hetex.grpc.proto.OrderSummary;
import com.hetex.grpc.proto.SellerDetailResponse;
import com.hetex.grpc.proto.SellerRow;
import com.hetex.grpc.proto.UpdateCourierRequest;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;

@GrpcService
public class AdminServiceImpl extends AdminServiceGrpc.AdminServiceImplBase {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final CourierRepository courierRepository;
    private final CommissionRuleRepository commissionRuleRepository;
    private final NdrRecordRepository ndrRecordRepository;
    private final AddressRepository addressRepository;
    private final GrpcMappers mappers;

    public AdminServiceImpl(
        UserRepository userRepository, WalletRepository walletRepository, WalletTransactionRepository walletTransactionRepository,
        OrderRepository orderRepository, ShipmentRepository shipmentRepository, CourierRepository courierRepository,
        CommissionRuleRepository commissionRuleRepository, NdrRecordRepository ndrRecordRepository,
        AddressRepository addressRepository, GrpcMappers mappers
    ) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.orderRepository = orderRepository;
        this.shipmentRepository = shipmentRepository;
        this.courierRepository = courierRepository;
        this.commissionRuleRepository = commissionRuleRepository;
        this.ndrRecordRepository = ndrRecordRepository;
        this.addressRepository = addressRepository;
        this.mappers = mappers;
    }

    private void requireAdmin() {
        JwtService.SessionPayload session = AuthContext.requireSession();
        if (session.role() != Role.ADMIN) throw Status.PERMISSION_DENIED.asRuntimeException();
    }

    private SellerRow toSellerRow(User user) {
        double balance = walletRepository.findByUserId(user.getId()).map(Wallet::getBalance).orElse(0.0);
        long orderCount = orderRepository.countByUserId(user.getId());
        return SellerRow.newBuilder()
            .setId(user.getId())
            .setBusinessName(user.getBusinessName() == null ? "" : user.getBusinessName())
            .setName(user.getName())
            .setPhone(user.getPhone())
            .setEmail(user.getEmail() == null ? "" : user.getEmail())
            .setKycStatus(user.getKycStatus().name())
            .setOrderCount((int) orderCount)
            .setWalletBalance(balance)
            .setCreatedAt(user.getCreatedAt().toString())
            .setPanNumber(user.getPanNumber() == null ? "" : user.getPanNumber())
            .setGstNumber(user.getGstNumber() == null ? "" : user.getGstNumber())
            .setEmailVerified(user.isEmailVerified())
            .build();
    }

    @Override
    public void listSellers(Empty request, StreamObserver<ListSellersResponse> responseObserver) {
        requireAdmin();
        ListSellersResponse.Builder builder = ListSellersResponse.newBuilder();
        for (User user : userRepository.findByRole(Role.SELLER)) {
            builder.addSellers(toSellerRow(user));
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getSellerDetail(GetSellerDetailRequest request, StreamObserver<SellerDetailResponse> responseObserver) {
        requireAdmin();
        User user = userRepository.findById(request.getUserId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());

        SellerDetailResponse.Builder builder = SellerDetailResponse.newBuilder().setSeller(toSellerRow(user));
        for (Order order : orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())) {
            Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
            OrderSummary.Builder summary = OrderSummary.newBuilder()
                .setId(order.getId())
                .setOrderNumber(order.getOrderNumber())
                .setPaymentMode(order.getPaymentMode().name())
                .setBillableWeight(order.getBillableWeight())
                .setCreatedAt(order.getCreatedAt().toString())
                .setStatus(order.getStatus().name())
                .setBuyerContactName(buyer.getContactName())
                .setBuyerCity(buyer.getCity());
            shipmentRepository.findByOrderId(order.getId()).ifPresent(s -> summary.setShipment(mappers.shipmentToMsg(s)).setHasShipment(true).setStatus(s.getStatus().name()));
            builder.addOrders(summary.build());
        }

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void listAllShipments(Empty request, StreamObserver<ListAllShipmentsResponse> responseObserver) {
        requireAdmin();
        ListAllShipmentsResponse.Builder builder = ListAllShipmentsResponse.newBuilder();
        for (Shipment shipment : shipmentRepository.findAll()) {
            Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
            User seller = userRepository.findById(order.getUserId()).orElseThrow();
            Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
            builder.addShipments(AllShipmentRow.newBuilder()
                .setAwbNumber(shipment.getAwbNumber())
                .setOrderNumber(order.getOrderNumber())
                .setSellerName(seller.getBusinessName() != null ? seller.getBusinessName() : seller.getName())
                .setCourierName(courier.getName())
                .setStatus(shipment.getStatus().name())
                .setCurrentLocation(shipment.getCurrentLocation())
                .setPaymentMode(order.getPaymentMode().name())
                .setCreatedAt(shipment.getCreatedAt().toString())
                .build());
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void adjustWallet(AdjustWalletRequest request, StreamObserver<AdjustWalletResponse> responseObserver) {
        requireAdmin();
        Wallet wallet = walletRepository.findByUserId(request.getUserId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        double newBalance = wallet.getBalance() + request.getAmount();
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction txn = new WalletTransaction();
        txn.setWalletId(wallet.getId());
        txn.setType(request.getAmount() >= 0 ? WalletTxnType.CREDIT : WalletTxnType.DEBIT);
        txn.setAmount(Math.abs(request.getAmount()));
        txn.setBalanceAfter(newBalance);
        txn.setReason("Admin adjustment: " + request.getReason());
        walletTransactionRepository.save(txn);

        responseObserver.onNext(AdjustWalletResponse.newBuilder().setBalance(newBalance).build());
        responseObserver.onCompleted();
    }

    @Override
    public void listCouriers(Empty request, StreamObserver<ListCouriersResponse> responseObserver) {
        requireAdmin();
        ListCouriersResponse.Builder builder = ListCouriersResponse.newBuilder();
        courierRepository.findAll().forEach(c -> builder.addCouriers(mappers.courierToMsg(c)));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void updateCourier(UpdateCourierRequest request, StreamObserver<CourierMsg> responseObserver) {
        requireAdmin();
        Courier courier = courierRepository.findById(request.getId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (request.getHasActive()) courier.setActive(request.getActive());
        if (request.getHasBaseRatePerKg()) courier.setBaseRatePerKg(request.getBaseRatePerKg());
        Courier saved = courierRepository.save(courier);
        responseObserver.onNext(mappers.courierToMsg(saved));
        responseObserver.onCompleted();
    }

    @Override
    public void listCommissionRules(Empty request, StreamObserver<ListCommissionRulesResponse> responseObserver) {
        requireAdmin();
        ListCommissionRulesResponse.Builder builder = ListCommissionRulesResponse.newBuilder();
        for (CommissionRule rule : commissionRuleRepository.findAllByOrderByCreatedAtDesc()) {
            String courierName = rule.getCourierId() == null ? "All Couriers (fallback)"
                : courierRepository.findById(rule.getCourierId()).map(Courier::getName).orElse("Unknown");
            builder.addRules(CommissionRuleMsg.newBuilder()
                .setId(rule.getId())
                .setCourierId(rule.getCourierId() == null ? "" : rule.getCourierId())
                .setCourierName(courierName)
                .setMinWeight(rule.getMinWeight())
                .setMaxWeight(rule.getMaxWeight())
                .setMarginType(rule.getMarginType().name())
                .setMarginValue(rule.getMarginValue())
                .build());
        }
        courierRepository.findAll().forEach(c -> builder.addCouriers(mappers.courierToMsg(c)));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void createCommissionRule(CreateCommissionRuleRequest request, StreamObserver<CommissionRuleMsg> responseObserver) {
        requireAdmin();
        CommissionRule rule = new CommissionRule();
        rule.setCourierId(request.getCourierId().isBlank() ? null : request.getCourierId());
        rule.setMinWeight(request.getMinWeight());
        rule.setMaxWeight(request.getMaxWeight());
        rule.setMarginType(MarginType.valueOf(request.getMarginType()));
        rule.setMarginValue(request.getMarginValue());
        CommissionRule saved = commissionRuleRepository.save(rule);

        String courierName = saved.getCourierId() == null ? "All Couriers (fallback)"
            : courierRepository.findById(saved.getCourierId()).map(Courier::getName).orElse("Unknown");
        responseObserver.onNext(CommissionRuleMsg.newBuilder()
            .setId(saved.getId())
            .setCourierId(saved.getCourierId() == null ? "" : saved.getCourierId())
            .setCourierName(courierName)
            .setMinWeight(saved.getMinWeight())
            .setMaxWeight(saved.getMaxWeight())
            .setMarginType(saved.getMarginType().name())
            .setMarginValue(saved.getMarginValue())
            .build());
        responseObserver.onCompleted();
    }

    @Override
    public void deleteCommissionRule(DeleteCommissionRuleRequest request, StreamObserver<Empty> responseObserver) {
        requireAdmin();
        commissionRuleRepository.deleteById(request.getId());
        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }

    @Override
    public void listNdrRtoOversight(Empty request, StreamObserver<ListNdrRtoOversightResponse> responseObserver) {
        requireAdmin();
        List<ShipmentStatus> statuses = List.of(ShipmentStatus.NDR, ShipmentStatus.RTO_INITIATED, ShipmentStatus.RTO_DELIVERED);
        ListNdrRtoOversightResponse.Builder builder = ListNdrRtoOversightResponse.newBuilder();
        for (Shipment shipment : shipmentRepository.findByStatusIn(statuses)) {
            Order order = orderRepository.findById(shipment.getOrderId()).orElseThrow();
            User seller = userRepository.findById(order.getUserId()).orElseThrow();
            Courier courier = courierRepository.findById(shipment.getCourierId()).orElseThrow();
            String reason = ndrRecordRepository.findByShipmentIdOrderByCreatedAtDesc(shipment.getId())
                .stream().findFirst().map(NdrRecord::getReason).orElse("");
            builder.addShipments(NdrRtoRow.newBuilder()
                .setAwbNumber(shipment.getAwbNumber())
                .setSellerName(seller.getBusinessName() != null ? seller.getBusinessName() : seller.getName())
                .setCourierName(courier.getName())
                .setReason(reason)
                .setStatus(shipment.getStatus().name())
                .build());
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getOverview(Empty request, StreamObserver<AdminOverviewResponse> responseObserver) {
        requireAdmin();
        long sellerCount = userRepository.findByRole(Role.SELLER).size();
        long totalOrders = orderRepository.count();
        long totalShipments = shipmentRepository.count();
        long openNdr = shipmentRepository.countByStatus(ShipmentStatus.NDR);

        double totalMargin = 0;
        double totalWallet = 0;
        for (Shipment s : shipmentRepository.findAll()) totalMargin += s.getMarginEarned();
        for (Wallet w : walletRepository.findAll()) totalWallet += w.getBalance();

        AdminOverviewResponse.Builder builder = AdminOverviewResponse.newBuilder()
            .setSellerCount((int) sellerCount)
            .setTotalOrders((int) totalOrders)
            .setTotalShipments((int) totalShipments)
            .setOpenNdr((int) openNdr)
            .setTotalMarginEarned(totalMargin)
            .setTotalWalletBalance(totalWallet);

        orderRepository.findAllByOrderByCreatedAtDesc().stream().limit(8).forEach(order -> {
            Address buyer = addressRepository.findById(order.getBuyerAddressId()).orElseThrow();
            OrderSummary.Builder summary = OrderSummary.newBuilder()
                .setId(order.getId())
                .setOrderNumber(order.getOrderNumber())
                .setPaymentMode(order.getPaymentMode().name())
                .setBillableWeight(order.getBillableWeight())
                .setCreatedAt(order.getCreatedAt().toString())
                .setStatus(order.getStatus().name())
                .setBuyerContactName(buyer.getContactName())
                .setBuyerCity(buyer.getCity());
            shipmentRepository.findByOrderId(order.getId()).ifPresent(s -> summary.setShipment(mappers.shipmentToMsg(s)).setHasShipment(true).setStatus(s.getStatus().name()));
            builder.addRecentOrders(summary.build());
        });

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
