package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.Address;
import com.hetex.entity.AddressType;
import com.hetex.grpc.proto.*;
import com.hetex.repository.AddressRepository;
import com.hetex.service.JwtService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;

@GrpcService
public class AddressServiceImpl extends AddressServiceGrpc.AddressServiceImplBase {

    private final AddressRepository addressRepository;

    public AddressServiceImpl(AddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    static AddressMsg toMsg(Address a) {
        return AddressMsg.newBuilder()
            .setId(a.getId())
            .setType(a.getType().name())
            .setLabel(a.getLabel())
            .setContactName(a.getContactName())
            .setPhone(a.getPhone())
            .setAddressLine1(a.getAddressLine1())
            .setAddressLine2(a.getAddressLine2() == null ? "" : a.getAddressLine2())
            .setCity(a.getCity())
            .setState(a.getState())
            .setPincode(a.getPincode())
            .setIsDefault(a.isDefault())
            .build();
    }

    @Override
    public void listAddresses(ListAddressesRequest request, StreamObserver<ListAddressesResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        List<Address> addresses = request.getTypeFilter().isBlank()
            ? addressRepository.findByUserIdOrderByTypeAscIsDefaultDescCreatedAtDesc(session.userId())
            : addressRepository.findByUserIdAndTypeOrderByIsDefaultDescCreatedAtDesc(session.userId(), AddressType.valueOf(request.getTypeFilter()));

        ListAddressesResponse.Builder builder = ListAddressesResponse.newBuilder();
        addresses.forEach(a -> builder.addAddresses(toMsg(a)));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void createAddress(CreateAddressRequest request, StreamObserver<AddressMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        AddressType type = AddressType.valueOf(request.getType());

        if (request.getIsDefault()) {
            addressRepository.findByUserIdAndTypeOrderByIsDefaultDescCreatedAtDesc(session.userId(), type)
                .forEach(a -> { a.setDefault(false); addressRepository.save(a); });
        }

        Address a = new Address();
        a.setUserId(session.userId());
        a.setType(type);
        a.setLabel(request.getLabel());
        a.setContactName(request.getContactName());
        a.setPhone(request.getPhone());
        a.setAddressLine1(request.getAddressLine1());
        a.setAddressLine2(request.getAddressLine2().isBlank() ? null : request.getAddressLine2());
        a.setCity(request.getCity());
        a.setState(request.getState());
        a.setPincode(request.getPincode());
        a.setDefault(request.getIsDefault());
        Address saved = addressRepository.save(a);

        responseObserver.onNext(toMsg(saved));
        responseObserver.onCompleted();
    }

    @Override
    public void deleteAddress(DeleteAddressRequest request, StreamObserver<Empty> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Address address = addressRepository.findById(request.getId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (!address.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }
        addressRepository.delete(address);
        responseObserver.onNext(Empty.getDefaultInstance());
        responseObserver.onCompleted();
    }
}
