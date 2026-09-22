package com.hetex.repository;

import com.hetex.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, String> {
    Optional<OtpCode> findFirstByIdentifierAndCodeAndConsumedFalseOrderByCreatedAtDesc(String identifier, String code);
}
