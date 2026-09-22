package com.hetex.grpc;

import com.hetex.entity.*;
import com.hetex.grpc.proto.AuthResponse;
import com.hetex.grpc.proto.AuthServiceGrpc;
import com.hetex.grpc.proto.GetProfileRequest;
import com.hetex.grpc.proto.LoginRequest;
import com.hetex.grpc.proto.ProfileResponse;
import com.hetex.grpc.proto.RegisterRequest;
import com.hetex.grpc.proto.RegisterResponse;
import com.hetex.grpc.proto.RequestGstOtpRequest;
import com.hetex.grpc.proto.RequestGstOtpResponse;
import com.hetex.grpc.proto.ResendEmailOtpRequest;
import com.hetex.grpc.proto.SubmitEkycRequest;
import com.hetex.grpc.proto.VerifyEmailOtpRequest;
import com.hetex.repository.TrackingPageConfigRepository;
import com.hetex.repository.UserRepository;
import com.hetex.repository.WalletRepository;
import com.hetex.service.JwtService;
import com.hetex.service.OtpService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.regex.Pattern;

@GrpcService
public class AuthServiceImpl extends AuthServiceGrpc.AuthServiceImplBase {

    // Standard Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]$");
    // Standard Indian GSTIN format: 2-digit state code + PAN + entity code + 'Z' + checksum (e.g. 27ABCDE1234F1Z5).
    private static final Pattern GSTIN_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");
    private static final String GST_OTP_PREFIX = "gst-otp:";

    private final OtpService otpService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TrackingPageConfigRepository trackingPageConfigRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthServiceImpl(
        OtpService otpService, JwtService jwtService, UserRepository userRepository,
        WalletRepository walletRepository, TrackingPageConfigRepository trackingPageConfigRepository
    ) {
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.trackingPageConfigRepository = trackingPageConfigRepository;
    }

    private void provisionWalletAndTrackingPage(User user) {
        if (walletRepository.findByUserId(user.getId()).isEmpty()) {
            Wallet w = new Wallet();
            w.setUserId(user.getId());
            walletRepository.save(w);
        }
        if (trackingPageConfigRepository.findByUserId(user.getId()).isEmpty()) {
            TrackingPageConfig cfg = new TrackingPageConfig();
            cfg.setUserId(user.getId());
            cfg.setBrandName(user.getBusinessName() != null ? user.getBusinessName() : user.getName());
            trackingPageConfigRepository.save(cfg);
        }
    }

    private AuthResponse toAuthResponse(User user) {
        return AuthResponse.newBuilder()
            .setToken(jwtService.sign(user.getId(), user.getRole()))
            .setUserId(user.getId())
            .setName(user.getName())
            .setRole(user.getRole() == Role.ADMIN ? com.hetex.grpc.proto.Role.ADMIN : com.hetex.grpc.proto.Role.SELLER)
            .build();
    }

    @Override
    public void register(RegisterRequest request, StreamObserver<RegisterResponse> responseObserver) {
        if (request.getName().isBlank() || request.getEmail().isBlank() || request.getPhone().isBlank() || request.getPassword().length() < 6) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Name, email, phone, and a password of at least 6 characters are required").asRuntimeException());
            return;
        }

        User existing = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (existing != null && existing.isEmailVerified()) {
            responseObserver.onError(Status.ALREADY_EXISTS.withDescription("An account with this email already exists — please log in instead").asRuntimeException());
            return;
        }
        if (existing == null) {
            userRepository.findByPhone(request.getPhone()).ifPresent(u -> {
                throw Status.ALREADY_EXISTS.withDescription("An account with this phone number already exists").asRuntimeException();
            });
        }

