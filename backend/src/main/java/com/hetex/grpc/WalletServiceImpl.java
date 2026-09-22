package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.Wallet;
import com.hetex.entity.WalletTransaction;
import com.hetex.entity.WalletTxnType;
import com.hetex.grpc.proto.RechargeRequest;
import com.hetex.grpc.proto.RechargeResponse;
import com.hetex.grpc.proto.WalletResponse;
import com.hetex.grpc.proto.WalletServiceGrpc;
import com.hetex.grpc.proto.WalletTransactionMsg;
import com.hetex.repository.WalletRepository;
import com.hetex.repository.WalletTransactionRepository;
import com.hetex.service.JwtService;
import com.hetex.service.MockPaymentService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

@GrpcService
public class WalletServiceImpl extends WalletServiceGrpc.WalletServiceImplBase {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final MockPaymentService paymentService;

    public WalletServiceImpl(WalletRepository walletRepository, WalletTransactionRepository walletTransactionRepository, MockPaymentService paymentService) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.paymentService = paymentService;
    }

    @Override
    public void getWallet(Empty request, StreamObserver<WalletResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Wallet wallet = walletRepository.findByUserId(session.userId()).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());

        WalletResponse.Builder builder = WalletResponse.newBuilder().setBalance(wallet.getBalance());
        walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId()).forEach(t -> builder.addTransactions(
            WalletTransactionMsg.newBuilder()
                .setId(t.getId())
                .setType(t.getType().name())
                .setAmount(t.getAmount())
                .setBalanceAfter(t.getBalanceAfter())
                .setReason(t.getReason())
                .setCreatedAt(t.getCreatedAt().toString())
                .build()
        ));
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void recharge(RechargeRequest request, StreamObserver<RechargeResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();

        MockPaymentService.PaymentOrder paymentOrder = paymentService.createOrder(request.getAmount());
        MockPaymentService.PaymentVerification verification = paymentService.verifyPayment(paymentOrder.paymentOrderId());
        if (!verification.success()) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("Payment failed").asRuntimeException());
            return;
        }

        Wallet wallet = walletRepository.findByUserId(session.userId()).orElseThrow();
        double newBalance = wallet.getBalance() + request.getAmount();
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction txn = new WalletTransaction();
        txn.setWalletId(wallet.getId());
        txn.setType(WalletTxnType.CREDIT);
        txn.setAmount(request.getAmount());
        txn.setBalanceAfter(newBalance);
        txn.setReason("Wallet recharge via Razorpay (" + verification.paymentId() + ")");
        walletTransactionRepository.save(txn);

        responseObserver.onNext(RechargeResponse.newBuilder().setBalance(newBalance).build());
        responseObserver.onCompleted();
    }
}
