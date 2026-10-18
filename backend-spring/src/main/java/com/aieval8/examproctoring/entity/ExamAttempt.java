package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_attempts")
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = true)
    private ExamEnrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "server_deadline", nullable = false)
    private LocalDateTime serverDeadline;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    private Double score = 0.0;

    private Double percentage = 0.0;

    private Boolean passed = false;

    @Column(name = "integrity_score", nullable = false)
    private Double integrityScore = 100.0;

    @Column(name = "device_info", columnDefinition = "TEXT")
    private String deviceInfo;

    @Column(name = "saved_answers", columnDefinition = "LONGTEXT")
    private String savedAnswers;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ExamAttempt() {
    }

    public ExamAttempt(ExamEnrollment enrollment, Exam exam, User student, LocalDateTime serverDeadline, String deviceInfo) {
        this.enrollment = enrollment;
        this.exam = exam;
        this.student = student;
        this.startedAt = LocalDateTime.now();
        this.serverDeadline = serverDeadline;
        this.deviceInfo = deviceInfo;
        this.status = AttemptStatus.IN_PROGRESS;
        this.integrityScore = 100.0;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now();
        }
        if (this.integrityScore == null) {
            this.integrityScore = 100.0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExamEnrollment getEnrollment() {
        return enrollment;
    }

    public void setEnrollment(ExamEnrollment enrollment) {
        this.enrollment = enrollment;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getServerDeadline() {
        return serverDeadline;
    }

    public void setServerDeadline(LocalDateTime serverDeadline) {
        this.serverDeadline = serverDeadline;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public AttemptStatus getStatus() {
        return status;
    }

    public void setStatus(AttemptStatus status) {
        this.status = status;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public Boolean getPassed() {
        return passed;
    }

    public void setPassed(Boolean passed) {
        this.passed = passed;
    }

    public Double getIntegrityScore() {
        return integrityScore;
    }

    public void setIntegrityScore(Double integrityScore) {
        this.integrityScore = integrityScore;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public String getSavedAnswers() {
        return savedAnswers;
    }

    public void setSavedAnswers(String savedAnswers) {
        this.savedAnswers = savedAnswers;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
