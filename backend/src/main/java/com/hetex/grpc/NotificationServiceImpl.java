package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.Notification;
import com.hetex.grpc.proto.ListNotificationsResponse;
import com.hetex.grpc.proto.NotificationRow;
import com.hetex.grpc.proto.NotificationServiceGrpc;
import com.hetex.repository.NotificationRepository;
import com.hetex.service.JwtService;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class NotificationServiceImpl extends NotificationServiceGrpc.NotificationServiceImplBase {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public void listNotifications(Empty request, StreamObserver<ListNotificationsResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        ListNotificationsResponse.Builder builder = ListNotificationsResponse.newBuilder();
        for (Notification n : notificationRepository.findByUserIdOrderByCreatedAtDesc(session.userId())) {
            builder.addNotifications(NotificationRow.newBuilder()
                .setId(n.getId())
                .setChannel(n.getChannel().name())
                .setRecipient(n.getRecipient())
                .setMessage(n.getMessage())
                .setOrderId(n.getOrderId() == null ? "" : n.getOrderId())
                .setCreatedAt(n.getCreatedAt().toString())
                .build());
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
