package com.hetex.repository;

import com.hetex.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, String> {

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(String walletId);

    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(String userId);

    List<WalletTransaction> findAllByOrderByCreatedAtDesc();

    /**
     * Idempotency check: find an existing transaction by its payment provider reference.
     * Used to prevent duplicate wallet credits when Razorpay webhooks are replayed.
     */
    Optional<WalletTransaction> findByPaymentReference(String paymentReference);
}
