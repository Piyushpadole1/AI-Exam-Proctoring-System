package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.Role;
import com.aieval8.examproctoring.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByClientIdAndRole(Long clientId, Role role);
    List<User> findByClientId(Long clientId);
}
