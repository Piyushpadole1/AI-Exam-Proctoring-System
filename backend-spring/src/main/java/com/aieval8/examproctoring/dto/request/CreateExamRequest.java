package com.aieval8.examproctoring.dto.request;

import com.aieval8.examproctoring.entity.EnrollmentPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CreateExamRequest {

    @NotBlank(message = "Exam name is required")
    private String examName;

    private String examCode;

    @NotBlank(message = "Exam password is required")
    private String examPassword;

    private EnrollmentPolicy enrollmentPolicy = EnrollmentPolicy.CODE_BASED_ENROLLMENT;

    private String subject;
    private String description;
    private String instructions;
    private LocalDateTime examDate;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @NotNull(message = "Duration in minutes is required")
    private Integer durationMinutes = 30;

    private Integer totalQuestions = 0;
    private Double totalMarks = 100.0;
    private Double passingMarks = 40.0;

    public CreateExamRequest() {
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

    public String getExamPassword() {
        return examPassword;
    }

    public void setExamPassword(String examPassword) {
        this.examPassword = examPassword;
    }

    public EnrollmentPolicy getEnrollmentPolicy() {
        return enrollmentPolicy;
    }

    public void setEnrollmentPolicy(EnrollmentPolicy enrollmentPolicy) {
        this.enrollmentPolicy = enrollmentPolicy;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public LocalDateTime getExamDate() {
        return examDate;
    }

    public void setExamDate(LocalDateTime examDate) {
        this.examDate = examDate;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Double getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(Double totalMarks) {
        this.totalMarks = totalMarks;
    }

    public Double getPassingMarks() {
        return passingMarks;
    }

    public void setPassingMarks(Double passingMarks) {
        this.passingMarks = passingMarks;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }
}
