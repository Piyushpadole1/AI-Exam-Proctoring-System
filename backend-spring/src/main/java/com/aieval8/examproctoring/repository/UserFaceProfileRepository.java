package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.entity.UserFaceProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserFaceProfileRepository extends JpaRepository<UserFaceProfile, Long> {
    Optional<UserFaceProfile> findByUser(User user);
    Optional<UserFaceProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    void deleteByUserId(Long userId);
}
