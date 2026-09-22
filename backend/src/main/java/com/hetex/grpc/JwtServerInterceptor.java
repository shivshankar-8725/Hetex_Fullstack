package com.hetex.grpc;

import com.hetex.service.JwtService;
import io.grpc.*;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;

@GrpcGlobalServerInterceptor
public class JwtServerInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> AUTHORIZATION =
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);

    private final JwtService jwtService;

    public JwtServerInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
        ServerCall<ReqT, RespT> call, Metadata headers, ServerCallHandler<ReqT, RespT> next
    ) {
        String header = headers.get(AUTHORIZATION);
        Context context = Context.current();
        if (header != null && header.startsWith("Bearer ")) {
            JwtService.SessionPayload session = jwtService.verify(header.substring(7));
            if (session != null) {
                context = context.withValue(AuthContext.SESSION_KEY, session);
            }
        }
        return Contexts.interceptCall(context, call, headers, next);
    }
}
