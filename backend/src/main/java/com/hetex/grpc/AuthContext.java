package com.hetex.grpc;

import com.hetex.service.JwtService;
import io.grpc.Context;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;

public final class AuthContext {

    public static final Context.Key<JwtService.SessionPayload> SESSION_KEY = Context.key("session");

    private AuthContext() {}

    public static JwtService.SessionPayload current() {
        return SESSION_KEY.get();
    }

    /** Throws UNAUTHENTICATED if no valid session is attached to the current gRPC call. */
    public static JwtService.SessionPayload requireSession() {
        JwtService.SessionPayload session = current();
        if (session == null) {
            throw new StatusRuntimeException(Status.UNAUTHENTICATED.withDescription("Unauthorized"));
        }
        return session;
    }

    public static JwtService.SessionPayload requireAdmin() {
        JwtService.SessionPayload session = requireSession();
        if (session.role() != com.hetex.entity.Role.ADMIN) {
            throw new StatusRuntimeException(Status.PERMISSION_DENIED.withDescription("Admin access required"));
        }
        return session;
    }
}
