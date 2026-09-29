package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.*;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import com.hetex.service.NotifyService;
import com.hetex.service.RazorpayPaymentService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@GrpcService
public class WalletServiceImpl extends WalletServiceGrpc.WalletServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(WalletServiceImpl.class);

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final UserRepository userRepository;
    private final RazorpayPaymentService razorpayPaymentService;
    private final NotifyService notifyService;

    public WalletServiceImpl(
        WalletRepository walletRepository,
        WalletTransactionRepository walletTransactionRepository,
        UserRepository userRepository,
        RazorpayPaymentService razorpayPaymentService,
        NotifyService notifyService
    ) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.userRepository = userRepository;
        this.razorpayPaymentService = razorpayPaymentService;
        this.notifyService = notifyService;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private WalletTransactionMsg toMsg(WalletTransaction t) {
        WalletTransactionMsg.Builder b = WalletTransactionMsg.newBuilder()
            .setId(t.getId() != null ? t.getId() : "")
            .setType(t.getType() != null ? t.getType().name() : "CREDIT")
            .setAmount(t.getAmount())
            .setBalanceBefore(t.getBalanceBefore())
            .setBalanceAfter(t.getBalanceAfter())
            .setReason(t.getReason() != null ? t.getReason() : "")
            .setCreatedAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
        if (t.getPaymentProvider() != null) b.setPaymentProvider(t.getPaymentProvider());
        if (t.getPaymentReference() != null) b.setPaymentReference(t.getPaymentReference());
        if (t.getPaymentStatus() != null) b.setPaymentStatus(t.getPaymentStatus().name());
        return b.build();
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    /**
     * Core wallet-credit method — single source of truth.
     * All credit paths (checkout verification, webhook, QR webhook) funnel here.
     *
     * @param wallet           Managed wallet entity (will be saved)
     * @param amountRupees     Exact amount to credit
     * @param reason           Human-readable reason string
     * @param paymentProvider  e.g. "RAZORPAY"
     * @param paymentReference Idempotency key (payment_id or order_id)
     * @return saved WalletTransaction
     */
    @Transactional
    public WalletTransaction creditWallet(
        Wallet wallet,
        double amountRupees,
        String reason,
        String paymentProvider,
        String paymentReference
    ) {
        double roundedAmount = round2(amountRupees);
        double balanceBefore = round2(wallet.getBalance());
        double newBalance = round2(balanceBefore + roundedAmount);

        // Check if an existing transaction with this payment reference already exists
        WalletTransaction txn = null;
        if (paymentReference != null && !paymentReference.isBlank()) {
            var existing = walletTransactionRepository.findByPaymentReference(paymentReference);
            if (existing.isPresent()) {
                txn = existing.get();
                if (txn.getPaymentStatus() == PaymentTxnStatus.SUCCESS) {
                    log.info("Transaction {} already successful for reference {}. Skipping duplicate credit.", txn.getId(), paymentReference);
                    return txn;
                }
            }
        }

        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        if (txn == null) {
            txn = new WalletTransaction();
            txn.setWalletId(wallet.getId());
            txn.setUserId(wallet.getUserId());
            txn.setType(WalletTxnType.CREDIT);
            txn.setPaymentProvider(paymentProvider);
            txn.setPaymentReference(paymentReference);
        }

        txn.setUserId(wallet.getUserId());
        txn.setAmount(roundedAmount);
        txn.setBalanceBefore(balanceBefore);
        txn.setBalanceAfter(newBalance);
        txn.setReason(reason);
        txn.setPaymentStatus(PaymentTxnStatus.SUCCESS);
        txn.setUpdatedAt(Instant.now());
        return walletTransactionRepository.save(txn);
    }

    // -----------------------------------------------------------------------
    // GetWallet
    // -----------------------------------------------------------------------

    @Override
    public void getWallet(Empty request, StreamObserver<WalletResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Wallet wallet = walletRepository.findByUserId(session.userId())
            .orElseGet(() -> {
                Wallet newW = new Wallet();
                newW.setUserId(session.userId());
                newW.setBalance(0.0);
                return walletRepository.save(newW);
            });

        WalletResponse.Builder builder = WalletResponse.newBuilder().setBalance(wallet.getBalance());
        walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId())
            .forEach(t -> builder.addTransactions(toMsg(t)));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    // -----------------------------------------------------------------------
    // Step 1 — Create Razorpay Order (Checkout flow)
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public void createPaymentOrder(CreatePaymentOrderRequest request, StreamObserver<CreatePaymentOrderResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        if (request.getAmount() <= 0) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Amount must be greater than zero").asRuntimeException());
            return;
        }

        Wallet wallet = walletRepository.findByUserId(session.userId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());

        double roundedAmount = round2(request.getAmount());
        RazorpayPaymentService.PaymentOrderResult order = razorpayPaymentService.createOrder(roundedAmount);

        // Record a PENDING transaction for audit trail and webhook matching
        try {
            WalletTransaction pendingTxn = new WalletTransaction();
            pendingTxn.setWalletId(wallet.getId());
            pendingTxn.setUserId(session.userId());
            pendingTxn.setType(WalletTxnType.CREDIT);
            pendingTxn.setAmount(roundedAmount);
            pendingTxn.setBalanceBefore(wallet.getBalance());
            pendingTxn.setBalanceAfter(wallet.getBalance());
            pendingTxn.setReason("Wallet recharge via Razorpay Checkout (Pending)");
            pendingTxn.setPaymentProvider("RAZORPAY");
            pendingTxn.setPaymentReference(order.razorpayOrderId());
            pendingTxn.setPaymentStatus(PaymentTxnStatus.PENDING);
            walletTransactionRepository.save(pendingTxn);
        } catch (Exception e) {
            log.warn("Could not save pending transaction for order {}: {}", order.razorpayOrderId(), e.getMessage());
        }

        responseObserver.onNext(CreatePaymentOrderResponse.newBuilder()
            .setRazorpayOrderId(order.razorpayOrderId())
            .setAmount(order.amountRupees())
            .setCurrency(order.currency())
            .setRazorpayKeyId(order.keyId())
            .build());
        responseObserver.onCompleted();
    }

    // -----------------------------------------------------------------------
    // Step 2a — Verify Payment & Credit (Checkout flow)
    // The wallet is ONLY credited here — NEVER based on frontend assertion alone.
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public void verifyPayment(VerifyPaymentRequest request, StreamObserver<VerifyPaymentResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        // 1. Idempotency: if this payment_id was already processed, return success without re-crediting
        if (!request.getRazorpayPaymentId().isBlank()) {
            var existing = walletTransactionRepository.findByPaymentReference(request.getRazorpayPaymentId());
            if (existing.isPresent()) {
                log.info("Duplicate verifyPayment call for payment_id={}. Returning cached result.", request.getRazorpayPaymentId());
                Wallet wallet = walletRepository.findByUserId(session.userId()).orElseThrow();
                responseObserver.onNext(VerifyPaymentResponse.newBuilder()
                    .setSuccess(true)
                    .setBalance(wallet.getBalance())
                    .setMessage("Payment already processed")
                    .build());
                responseObserver.onCompleted();
                return;
            }
        }

        // 2. HMAC-SHA256 signature verification — the security gate
        boolean valid = razorpayPaymentService.verifySignature(
            request.getRazorpayOrderId(),
            request.getRazorpayPaymentId(),
            request.getRazorpaySignature()
        );

        if (!valid) {
            log.error("Razorpay signature verification failed for order={} payment={}",
                request.getRazorpayOrderId(), request.getRazorpayPaymentId());
            // Mark pending transaction as FAILED if exists
            walletTransactionRepository.findByPaymentReference(request.getRazorpayOrderId()).ifPresent(p -> {
                p.setPaymentStatus(PaymentTxnStatus.FAILED);
                p.setUpdatedAt(Instant.now());
                walletTransactionRepository.save(p);
            });
            responseObserver.onNext(VerifyPaymentResponse.newBuilder()
                .setSuccess(false)
                .setMessage("Payment verification failed — invalid signature")
                .build());
            responseObserver.onCompleted();
            return;
        }

        // 3. Fetch authoritative amount from Razorpay (prevent frontend tampering)
        double amountRupees = round2(request.getAmount());
        if (!request.getRazorpayPaymentId().isBlank()) {
            double fetchedAmount = razorpayPaymentService.fetchPaymentAmount(request.getRazorpayPaymentId());
            if (fetchedAmount > 0) {
                if (Math.abs(fetchedAmount - amountRupees) > 0.5) {
                    log.warn("Amount mismatch: frontend claimed ₹{} but Razorpay reports ₹{}. Using Razorpay amount.",
                        amountRupees, fetchedAmount);
                }
                amountRupees = round2(fetchedAmount);
            }
        }

        // 4. Credit the wallet
        Wallet wallet = walletRepository.findByUserId(session.userId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        String paymentRef = request.getRazorpayPaymentId().isBlank()
            ? request.getRazorpayOrderId()
            : request.getRazorpayPaymentId();

        WalletTransaction txn = creditWallet(
            wallet, amountRupees,
            "Wallet recharge via Razorpay (" + paymentRef + ")",
            "RAZORPAY", paymentRef
        );

        // 5. Notify user + admin (Requirement 8)
        User user = userRepository.findById(session.userId()).orElseThrow();
        notifyService.notifyAllChannels(session.userId(), user.getPhone(), user.getEmail(),
            String.format("₹%.2f added to your Hetex wallet. New balance: ₹%.2f. Ref: %s",
                amountRupees, txn.getBalanceAfter(), paymentRef),
            null);

        String userName = user.getBusinessName() != null && !user.getBusinessName().isBlank()
            ? user.getBusinessName()
            : user.getName();
        String adminMsg = String.format("Wallet Recharge Successful\n\nUser: %s\nAmount: ₹%.2f\nPayment: Razorpay\nPayment ID: %s\nStatus: Successful",
            userName, amountRupees, paymentRef);
        notifyService.notifyAdmins(adminMsg);

        log.info("Wallet credited ₹{} for user={} via Razorpay checkout. Txn={}",
            amountRupees, session.userId(), txn.getId());

        responseObserver.onNext(VerifyPaymentResponse.newBuilder()
            .setSuccess(true)
            .setBalance(txn.getBalanceAfter())
            .setMessage("Wallet recharged successfully")
            .build());
        responseObserver.onCompleted();
    }

    // -----------------------------------------------------------------------
    // QR Payment creation
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public void createQrPayment(CreateQrPaymentRequest request, StreamObserver<CreateQrPaymentResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        if (request.getAmount() <= 0) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Amount must be greater than zero").asRuntimeException());
            return;
        }

        Wallet wallet = walletRepository.findByUserId(session.userId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());

        double roundedAmount = round2(request.getAmount());
        RazorpayPaymentService.QrPaymentResult qr = razorpayPaymentService.createQrPayment(
            roundedAmount, request.getDescription()
        );

        // Record a PENDING transaction for QR tracking
        try {
            WalletTransaction pendingTxn = new WalletTransaction();
            pendingTxn.setWalletId(wallet.getId());
            pendingTxn.setUserId(session.userId());
            pendingTxn.setType(WalletTxnType.CREDIT);
            pendingTxn.setAmount(roundedAmount);
            pendingTxn.setBalanceBefore(wallet.getBalance());
            pendingTxn.setBalanceAfter(wallet.getBalance());
            pendingTxn.setReason("Wallet recharge via Razorpay UPI QR (Pending)");
            pendingTxn.setPaymentProvider("RAZORPAY");
            String ref = qr.razorpayOrderId() != null && !qr.razorpayOrderId().isBlank() ? qr.razorpayOrderId() : qr.qrCodeId();
            pendingTxn.setPaymentReference(ref);
            pendingTxn.setPaymentStatus(PaymentTxnStatus.PENDING);
            walletTransactionRepository.save(pendingTxn);
        } catch (Exception e) {
            log.warn("Could not save pending transaction for QR {}: {}", qr.qrCodeId(), e.getMessage());
        }

        String message = qr.isReal()
            ? "Scan the QR code with any UPI app to pay. Wallet will be credited automatically once payment is confirmed."
            : "Demo QR generated. Configure real Razorpay keys for live payments.";

        responseObserver.onNext(CreateQrPaymentResponse.newBuilder()
            .setQrCodeId(qr.qrCodeId())
            .setImageUrl(qr.imageUrl())
            .setRazorpayOrderId(qr.razorpayOrderId())
            .setAmount(qr.amountRupees())
            .setCurrency(qr.currency())
            .setIsReal(qr.isReal())
            .setMessage(message)
            .build());
        responseObserver.onCompleted();
    }

    // -----------------------------------------------------------------------
    // Legacy Recharge (kept for backward compatibility — no payment verification)
    // In production this SHOULD be removed or gated. Kept with a clear log.
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public void recharge(RechargeRequest request, StreamObserver<RechargeResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        if (request.getAmount() <= 0) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Amount must be positive").asRuntimeException());
            return;
        }

        log.warn("LEGACY recharge() called for user={}. This path bypasses payment verification. " +
            "Use createPaymentOrder + verifyPayment in production.", session.userId());

        Wallet wallet = walletRepository.findByUserId(session.userId()).orElseThrow();
        String ref = "legacy_" + System.currentTimeMillis();
        WalletTransaction txn = creditWallet(
            wallet, request.getAmount(),
            "Legacy wallet recharge (no payment verification)",
            null, ref
        );

        responseObserver.onNext(RechargeResponse.newBuilder().setBalance(txn.getBalanceAfter()).build());
        responseObserver.onCompleted();
    }

    // -----------------------------------------------------------------------
    // Webhook credit (called by RazorpayWebhookController — not a gRPC RPC)
    // -----------------------------------------------------------------------

    /**
     * Credits wallet after a verified Razorpay webhook event (payment.captured /
     * payment_link.paid / qr_code.credited). Idempotent: if the payment_id was already
     * processed, this is a no-op and returns the existing transaction.
     *
     * @param userId       Internal user ID owning the wallet (optional if resolvable via orderId)
     * @param paymentId    Razorpay payment_id (pay_…) — used as idempotency key
     * @param orderId      Razorpay order_id (order_…) or qr_code_id
     * @param amountRupees Amount in rupees (from Razorpay webhook payload)
     * @return existing or newly created WalletTransaction, null if user/wallet not found
     */
    @Transactional
    public WalletTransaction processWebhookCredit(String userId, String paymentId, String orderId, double amountRupees) {
        // 1. Idempotency check: if this payment_id was already processed and SUCCESS, return cached txn
        if (paymentId != null && !paymentId.isBlank()) {
            var existing = walletTransactionRepository.findByPaymentReference(paymentId);
            if (existing.isPresent() && existing.get().getPaymentStatus() == PaymentTxnStatus.SUCCESS) {
                log.info("Webhook already processed for paymentId={}. Skipping duplicate credit.", paymentId);
                return existing.get();
            }
        }

        // 2. Resolve userId from pending transaction if not provided
        if ((userId == null || userId.isBlank()) && orderId != null && !orderId.isBlank()) {
            var pending = walletTransactionRepository.findByPaymentReference(orderId);
            if (pending.isPresent()) {
                userId = pending.get().getUserId();
                log.info("Resolved userId={} from pending order={}", userId, orderId);
            }
        }

        if (userId == null || userId.isBlank()) {
            log.error("Unable to resolve userId for webhook credit. paymentId={}, orderId={}", paymentId, orderId);
            return null;
        }

        Wallet wallet = walletRepository.findByUserId(userId).orElse(null);
        if (wallet == null) {
            log.error("Wallet not found for userId={} during webhook processing for payment={}", userId, paymentId);
            return null;
        }

        double roundedAmount = round2(amountRupees);
        String paymentRef = (paymentId != null && !paymentId.isBlank()) ? paymentId : orderId;
        WalletTransaction txn = creditWallet(
            wallet, roundedAmount,
            "Wallet recharge via Razorpay (" + paymentRef + ")",
            "RAZORPAY", paymentRef
        );

        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            notifyService.notifyAllChannels(userId, user.getPhone(), user.getEmail(),
                String.format("₹%.2f added to your Hetex wallet via Razorpay. New balance: ₹%.2f. Ref: %s",
                    roundedAmount, txn.getBalanceAfter(), paymentRef),
                null);

            String userName = user.getBusinessName() != null && !user.getBusinessName().isBlank()
                ? user.getBusinessName()
                : user.getName();
            String adminMsg = String.format("Wallet Recharge Successful\n\nUser: %s\nAmount: ₹%.2f\nPayment: Razorpay\nPayment ID: %s\nStatus: Successful",
                userName, roundedAmount, paymentRef);
            notifyService.notifyAdmins(adminMsg);
        }

        log.info("Webhook credit processed: ₹{} → userId={} paymentId={} txnId={}",
            roundedAmount, userId, paymentRef, txn.getId());
        return txn;
    }

    @Transactional
    public WalletTransaction processWebhookCredit(String userId, String paymentId, double amountRupees) {
        return processWebhookCredit(userId, paymentId, null, amountRupees);
    }
}
