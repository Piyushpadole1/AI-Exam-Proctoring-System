package com.aieval8.examproctoring.dto.response;

public class ViolationResponse {

    private boolean success = true;
    private Double currentScore;
    private String classification;
    private boolean shouldTerminate;
    private String message;
    private Integer totalViolations;
    private Double fairnessScore;

    public ViolationResponse() {
    }

    public ViolationResponse(boolean success, Double currentScore, String classification, boolean shouldTerminate, String message) {
        this(success, currentScore, classification, shouldTerminate, message, null, null);
    }

    public ViolationResponse(boolean success, Double currentScore, String classification, boolean shouldTerminate, String message, Integer totalViolations, Double fairnessScore) {
        this.success = success;
        this.currentScore = currentScore;
        this.classification = classification;
        this.shouldTerminate = shouldTerminate;
        this.message = message;
        this.totalViolations = totalViolations;
        this.fairnessScore = fairnessScore;
    }

    public Integer getTotalViolations() {
        return totalViolations;
    }

    public Integer getRunningPoints() {
        return totalViolations;
    }

    public void setTotalViolations(Integer totalViolations) {
        this.totalViolations = totalViolations;
    }

    public Double getFairnessScore() {
        return fairnessScore;
    }

    public void setFairnessScore(Double fairnessScore) {
        this.fairnessScore = fairnessScore;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public Double getCurrentScore() {
        return currentScore;
    }

    public void setCurrentScore(Double currentScore) {
        this.currentScore = currentScore;
    }

    public String getClassification() {
        return classification;
    }

    public void setClassification(String classification) {
        this.classification = classification;
    }

    public boolean isShouldTerminate() {
        return shouldTerminate;
    }

    public void setShouldTerminate(boolean shouldTerminate) {
        this.shouldTerminate = shouldTerminate;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
