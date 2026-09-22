package com.hetex.service;

import com.hetex.entity.Notification;
import com.hetex.entity.NotifyChannel;
import com.hetex.repository.NotificationRepository;
import org.springframework.stereotype.Service;

/**
 * Writes a Notification row (visible in-app) instead of calling Interakt/MSG91/SES.
 * A live mode would call those SDKs here behind the same signature.
 */
@Service
public class NotifyService {

    private final NotificationRepository notificationRepository;

    public NotifyService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
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
}
