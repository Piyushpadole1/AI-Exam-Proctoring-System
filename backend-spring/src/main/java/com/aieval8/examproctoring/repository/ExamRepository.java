package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    Optional<Exam> findByExamCode(String examCode);
    List<Exam> findByTeacherId(Long teacherId);
    Optional<Exam> findByIdAndTeacherId(Long id, Long teacherId);
    List<Exam> findByClientId(Long clientId);
    List<Exam> findByStatus(String status);
    boolean existsByExamCode(String examCode);
}
