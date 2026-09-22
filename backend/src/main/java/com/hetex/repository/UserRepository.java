package com.hetex.repository;

import com.hetex.entity.Role;
import com.hetex.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByPhone(String phone);
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
}
