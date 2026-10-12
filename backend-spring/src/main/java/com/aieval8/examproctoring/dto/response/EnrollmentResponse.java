package com.aieval8.examproctoring.dto.response;

import com.aieval8.examproctoring.entity.EnrollmentStatus;
import com.aieval8.examproctoring.entity.ExamEnrollment;
import java.time.LocalDateTime;

public class EnrollmentResponse {

    private Long id;
    private Long examId;
    private String examName;
    private String examCode;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private String studentIdNumber;
    private EnrollmentStatus status;
    private LocalDateTime enrolledAt;
    private Integer attemptLimit;
    private Integer attemptsUsed;

    public EnrollmentResponse() {
    }

    public EnrollmentResponse(ExamEnrollment enrollment) {
        this.id = enrollment.getId();
        if (enrollment.getExam() != null) {
            this.examId = enrollment.getExam().getId();
            this.examName = enrollment.getExam().getExamName();
            this.examCode = enrollment.getExam().getExamCode();
        }
        if (enrollment.getStudent() != null) {
            this.studentId = enrollment.getStudent().getId();
            this.studentName = enrollment.getStudent().getName();
            this.studentEmail = enrollment.getStudent().getEmail();
            this.studentIdNumber = enrollment.getStudent().getStudentIdNumber();
        }
        this.status = enrollment.getStatus();
        this.enrolledAt = enrollment.getEnrolledAt();
        this.attemptLimit = enrollment.getAttemptLimit();
        this.attemptsUsed = enrollment.getAttemptsUsed();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getExamId() {
        return examId;
    }

    public void setExamId(Long examId) {
        this.examId = examId;
    }

    public String getExamName() {
        return examName;
    }

    public void setExamName(String examName) {
        this.examName = examName;
    }

    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getStudentIdNumber() {
        return studentIdNumber;
    }

    public void setStudentIdNumber(String studentIdNumber) {
        this.studentIdNumber = studentIdNumber;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public void setStatus(EnrollmentStatus status) {
        this.status = status;
    }

    public LocalDateTime getEnrolledAt() {
        return enrolledAt;
    }

    public void setEnrolledAt(LocalDateTime enrolledAt) {
        this.enrolledAt = enrolledAt;
    }

    public Integer getAttemptLimit() {
        return attemptLimit;
    }

    public void setAttemptLimit(Integer attemptLimit) {
        this.attemptLimit = attemptLimit;
    }

    public Integer getAttemptsUsed() {
        return attemptsUsed;
    }

    public void setAttemptsUsed(Integer attemptsUsed) {
        this.attemptsUsed = attemptsUsed;
    }
}
