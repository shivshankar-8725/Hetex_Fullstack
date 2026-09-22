package com.hetex.repository;

import com.hetex.entity.Courier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourierRepository extends JpaRepository<Courier, String> {
    List<Courier> findByActiveTrue();
    Optional<Courier> findByCode(String code);
}
