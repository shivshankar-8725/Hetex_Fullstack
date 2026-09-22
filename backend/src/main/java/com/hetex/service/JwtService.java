package com.hetex.service;

import com.hetex.entity.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final int expiryDays;

    public JwtService(
        @Value("${hetex.jwt.secret}") String secret,
        @Value("${hetex.jwt.expiry-days}") int expiryDays
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryDays = expiryDays;
    }

    public record SessionPayload(String userId, Role role) {}

    public String sign(String userId, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId)
            .claim("role", role.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expiryDays, ChronoUnit.DAYS)))
            .signWith(key)
            .compact();
    }

    public SessionPayload verify(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new SessionPayload(claims.getSubject(), Role.valueOf(claims.get("role", String.class)));
        } catch (Exception e) {
            return null;
        }
    }
}
