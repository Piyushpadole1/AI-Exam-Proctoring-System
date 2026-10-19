package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cheating_logs")
public class CheatingLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id", nullable = false)
    private String examId;

    private String username;

    private String email;

    @Column(name = "no_face_count")
    private Integer noFaceCount = 0;

    @Column(name = "multiple_face_count")
    private Integer multipleFaceCount = 0;

    @Column(name = "cell_phone_count")
    private Integer cellPhoneCount = 0;

    @Column(name = "prohibited_object_count")
    private Integer prohibitedObjectCount = 0;

    @Column(name = "screenshots_json", columnDefinition = "LONGTEXT")
    private String screenshotsJson = "[]";

    @Column(name = "fairness_score")
    private Double fairnessScore = 100.0;

    private String verdict = "SAFE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public CheatingLogEntry() {
    }

    public CheatingLogEntry(String examId, String username, String email,
                            Integer noFaceCount, Integer multipleFaceCount,
                            Integer cellPhoneCount, Integer prohibitedObjectCount,
                            String screenshotsJson) {
        this.examId = examId;
        this.username = username;
        this.email = email;
        this.noFaceCount = noFaceCount != null ? noFaceCount : 0;
        this.multipleFaceCount = multipleFaceCount != null ? multipleFaceCount : 0;
        this.cellPhoneCount = cellPhoneCount != null ? cellPhoneCount : 0;
        this.prohibitedObjectCount = prohibitedObjectCount != null ? prohibitedObjectCount : 0;
        this.screenshotsJson = screenshotsJson != null ? screenshotsJson : "[]";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getExamId() {
        return examId;
    }

    public void setExamId(String examId) {
        this.examId = examId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getNoFaceCount() {
        return noFaceCount;
    }

    public void setNoFaceCount(Integer noFaceCount) {
        this.noFaceCount = noFaceCount;
    }

    public Integer getMultipleFaceCount() {
        return multipleFaceCount;
    }

    public void setMultipleFaceCount(Integer multipleFaceCount) {
        this.multipleFaceCount = multipleFaceCount;
    }

    public Integer getCellPhoneCount() {
        return cellPhoneCount;
    }

    public void setCellPhoneCount(Integer cellPhoneCount) {
        this.cellPhoneCount = cellPhoneCount;
    }

    public Integer getProhibitedObjectCount() {
        return prohibitedObjectCount;
    }

    public void setProhibitedObjectCount(Integer prohibitedObjectCount) {
        this.prohibitedObjectCount = prohibitedObjectCount;
    }

    public String getScreenshotsJson() {
        return screenshotsJson;
    }

    public void setScreenshotsJson(String screenshotsJson) {
        this.screenshotsJson = screenshotsJson;
    }

    public Double getFairnessScore() {
        return fairnessScore;
    }

    public void setFairnessScore(Double fairnessScore) {
        this.fairnessScore = fairnessScore;
    }

    public Double getIntegrityScore() {
        return fairnessScore;
    }

    public void setIntegrityScore(Double integrityScore) {
        this.fairnessScore = integrityScore;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
