package com.hetex.repository;

import com.hetex.entity.Address;
import com.hetex.entity.AddressType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, String> {
    List<Address> findByUserIdAndTypeOrderByIsDefaultDescCreatedAtDesc(String userId, AddressType type);
    List<Address> findByUserIdOrderByTypeAscIsDefaultDescCreatedAtDesc(String userId);
    Optional<Address> findFirstByUserIdAndTypeOrderByIsDefaultDesc(String userId, AddressType type);
}
