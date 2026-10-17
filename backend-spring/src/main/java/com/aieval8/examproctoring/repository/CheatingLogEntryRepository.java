package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.CheatingLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CheatingLogEntryRepository extends JpaRepository<CheatingLogEntry, Long> {
    List<CheatingLogEntry> findByExamIdOrderByCreatedAtDesc(String examId);
    List<CheatingLogEntry> findByExamId(String examId);
    java.util.Optional<CheatingLogEntry> findFirstByExamIdAndEmail(String examId, String email);
    void deleteByExamId(String examId);
}
