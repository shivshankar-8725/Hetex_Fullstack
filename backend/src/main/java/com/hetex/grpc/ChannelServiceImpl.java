package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.ChannelConnectionMsg;
import com.hetex.grpc.proto.ChannelServiceGrpc;
import com.hetex.grpc.proto.ConnectChannelRequest;
import com.hetex.grpc.proto.DisconnectChannelRequest;
import com.hetex.grpc.proto.ListChannelsResponse;
import com.hetex.grpc.proto.SyncChannelRequest;
import com.hetex.grpc.proto.SyncChannelResponse;
import com.hetex.repository.AddressRepository;
import com.hetex.repository.MarketplaceConnectionRepository;
import com.hetex.repository.OrderRepository;
import com.hetex.service.JwtService;
import com.hetex.service.VolumetricUtil;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;

@GrpcService
public class ChannelServiceImpl extends ChannelServiceGrpc.ChannelServiceImplBase {

    private record SampleBuyer(String contactName, String city, String state, String pincode, String item, double value) {}

    private static final List<SampleBuyer> SAMPLE_BUYERS = List.of(
        new SampleBuyer("Ananya Rao", "Hyderabad", "Telangana", "500081", "Wireless Earbuds", 1499),
        new SampleBuyer("Kabir Malhotra", "Pune", "Maharashtra", "411001", "Yoga Mat", 799),
        new SampleBuyer("Sneha Iyer", "Chennai", "Tamil Nadu", "600001", "Ceramic Mug Set", 599)
    );

    private final MarketplaceConnectionRepository connectionRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;

    public ChannelServiceImpl(MarketplaceConnectionRepository connectionRepository, AddressRepository addressRepository, OrderRepository orderRepository) {
        this.connectionRepository = connectionRepository;
        this.addressRepository = addressRepository;
        this.orderRepository = orderRepository;
    }

    private ChannelConnectionMsg toMsg(MarketplaceConnection c) {
        return ChannelConnectionMsg.newBuilder()
            .setId(c.getId())
            .setPlatform(c.getPlatform().name())
            .setStoreName(c.getStoreName())
            .setConnected(c.isConnected())
            .build();
    }

    @Override
    public void listChannels(Empty request, StreamObserver<ListChannelsResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        ListChannelsResponse.Builder builder = ListChannelsResponse.newBuilder();
        connectionRepository.findByUserId(session.userId()).forEach(c -> builder.addConnections(toMsg(c)));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void connectChannel(ConnectChannelRequest request, StreamObserver<ChannelConnectionMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        MarketplaceConnection connection = new MarketplaceConnection();
        connection.setUserId(session.userId());
        connection.setPlatform(MarketplacePlatform.valueOf(request.getPlatform()));
        connection.setStoreName(request.getStoreName());
        MarketplaceConnection saved = connectionRepository.save(connection);
        responseObserver.onNext(toMsg(saved));
        responseObserver.onCompleted();
    }

    @Override
    public void disconnectChannel(DisconnectChannelRequest request, StreamObserver<Empty> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        MarketplaceConnection connection = connectionRepository.findById(request.getId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (!connection.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }
        connectionRepository.delete(connection);
        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }

    @Override
    public void syncChannel(SyncChannelRequest request, StreamObserver<SyncChannelResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        MarketplaceConnection connection = connectionRepository.findById(request.getId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (!connection.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }

        Address pickup = addressRepository.findFirstByUserIdAndTypeOrderByIsDefaultDesc(session.userId(), AddressType.PICKUP).orElse(null);
        if (pickup == null) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Add a pickup address before syncing orders").asRuntimeException());
            return;
        }

        int imported = 0;
        for (SampleBuyer sample : SAMPLE_BUYERS) {
            Address buyerAddress = new Address();
            buyerAddress.setUserId(session.userId());
            buyerAddress.setType(AddressType.BUYER);
            buyerAddress.setLabel(connection.getPlatform().name() + " buyer");
            buyerAddress.setContactName(sample.contactName());
            buyerAddress.setPhone("9000000000");
            buyerAddress.setAddressLine1("Sample address, auto-imported");
            buyerAddress.setCity(sample.city());
            buyerAddress.setState(sample.state());
            buyerAddress.setPincode(sample.pincode());
            Address savedBuyer = addressRepository.save(buyerAddress);

            double weight = 0.3, length = 20, width = 15, height = 10;
            Order order = new Order();
            order.setOrderNumber(connection.getPlatform().name().substring(0, Math.min(3, connection.getPlatform().name().length())) + "-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase() + "-" + imported);
            order.setUserId(session.userId());
            order.setPickupAddressId(pickup.getId());
            order.setBuyerAddressId(savedBuyer.getId());
            order.setItemDescription(sample.item());
            order.setDeclaredValue(sample.value());
            order.setWeight(weight);
            order.setLength(length);
            order.setWidth(width);
            order.setHeight(height);
            order.setVolumetricWeight(VolumetricUtil.volumetricWeight(length, width, height));
            order.setBillableWeight(VolumetricUtil.billableWeight(weight, length, width, height));
            order.setPaymentMode(PaymentMode.PREPAID);
            order.setStatus(OrderStatus.DRAFT);
            order.setSource(connection.getPlatform().name());
            orderRepository.save(order);
            imported++;
        }

        responseObserver.onNext(SyncChannelResponse.newBuilder().setImported(imported).build());
        responseObserver.onCompleted();
    }
}
