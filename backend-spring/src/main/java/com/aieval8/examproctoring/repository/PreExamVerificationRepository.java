package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.PreExamVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PreExamVerificationRepository extends JpaRepository<PreExamVerification, Long> {

    Optional<PreExamVerification> findTopByStudentIdAndExamIdAndVerifiedTrueAndConsumedFalseAndExpiresAtAfterOrderByVerifiedAtDesc(
            Long studentId, Long examId, LocalDateTime now);

    Optional<PreExamVerification> findTopByStudentIdAndExamIdAndVerifiedTrueAndExpiresAtAfterOrderByVerifiedAtDesc(
            Long studentId, Long examId, LocalDateTime now);

    Optional<PreExamVerification> findTopByStudentIdAndExamIdAndVerifiedTrueOrderByVerifiedAtDesc(
            Long studentId, Long examId);

    List<PreExamVerification> findByStudentIdAndExamIdOrderByCreatedAtDesc(Long studentId, Long examId);

    long countByStudentIdAndExamIdAndVerifiedFalseAndCreatedAtAfter(Long studentId, Long examId, LocalDateTime after);

    Optional<PreExamVerification> findByVerificationToken(String token);
}
