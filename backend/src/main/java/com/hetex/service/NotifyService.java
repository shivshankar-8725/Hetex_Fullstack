package com.hetex.service;

import com.hetex.entity.Notification;
import com.hetex.entity.NotifyChannel;
import com.hetex.entity.Role;
import com.hetex.entity.User;
import com.hetex.repository.NotificationRepository;
import com.hetex.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Writes a Notification row (visible in-app) instead of calling Interakt/MSG91/SES.
 * A live mode would call those SDKs here behind the same signature.
 */
@Service
public class NotifyService {

    private static final Logger log = LoggerFactory.getLogger(NotifyService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotifyService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public void notify(String userId, NotifyChannel channel, String recipient, String message, String orderId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setChannel(channel);
        n.setRecipient(recipient);
        n.setMessage(message);
        n.setOrderId(orderId);
        notificationRepository.save(n);
    }

    public void notifyAllChannels(String userId, String phone, String email, String message, String orderId) {
        notify(userId, NotifyChannel.WHATSAPP, phone, message, orderId);
        notify(userId, NotifyChannel.SMS, phone, message, orderId);
        if (email != null && !email.isBlank()) {
            notify(userId, NotifyChannel.EMAIL, email, message, orderId);
        }
    }

    /**
     * Creates an in-app admin notification for all administrator accounts.
     * Meets Requirement 8 for Wallet Recharge and external event alerts.
     */
    public void notifyAdmins(String message) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        if (admins.isEmpty()) {
            log.info("No admin accounts found to notify: {}", message);
            return;
        }
        for (User admin : admins) {
            Notification n = new Notification();
            n.setUserId(admin.getId());
            n.setChannel(NotifyChannel.EMAIL);
            n.setRecipient(admin.getEmail() != null && !admin.getEmail().isBlank() ? admin.getEmail() : admin.getPhone());
            n.setMessage(message);
            notificationRepository.save(n);
        }
        log.info("Dispatched notification to {} admin(s)", admins.size());
    }
}
