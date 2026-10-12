package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.ProctoringSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProctoringSessionRepository extends JpaRepository<ProctoringSession, Long> {
    Optional<ProctoringSession> findByAttemptId(Long attemptId);
}
