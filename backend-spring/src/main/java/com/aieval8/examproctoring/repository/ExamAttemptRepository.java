package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.AttemptStatus;
import com.aieval8.examproctoring.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    List<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);
    List<ExamAttempt> findByStudentId(Long studentId);
    List<ExamAttempt> findByExamId(Long examId);
    Optional<ExamAttempt> findFirstByExamIdAndStudentIdAndStatus(Long examId, Long studentId, AttemptStatus status);
    long countByEnrollmentId(Long enrollmentId);
    List<ExamAttempt> findByEnrollmentId(Long enrollmentId);
    void deleteByExamId(Long examId);
}
