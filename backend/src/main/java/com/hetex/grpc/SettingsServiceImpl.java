package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.TrackingPageConfig;
import com.hetex.grpc.proto.SettingsServiceGrpc;
import com.hetex.grpc.proto.TrackingPageConfigMsg;
import com.hetex.grpc.proto.UpdateTrackingPageConfigRequest;
import com.hetex.repository.TrackingPageConfigRepository;
import com.hetex.service.JwtService;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class SettingsServiceImpl extends SettingsServiceGrpc.SettingsServiceImplBase {

    private final TrackingPageConfigRepository trackingPageConfigRepository;

    public SettingsServiceImpl(TrackingPageConfigRepository trackingPageConfigRepository) {
        this.trackingPageConfigRepository = trackingPageConfigRepository;
    }

    private TrackingPageConfigMsg toMsg(TrackingPageConfig cfg) {
        return TrackingPageConfigMsg.newBuilder()
            .setBrandName(cfg.getBrandName())
            .setPrimaryColor(cfg.getPrimaryColor())
            .setLogoUrl(cfg.getLogoUrl() == null ? "" : cfg.getLogoUrl())
            .build();
    }

    @Override
    public void getTrackingPageConfig(Empty request, StreamObserver<TrackingPageConfigMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        TrackingPageConfig cfg = trackingPageConfigRepository.findByUserId(session.userId())
            .orElseGet(() -> {
                TrackingPageConfig c = new TrackingPageConfig();
                c.setUserId(session.userId());
                return c;
            });
        responseObserver.onNext(toMsg(cfg));
        responseObserver.onCompleted();
    }

    @Override
    public void updateTrackingPageConfig(UpdateTrackingPageConfigRequest request, StreamObserver<TrackingPageConfigMsg> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        TrackingPageConfig cfg = trackingPageConfigRepository.findByUserId(session.userId()).orElseGet(() -> {
            TrackingPageConfig c = new TrackingPageConfig();
            c.setUserId(session.userId());
            return c;
        });
        cfg.setBrandName(request.getBrandName());
        cfg.setPrimaryColor(request.getPrimaryColor());
        cfg.setLogoUrl(request.getLogoUrl().isBlank() ? null : request.getLogoUrl());
        TrackingPageConfig saved = trackingPageConfigRepository.save(cfg);
        responseObserver.onNext(toMsg(saved));
        responseObserver.onCompleted();
    }
}
