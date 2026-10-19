package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_events")
public class ProctoringEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ProctoringSession session;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ViolationSeverity severity = ViolationSeverity.LOW;

    @Column(nullable = false)
    private Double confidence = 1.0;

    @Column(name = "penalty_points", nullable = false)
    private Integer penaltyPoints = 0;

    @Column(name = "points_deducted", nullable = false)
    private Integer pointsDeducted = 0;

    @Column(name = "integrity_score_after", nullable = false)
    private Double integrityScoreAfter = 100.0;

    @Column(name = "warning_number")
    private Integer warningNumber;

    @Column(length = 255)
    private String description;

    @Column(name = "evidence_url", columnDefinition = "LONGTEXT")
    private String evidenceUrl;

    @Column(name = "violation_id", length = 100)
    private String violationId;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public ProctoringEvent() {
    }

    public ProctoringEvent(ProctoringSession session, String eventType, ViolationSeverity severity,
                           Double confidence, Integer penaltyPoints, String description,
                           String evidenceUrl, String metadataJson) {
        this(session, null, eventType, severity, confidence, penaltyPoints, 0, 100.0, null, description, evidenceUrl, metadataJson);
    }

    public ProctoringEvent(ProctoringSession session, String eventType, ViolationSeverity severity,
                           Double confidence, Integer penaltyPoints, Integer pointsDeducted,
                           Double integrityScoreAfter, Integer warningNumber,
                           String description, String evidenceUrl, String metadataJson) {
        this(session, null, eventType, severity, confidence, penaltyPoints, pointsDeducted, integrityScoreAfter, warningNumber, description, evidenceUrl, metadataJson);
    }

    public ProctoringEvent(ProctoringSession session, String violationId, String eventType, ViolationSeverity severity,
                           Double confidence, Integer penaltyPoints, Integer pointsDeducted,
                           Double integrityScoreAfter, Integer warningNumber,
                           String description, String evidenceUrl, String metadataJson) {
        this.session = session;
        this.violationId = violationId;
        this.eventType = eventType;
        this.severity = severity != null ? severity : ViolationSeverity.LOW;
        this.confidence = confidence != null ? confidence : 1.0;
        this.penaltyPoints = penaltyPoints != null ? penaltyPoints : 0;
        this.pointsDeducted = pointsDeducted != null ? pointsDeducted : 0;
        this.integrityScoreAfter = integrityScoreAfter != null ? integrityScoreAfter : 100.0;
        this.warningNumber = warningNumber;
        this.description = description;
        this.evidenceUrl = evidenceUrl;
        this.metadataJson = metadataJson;
        this.timestamp = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ProctoringSession getSession() {
        return session;
    }

    public void setSession(ProctoringSession session) {
        this.session = session;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public ViolationSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(ViolationSeverity severity) {
        this.severity = severity;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public Integer getPenaltyPoints() {
        return penaltyPoints;
    }

    public void setPenaltyPoints(Integer penaltyPoints) {
        this.penaltyPoints = penaltyPoints;
    }

    public Integer getPointsDeducted() {
        return pointsDeducted;
    }

    public void setPointsDeducted(Integer pointsDeducted) {
        this.pointsDeducted = pointsDeducted;
    }

    public Double getIntegrityScoreAfter() {
        return integrityScoreAfter;
    }

    public void setIntegrityScoreAfter(Double integrityScoreAfter) {
        this.integrityScoreAfter = integrityScoreAfter;
    }

    public Integer getWarningNumber() {
        return warningNumber;
    }

    public void setWarningNumber(Integer warningNumber) {
        this.warningNumber = warningNumber;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getEvidenceUrl() {
        return evidenceUrl;
    }

    public void setEvidenceUrl(String evidenceUrl) {
        this.evidenceUrl = evidenceUrl;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getViolationId() {
        return violationId;
    }

    public void setViolationId(String violationId) {
        this.violationId = violationId;
    }
}
