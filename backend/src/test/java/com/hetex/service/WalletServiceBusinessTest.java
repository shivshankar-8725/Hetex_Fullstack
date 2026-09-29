package com.hetex.service;

import com.hetex.entity.*;
import com.hetex.grpc.WalletServiceImpl;
import com.hetex.repository.UserRepository;
import com.hetex.repository.WalletRepository;
import com.hetex.repository.WalletTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WalletServiceBusinessTest {

    private WalletRepository walletRepository;
    private WalletTransactionRepository walletTransactionRepository;
    private UserRepository userRepository;
    private RazorpayPaymentService razorpayPaymentService;
    private NotifyService notifyService;

    private WalletServiceImpl walletService;

    @BeforeEach
    void setUp() {
        walletRepository = mock(WalletRepository.class);
        walletTransactionRepository = mock(WalletTransactionRepository.class);
        userRepository = mock(UserRepository.class);
        razorpayPaymentService = mock(RazorpayPaymentService.class);
        notifyService = mock(NotifyService.class);

        walletService = new WalletServiceImpl(
            walletRepository,
            walletTransactionRepository,
            userRepository,
            razorpayPaymentService,
            notifyService
        );
    }

    @Test
    @DisplayName("creditWallet updates balance atomically and stores correct transaction")
    void testCreditWalletAtomic() {
        Wallet wallet = new Wallet();
        wallet.setId("w_123");
        wallet.setUserId("u_123");
        wallet.setBalance(150.50);

        when(walletTransactionRepository.findByPaymentReference("pay_abc")).thenReturn(Optional.empty());
        when(walletTransactionRepository.save(any(WalletTransaction.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        WalletTransaction txn = walletService.creditWallet(
            wallet, 500.25, "Recharge via Razorpay", "RAZORPAY", "pay_abc"
        );

        assertNotNull(txn);
        assertEquals(150.50, txn.getBalanceBefore());
        assertEquals(650.75, txn.getBalanceAfter());
        assertEquals(500.25, txn.getAmount());
        assertEquals(PaymentTxnStatus.SUCCESS, txn.getPaymentStatus());
        assertEquals(WalletTxnType.CREDIT, txn.getType());
        assertEquals("pay_abc", txn.getPaymentReference());
        assertEquals("RAZORPAY", txn.getPaymentProvider());

        // Verify wallet updated
        assertEquals(650.75, wallet.getBalance());
        verify(walletRepository).save(wallet);
        verify(walletTransactionRepository).save(any(WalletTransaction.class));
    }

    @Test
    @DisplayName("Idempotency: duplicate payment reference does not double credit wallet")
    void testDuplicatePaymentReferenceIdempotent() {
        Wallet wallet = new Wallet();
        wallet.setId("w_123");
        wallet.setUserId("u_123");
        wallet.setBalance(200.00);

        WalletTransaction existing = new WalletTransaction();
        existing.setId("tx_existing");
        existing.setWalletId("w_123");
        existing.setPaymentReference("pay_duplicate_123");
        existing.setPaymentStatus(PaymentTxnStatus.SUCCESS);
        existing.setAmount(100.0);
        existing.setBalanceAfter(200.00);

        when(walletTransactionRepository.findByPaymentReference("pay_duplicate_123"))
            .thenReturn(Optional.of(existing));

        // Attempting to credit again with identical payment ID
        WalletTransaction result = walletService.creditWallet(
            wallet, 100.0, "Duplicate attempt", "RAZORPAY", "pay_duplicate_123"
        );

        assertSame(existing, result, "Should return existing transaction without creating new one");
        assertEquals(200.00, wallet.getBalance(), "Wallet balance must remain unchanged");
        verify(walletRepository, never()).save(wallet);
    }

    @Test
    @DisplayName("processWebhookCredit resolves user and dispatches admin notification")
    void testProcessWebhookCreditWithAdminNotification() {
        String userId = "usr_seller_1";
        String paymentId = "pay_live_777";
        double amount = 1000.0;

        Wallet wallet = new Wallet();
        wallet.setId("w_456");
        wallet.setUserId(userId);
        wallet.setBalance(50.0);

        User user = new User();
        user.setId(userId);
        user.setName("Alice Sharma");
        user.setBusinessName("Sharma Logistics");
        user.setPhone("9876543210");
        user.setEmail("alice@sharma.com");

        when(walletTransactionRepository.findByPaymentReference(paymentId)).thenReturn(Optional.empty());
        when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletTransactionRepository.save(any(WalletTransaction.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        WalletTransaction txn = walletService.processWebhookCredit(userId, paymentId, null, amount);

        assertNotNull(txn);
        assertEquals(1050.0, wallet.getBalance());

        // Verify admin notification format (Requirement 8)
        ArgumentCaptor<String> adminMsgCaptor = ArgumentCaptor.forClass(String.class);
        verify(notifyService).notifyAdmins(adminMsgCaptor.capture());

        String adminMsg = adminMsgCaptor.getValue();
        assertTrue(adminMsg.contains("Wallet Recharge Successful"));
        assertTrue(adminMsg.contains("User: Sharma Logistics"));
        assertTrue(adminMsg.contains("Amount: ₹1000.00"));
        assertTrue(adminMsg.contains("Payment ID: pay_live_777"));
        assertTrue(adminMsg.contains("Status: Successful"));
    }

    @Test
    @DisplayName("processWebhookCredit is idempotent when repeated webhook arrives")
    void testProcessWebhookCreditIdempotent() {
        String paymentId = "pay_live_888";
        WalletTransaction existing = new WalletTransaction();
        existing.setId("tx_888");
        existing.setPaymentReference(paymentId);
        existing.setPaymentStatus(PaymentTxnStatus.SUCCESS);

        when(walletTransactionRepository.findByPaymentReference(paymentId)).thenReturn(Optional.of(existing));

        WalletTransaction result = walletService.processWebhookCredit("usr_1", paymentId, null, 500.0);

        assertSame(existing, result);
        verify(walletRepository, never()).save(any());
        verify(notifyService, never()).notifyAdmins(anyString());
    }
}
