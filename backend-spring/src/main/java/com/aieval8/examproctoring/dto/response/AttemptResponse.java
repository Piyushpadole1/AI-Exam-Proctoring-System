package com.aieval8.examproctoring.dto.response;

import com.aieval8.examproctoring.entity.AttemptStatus;
import com.aieval8.examproctoring.entity.ExamAttempt;
import java.time.LocalDateTime;

public class AttemptResponse {

    private Long attemptId;
    private Long examId;
    private String examName;
    private String examCode;
    private Integer durationMinutes;
    private LocalDateTime startedAt;
    private LocalDateTime serverDeadline;
    private Long timeLeftSeconds;
    private AttemptStatus status;
    private String savedAnswers;
    private Double score;
    private Double percentage;
    private Boolean passed;
    private Double integrityScore;
    private String terminationReason;
    private String failReason;

    public AttemptResponse() {
    }

    public AttemptResponse(ExamAttempt attempt, Long timeLeftSeconds) {
        this.attemptId = attempt.getId();
        if (attempt.getExam() != null) {
            this.examId = attempt.getExam().getId();
            this.examName = attempt.getExam().getExamName();
            this.examCode = attempt.getExam().getExamCode();
            this.durationMinutes = attempt.getExam().getDurationMinutes();
        }
        this.startedAt = attempt.getStartedAt();
        this.serverDeadline = attempt.getServerDeadline();
        this.timeLeftSeconds = timeLeftSeconds;
        this.status = attempt.getStatus();
        this.savedAnswers = attempt.getSavedAnswers();
        this.score = attempt.getScore();
        this.percentage = attempt.getPercentage();
        this.passed = attempt.getPassed();
        this.integrityScore = attempt.getIntegrityScore();
        this.terminationReason = attempt.getTerminationReason();
        this.failReason = attempt.getFailReason();
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
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

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
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

    public Long getTimeLeftSeconds() {
        return timeLeftSeconds;
    }

    public void setTimeLeftSeconds(Long timeLeftSeconds) {
        this.timeLeftSeconds = timeLeftSeconds;
    }

    public AttemptStatus getStatus() {
        return status;
    }

    public void setStatus(AttemptStatus status) {
        this.status = status;
    }

    public String getSavedAnswers() {
        return savedAnswers;
    }

    public void setSavedAnswers(String savedAnswers) {
        this.savedAnswers = savedAnswers;
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

    public String getTerminationReason() {
        return terminationReason;
    }

    public void setTerminationReason(String terminationReason) {
        this.terminationReason = terminationReason;
    }

    public String getFailReason() {
        return failReason;
    }

    public void setFailReason(String failReason) {
        this.failReason = failReason;
    }
}
