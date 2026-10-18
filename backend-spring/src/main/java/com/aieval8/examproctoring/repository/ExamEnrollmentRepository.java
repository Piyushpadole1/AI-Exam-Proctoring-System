package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.EnrollmentStatus;
import com.aieval8.examproctoring.entity.ExamEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamEnrollmentRepository extends JpaRepository<ExamEnrollment, Long> {
    Optional<ExamEnrollment> findByExamIdAndStudentId(Long examId, Long studentId);
    List<ExamEnrollment> findByExamId(Long examId);
    List<ExamEnrollment> findByExamIdAndStatus(Long examId, EnrollmentStatus status);
    List<ExamEnrollment> findByStudentId(Long studentId);
    List<ExamEnrollment> findByStudentIdAndStatus(Long studentId, EnrollmentStatus status);
    boolean existsByExamIdAndStudentIdAndStatus(Long examId, Long studentId, EnrollmentStatus status);
    boolean existsByExamIdAndStudentId(Long examId, Long studentId);
    void deleteByExamId(Long examId);
    void deleteByExamIdAndStudentId(Long examId, Long studentId);
    List<ExamEnrollment> findByExamTeacherId(Long teacherId);
    List<ExamEnrollment> findByExamTeacherIdAndStatus(Long teacherId, EnrollmentStatus status);
}
