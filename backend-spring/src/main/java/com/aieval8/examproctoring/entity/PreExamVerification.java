package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pre_exam_verifications")
public class PreExamVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "liveness_passed", nullable = false)
    private boolean livenessPassed = false;

    @Column(name = "match_distance")
    private Double matchDistance;

    @Column(nullable = false)
    private double threshold = 0.40;

    @Column
    private Double confidence;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber = 1;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "evidence_screenshot", columnDefinition = "LONGTEXT")
    private String evidenceScreenshot;

    @Column(name = "verification_token", length = 64)
    private String verificationToken;

    @Column(nullable = false)
    private boolean consumed = false;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PreExamVerification() {
    }

    public PreExamVerification(User student, Exam exam, boolean verified, boolean livenessPassed,
                               Double matchDistance, double threshold, Double confidence,
                               int attemptNumber, String failureReason, String evidenceScreenshot,
                               String verificationToken, LocalDateTime expiresAt) {
        this.student = student;
        this.exam = exam;
        this.verified = verified;
        this.livenessPassed = livenessPassed;
        this.matchDistance = matchDistance;
        this.threshold = threshold;
        this.confidence = confidence;
        this.attemptNumber = attemptNumber;
        this.failureReason = failureReason;
        this.evidenceScreenshot = evidenceScreenshot;
        this.verificationToken = verificationToken;
        this.consumed = false;
        this.verifiedAt = LocalDateTime.now();
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isLivenessPassed() {
        return livenessPassed;
    }

    public void setLivenessPassed(boolean livenessPassed) {
        this.livenessPassed = livenessPassed;
    }

    public Double getMatchDistance() {
        return matchDistance;
    }

    public void setMatchDistance(Double matchDistance) {
        this.matchDistance = matchDistance;
    }

    public double getThreshold() {
        return threshold;
    }

    public void setThreshold(double threshold) {
        this.threshold = threshold;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(int attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public String getEvidenceScreenshot() {
        return evidenceScreenshot;
    }

    public void setEvidenceScreenshot(String evidenceScreenshot) {
        this.evidenceScreenshot = evidenceScreenshot;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }

    public LocalDateTime getConsumedAt() {
        return consumedAt;
    }

    public void setConsumedAt(LocalDateTime consumedAt) {
        this.consumedAt = consumedAt;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
