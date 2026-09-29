package com.hetex.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Real SMS Integration Service for Phone OTP & Notifications.
 * Supports MSG91 / Fast2SMS / Custom REST Gateways.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${hetex.sms.provider:MOCK}")
    private String smsProvider;

    @Value("${hetex.sms.api-key:}")
    private String apiKey;

    @Value("${hetex.sms.sender-id:HETEX}")
    private String senderId;

    @Value("${hetex.sms.template-id:}")
    private String templateId;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    /**
     * Sends OTP SMS to the provided phone number.
     *
     * @param phone Indian mobile number (10 digits or with +91)
     * @param otp 6-digit verification code
     * @return true if dispatched successfully
     */
    public boolean sendOtpSms(String phone, String otp) {
        String cleanPhone = phone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() > 10) {
            cleanPhone = cleanPhone.substring(cleanPhone.length() - 10);
        }

        String message = String.format("Your Hetex Courier verification code is %s. Valid for 5 minutes. Do not share with anyone.", otp);
        log.info("[SMS-SERVICE] Dispatching OTP {} to phone {}", otp, cleanPhone);

        if (apiKey == null || apiKey.isBlank() || "MOCK".equalsIgnoreCase(smsProvider)) {
            log.info("[SMS-SERVICE] (MOCK MODE) OTP for {}: {}", cleanPhone, otp);
            return true;
        }

        try {
            if ("FAST2SMS".equalsIgnoreCase(smsProvider)) {
                return sendFast2Sms(cleanPhone, message);
            } else if ("MSG91".equalsIgnoreCase(smsProvider)) {
                return sendMsg91(cleanPhone, otp);
            } else {
                return sendGenericHttpSms(cleanPhone, message);
            }
        } catch (Exception e) {
            log.error("[SMS-SERVICE] Failed to send SMS to {}: {}", cleanPhone, e.getMessage(), e);
            return false;
        }
    }

    private boolean sendFast2Sms(String phone, String message) throws Exception {
        String url = "https://www.fast2sms.com/dev/bulkV2?authorization=" + apiKey +
            "&route=q&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8) +
            "&language=english&flash=0&numbers=" + phone;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[SMS-SERVICE] Fast2SMS Response: {}", response.body());
        return response.statusCode() == 200;
    }

    private boolean sendMsg91(String phone, String otp) throws Exception {
        String jsonPayload = String.format(
            "{\"authkey\":\"%s\",\"template_id\":\"%s\",\"mobile\":\"91%s\",\"otp\":\"%s\"}",
            apiKey, templateId, phone, otp
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://control.msg91.com/api/v5/otp"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[SMS-SERVICE] MSG91 Response: {}", response.body());
        return response.statusCode() == 200;
    }

    private boolean sendGenericHttpSms(String phone, String message) throws Exception {
        String url = String.format("https://api.textlocal.in/send/?apikey=%s&numbers=91%s&message=%s&sender=%s",
            apiKey, phone, URLEncoder.encode(message, StandardCharsets.UTF_8), senderId);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[SMS-SERVICE] Generic SMS API Response: {}", response.body());
        return response.statusCode() == 200;
    }
}
