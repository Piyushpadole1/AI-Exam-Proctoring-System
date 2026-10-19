package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, Long> {
    List<ProctoringEvent> findBySessionIdOrderByTimestampAsc(Long sessionId);
    java.util.Optional<ProctoringEvent> findByViolationId(String violationId);
    long countBySessionId(Long sessionId);
    void deleteBySessionId(Long sessionId);
}