        // Re-registering an unverified email just updates the pending details and resends the OTP.
        User user = existing != null ? existing : new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.SELLER);
        User saved = userRepository.save(user);
        provisionWalletAndTrackingPage(saved);

        String otp = otpService.requestOtp(request.getEmail());
        responseObserver.onNext(RegisterResponse.newBuilder().setEmail(request.getEmail()).setDevOtp(otp).build());
        responseObserver.onCompleted();
    }

    @Override
    public void resendEmailOtp(ResendEmailOtpRequest request, StreamObserver<RegisterResponse> responseObserver) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null || user.isEmailVerified()) {
            responseObserver.onError(Status.NOT_FOUND.withDescription("No pending registration found for this email").asRuntimeException());
            return;
        }
        String otp = otpService.requestOtp(request.getEmail());
        responseObserver.onNext(RegisterResponse.newBuilder().setEmail(request.getEmail()).setDevOtp(otp).build());
        responseObserver.onCompleted();
    }

    @Override
    public void verifyEmailOtp(VerifyEmailOtpRequest request, StreamObserver<AuthResponse> responseObserver) {
        boolean ok = otpService.verifyOtp(request.getEmail(), request.getCode());
        if (!ok) {
            responseObserver.onError(Status.UNAUTHENTICATED.withDescription("Incorrect or expired verification code").asRuntimeException());
            return;
        }
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            responseObserver.onError(Status.NOT_FOUND.withDescription("No pending registration found for this email").asRuntimeException());
            return;
        }
        user.setEmailVerified(true);
        User saved = userRepository.save(user);

        responseObserver.onNext(toAuthResponse(saved));
        responseObserver.onCompleted();
    }

    @Override
    public void login(LoginRequest request, StreamObserver<AuthResponse> responseObserver) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null || user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            responseObserver.onError(Status.UNAUTHENTICATED.withDescription("Incorrect email or password").asRuntimeException());
            return;
        }
        if (!user.isEmailVerified()) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Please verify your email before logging in").asRuntimeException());
            return;
        }

        responseObserver.onNext(toAuthResponse(user));
        responseObserver.onCompleted();
    }

    @Override
    public void getProfile(GetProfileRequest request, StreamObserver<ProfileResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        User user = userRepository.findById(session.userId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        double balance = walletRepository.findByUserId(user.getId()).map(Wallet::getBalance).orElse(0.0);
        responseObserver.onNext(toProfileResponse(user, balance));
        responseObserver.onCompleted();
    }

    /**
     * Mock: a live integration would ping the GST registry / a vendor like Digio to send an OTP to
     * the mobile registered against this GSTIN. Here the OTP is generated locally and handed back so
     * the demo UI can show it instead of it actually reaching a GST-registered phone.
     */
    @Override
    public void requestGstOtp(RequestGstOtpRequest request, StreamObserver<RequestGstOtpResponse> responseObserver) {
        AuthContext.requireSession();
        String gst = request.getGstNumber().trim().toUpperCase();
        if (!GSTIN_PATTERN.matcher(gst).matches()) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Enter a valid 15-character GSTIN").asRuntimeException());
            return;
        }
        String otp = otpService.requestOtp(GST_OTP_PREFIX + gst);
        responseObserver.onNext(RequestGstOtpResponse.newBuilder().setGstNumber(gst).setDevOtp(otp).build());
        responseObserver.onCompleted();
    }

    /**
     * Mock eKYC: a live integration would call a verification vendor (e.g. Digio/Signzy) with the
     * PAN/GST and consent; here a well-formed PAN plus a correct GST OTP (requested via
     * RequestGstOtp) is treated as verified so the flow can be demoed end-to-end without a real KYC
     * vendor account.
     */
    @Override
    public void submitEkyc(SubmitEkycRequest request, StreamObserver<ProfileResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        User user = userRepository.findById(session.userId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());

        if (!request.getConsent()) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Consent is required to verify KYC").asRuntimeException());
            return;
        }

        String gst = request.getGstNumber().trim().toUpperCase();
        if (gst.isBlank()) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("GSTIN is required for eKYC verification").asRuntimeException());
            return;
        }
        boolean gstOtpOk = otpService.verifyOtp(GST_OTP_PREFIX + gst, request.getGstOtp());
        if (!gstOtpOk) {
            responseObserver.onError(Status.UNAUTHENTICATED.withDescription("Incorrect or expired GST OTP — request a new one and try again").asRuntimeException());
            return;
        }

        String pan = request.getPanNumber().trim().toUpperCase();
        user.setPanNumber(pan);
        user.setGstNumber(gst);
        boolean panValid = PAN_PATTERN.matcher(pan).matches();
        boolean gstValid = GSTIN_PATTERN.matcher(gst).matches();
        user.setKycStatus(panValid && gstValid ? KycStatus.VERIFIED : KycStatus.REJECTED);
        User saved = userRepository.save(user);

        double balance = walletRepository.findByUserId(user.getId()).map(Wallet::getBalance).orElse(0.0);
        responseObserver.onNext(toProfileResponse(saved, balance));
        responseObserver.onCompleted();
    }

    private ProfileResponse toProfileResponse(User user, double walletBalance) {
        return ProfileResponse.newBuilder()
            .setId(user.getId())
            .setName(user.getName())
            .setEmail(user.getEmail() == null ? "" : user.getEmail())
            .setPhone(user.getPhone())
            .setBusinessName(user.getBusinessName() == null ? "" : user.getBusinessName())
            .setRole(user.getRole() == Role.ADMIN ? com.hetex.grpc.proto.Role.ADMIN : com.hetex.grpc.proto.Role.SELLER)
            .setKycStatus(mapKyc(user.getKycStatus()))
            .setPanNumber(user.getPanNumber() == null ? "" : user.getPanNumber())
            .setGstNumber(user.getGstNumber() == null ? "" : user.getGstNumber())
            .setWalletBalance(walletBalance)
            .build();
    }

    private com.hetex.grpc.proto.KycStatus mapKyc(com.hetex.entity.KycStatus status) {
        return switch (status) {
            case VERIFIED -> com.hetex.grpc.proto.KycStatus.KYC_VERIFIED;
            case REJECTED -> com.hetex.grpc.proto.KycStatus.KYC_REJECTED;
            default -> com.hetex.grpc.proto.KycStatus.KYC_PENDING;
        };
    }
}
