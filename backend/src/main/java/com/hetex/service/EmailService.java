package com.hetex.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Real Email Delivery Service for Email OTP verification & transaction notifications.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${hetex.email.provider:MOCK}")
    private String emailProvider;

    @Value("${hetex.email.api-key:}")
    private String apiKey;

    @Value("${hetex.email.from-address:noreply@hetex.in}")
    private String fromAddress;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    /**
     * Sends an HTML OTP Verification email.
     *
     * @param toEmail Recipient email address
     * @param otp 6-digit verification code
     * @return true if dispatched successfully
     */
    public boolean sendOtpEmail(String toEmail, String otp) {
        log.info("[EMAIL-SERVICE] Dispatching OTP {} to email {}", otp, toEmail);

        if (apiKey == null || apiKey.isBlank() || "MOCK".equalsIgnoreCase(emailProvider)) {
            log.info("[EMAIL-SERVICE] (MOCK MODE) Email OTP for {}: {}", toEmail, otp);
            return true;
        }

        try {
            if ("RESEND".equalsIgnoreCase(emailProvider)) {
                return sendResendEmail(toEmail, otp);
            } else if ("SENDGRID".equalsIgnoreCase(emailProvider)) {
                return sendSendGridEmail(toEmail, otp);
            } else {
                log.info("[EMAIL-SERVICE] Simulated delivery for {}: {}", toEmail, otp);
                return true;
            }
        } catch (Exception e) {
            log.error("[EMAIL-SERVICE] Failed to send Email OTP to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }

    private boolean sendResendEmail(String toEmail, String otp) throws Exception {
        String jsonPayload = String.format(
            "{\"from\":\"Hetex Courier <%s>\",\"to\":[\"%s\"],\"subject\":\"Hetex Account Verification Code: %s\",\"html\":\"<div style='font-family:sans-serif;padding:20px;'><h2 style='color:#0284c7;'>Hetex Courier</h2><p>Your email verification code is:</p><h1 style='letter-spacing:4px;color:#1e293b;'>%s</h1><p>This code expires in 5 minutes.</p></div>\"}",
            fromAddress, toEmail, otp, otp
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.resend.com/emails"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[EMAIL-SERVICE] Resend API Response: {}", response.body());
        return response.statusCode() == 200 || response.statusCode() == 201;
    }

    private boolean sendSendGridEmail(String toEmail, String otp) throws Exception {
        String jsonPayload = String.format(
            "{\"personalizations\":[{\"to\":[{\"email\":\"%s\"}]}],\"from\":{\"email\":\"%s\",\"name\":\"Hetex Courier\"},\"subject\":\"Hetex Verification OTP: %s\",\"content\":[{\"type\":\"text/html\",\"value\":\"<h3>Your Hetex verification code is <b>%s</b></h3>\"}]}",
            toEmail, fromAddress, otp, otp
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[EMAIL-SERVICE] SendGrid API Response: {}", response.statusCode());
        return response.statusCode() == 202 || response.statusCode() == 200;
    }
}
