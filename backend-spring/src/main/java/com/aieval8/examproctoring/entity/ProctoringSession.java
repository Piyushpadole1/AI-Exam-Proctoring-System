package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_sessions")
public class ProctoringSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false, unique = true)
    private ExamAttempt attempt;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "event_score", nullable = false)
    private Double eventScore = 0.0;

    @Column(name = "ai_score", nullable = false)
    private Double aiScore = 0.0;

    @Column(name = "hybrid_score", nullable = false)
    private Double hybridScore = 0.0;

    @Column(name = "integrity_score", nullable = false)
    private Double integrityScore = 100.0;

    @Column(nullable = false, length = 20)
    private String verdict = "SAFE";

    @Column(name = "total_violations", nullable = false)
    private Integer totalViolations = 0;

    @Column(name = "face_verification_status", length = 30)
    private String faceVerificationStatus = "PENDING";

    @Column(name = "consecutive_face_mismatches", nullable = false)
    private int consecutiveFaceMismatches = 0;

    @Column(name = "total_face_mismatches", nullable = false)
    private int totalFaceMismatches = 0;

    @Column(name = "violation_summary_json", columnDefinition = "TEXT")
    private String violationSummaryJson = "{}";

    public ProctoringSession() {
    }

    public ProctoringSession(ExamAttempt attempt) {
        this.attempt = attempt;
        this.startedAt = LocalDateTime.now();
        this.eventScore = 0.0;
        this.aiScore = 0.0;
        this.hybridScore = 0.0;
        this.integrityScore = 100.0;
        this.verdict = "SAFE";
        this.totalViolations = 0;
        this.violationSummaryJson = "{}";
    }

    @PrePersist
    protected void onCreate() {
        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now();
        }
        if (this.verdict == null) {
            this.verdict = "SAFE";
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExamAttempt getAttempt() {
        return attempt;
    }

    public void setAttempt(ExamAttempt attempt) {
        this.attempt = attempt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public Double getEventScore() {
        return eventScore;
    }

    public void setEventScore(Double eventScore) {
        this.eventScore = eventScore;
    }

    public Double getAiScore() {
        return aiScore;
    }

    public void setAiScore(Double aiScore) {
        this.aiScore = aiScore;
    }

    public Double getHybridScore() {
        return hybridScore;
    }

    public void setHybridScore(Double hybridScore) {
        this.hybridScore = hybridScore;
    }

    public Double getIntegrityScore() {
        return integrityScore;
    }

    public void setIntegrityScore(Double integrityScore) {
        this.integrityScore = integrityScore;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public Integer getTotalViolations() {
        return totalViolations;
    }

    public void setTotalViolations(Integer totalViolations) {
        this.totalViolations = totalViolations;
    }

    public String getViolationSummaryJson() {
        return violationSummaryJson;
    }

    public void setViolationSummaryJson(String violationSummaryJson) {
        this.violationSummaryJson = violationSummaryJson;
    }

    public String getFaceVerificationStatus() {
        return faceVerificationStatus;
    }

    public void setFaceVerificationStatus(String faceVerificationStatus) {
        this.faceVerificationStatus = faceVerificationStatus;
    }

    public int getConsecutiveFaceMismatches() {
        return consecutiveFaceMismatches;
    }

    public void setConsecutiveFaceMismatches(int consecutiveFaceMismatches) {
        this.consecutiveFaceMismatches = consecutiveFaceMismatches;
    }

    public int getTotalFaceMismatches() {
        return totalFaceMismatches;
    }

    public void setTotalFaceMismatches(int totalFaceMismatches) {
        this.totalFaceMismatches = totalFaceMismatches;
    }
}
