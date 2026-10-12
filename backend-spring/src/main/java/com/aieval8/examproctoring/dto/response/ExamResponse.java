package com.aieval8.examproctoring.dto.response;

import com.aieval8.examproctoring.entity.EnrollmentPolicy;
import com.aieval8.examproctoring.entity.Exam;
import java.time.LocalDateTime;

public class ExamResponse {

    private Long id;
    private String examCode;
    private String examName;
    private String description;
    private String subject;
    private String instructions;
    private Integer durationMinutes;
    private Integer totalQuestions;
    private Double totalMarks;
    private Double passingMarks;
    private EnrollmentPolicy enrollmentPolicy;
    private String teacherName;
    private Long teacherId;
    private String clientName;
    private LocalDateTime examDate;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;

    public ExamResponse() {
    }

    public ExamResponse(Exam exam) {
        this.id = exam.getId();
        this.examCode = exam.getExamCode();
        this.examName = exam.getExamName();
        this.description = exam.getDescription();
        this.subject = exam.getSubject();
        this.instructions = exam.getInstructions();
        this.durationMinutes = exam.getDurationMinutes();
        this.totalQuestions = exam.getTotalQuestions();
        this.totalMarks = exam.getTotalMarks();
        this.passingMarks = exam.getPassingMarks();
        this.enrollmentPolicy = exam.getEnrollmentPolicy();
        this.teacherName = exam.getTeacher() != null ? exam.getTeacher().getName() : null;
        this.teacherId = exam.getTeacher() != null ? exam.getTeacher().getId() : null;
        this.clientName = exam.getClient() != null ? exam.getClient().getName() : null;
        this.examDate = exam.getExamDate();
        this.startTime = exam.getStartTime();
        this.endTime = exam.getEndTime();
        this.status = exam.getStatus();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public String getExamName() {
        return examName;
    }

    public void setExamName(String examName) {
        this.examName = examName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
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

    public EnrollmentPolicy getEnrollmentPolicy() {
        return enrollmentPolicy;
    }

    public void setEnrollmentPolicy(EnrollmentPolicy enrollmentPolicy) {
        this.enrollmentPolicy = enrollmentPolicy;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
