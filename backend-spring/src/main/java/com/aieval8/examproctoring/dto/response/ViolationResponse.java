package com.aieval8.examproctoring.dto.response;

public class ViolationResponse {

    private boolean success = true;
    private Double currentScore;
    private String classification;
    private boolean shouldTerminate;
    private String message;
    private Integer totalViolations;
    private Double fairnessScore;
    private Double integrityScore;
    private Integer pointsDeducted;
    private Integer warningNumber;
    private String terminationReason;

    public ViolationResponse() {
    }

    public ViolationResponse(boolean success, Double currentScore, String classification, boolean shouldTerminate, String message) {
        this(success, currentScore, classification, shouldTerminate, message, null, null, currentScore, 0, null, null);
    }

    public ViolationResponse(boolean success, Double currentScore, String classification, boolean shouldTerminate, String message, Integer totalViolations, Double fairnessScore) {
        this(success, currentScore, classification, shouldTerminate, message, totalViolations, fairnessScore, fairnessScore, 0, null, null);
    }

    public ViolationResponse(boolean success, Double currentScore, String classification, boolean shouldTerminate,
                             String message, Integer totalViolations, Double fairnessScore, Double integrityScore,
                             Integer pointsDeducted, Integer warningNumber, String terminationReason) {
        this.success = success;
        this.currentScore = currentScore;
        this.classification = classification;
        this.shouldTerminate = shouldTerminate;
        this.message = message;
        this.totalViolations = totalViolations;
        this.fairnessScore = fairnessScore;
        this.integrityScore = integrityScore;
        this.pointsDeducted = pointsDeducted;
        this.warningNumber = warningNumber;
        this.terminationReason = terminationReason;
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
        return integrityScore != null ? integrityScore : fairnessScore;
    }

    public void setFairnessScore(Double fairnessScore) {
        this.fairnessScore = fairnessScore;
        if (this.integrityScore == null) {
            this.integrityScore = fairnessScore;
        }
    }

    public Double getIntegrityScore() {
        return integrityScore != null ? integrityScore : fairnessScore;
    }

    public void setIntegrityScore(Double integrityScore) {
        this.integrityScore = integrityScore;
        this.fairnessScore = integrityScore;
    }

    public Integer getPointsDeducted() {
        return pointsDeducted;
    }

    public void setPointsDeducted(Integer pointsDeducted) {
        this.pointsDeducted = pointsDeducted;
    }

    public Integer getWarningNumber() {
        return warningNumber;
    }

    public void setWarningNumber(Integer warningNumber) {
        this.warningNumber = warningNumber;
    }

    public String getTerminationReason() {
        return terminationReason;
    }

    public void setTerminationReason(String terminationReason) {
        this.terminationReason = terminationReason;
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
