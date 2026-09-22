package com.hetex.service;

import com.hetex.entity.OtpCode;
import com.hetex.repository.OtpCodeRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Generates a real OTP and stores it, but instead of sending it via MSG91/SES hands it
 * straight back so the UI can display it (clearly labelled "dev OTP") for demo purposes.
 * A live mode would send via SMS/email and omit it from the response.
 */
@Service
public class OtpService {

    private static final int TTL_MINUTES = 5;
    private final OtpCodeRepository otpCodeRepository;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpCodeRepository otpCodeRepository) {
        this.otpCodeRepository = otpCodeRepository;
    }

    public String requestOtp(String identifier) {
        String code = String.valueOf(100000 + random.nextInt(900000));
        OtpCode otp = new OtpCode();
        otp.setIdentifier(identifier);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plus(TTL_MINUTES, ChronoUnit.MINUTES));
        otpCodeRepository.save(otp);
        return code;
    }

    public boolean verifyOtp(String identifier, String code) {
        return otpCodeRepository.findFirstByIdentifierAndCodeAndConsumedFalseOrderByCreatedAtDesc(identifier, code)
            .filter(otp -> otp.getExpiresAt().isAfter(Instant.now()))
            .map(otp -> {
                otp.setConsumed(true);
                otpCodeRepository.save(otp);
                return true;
            })
            .orElse(false);
    }
}
