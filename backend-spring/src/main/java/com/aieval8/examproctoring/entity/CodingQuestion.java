package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coding_questions")
public class CodingQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id", nullable = false)
    private String examId;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "LONGTEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String constraints;

    @Column(name = "examples_json", columnDefinition = "TEXT")
    private String examplesJson = "[]";

    @Column(length = 20)
    private String difficulty = "Medium";

    @Column(nullable = false)
    private Double marks = 20.0;

    @Column(name = "allowed_languages", length = 255)
    private String allowedLanguages = "javascript,python,java,c,cpp";

    @Column(name = "time_limit_ms")
    private Integer timeLimitMs = 2000;

    @Column(name = "memory_limit_mb")
    private Integer memoryLimitMb = 256;

    @Column(name = "sample_test_cases_json", columnDefinition = "LONGTEXT")
    private String sampleTestCasesJson = "[]";

    @Column(name = "hidden_test_cases_json", columnDefinition = "LONGTEXT")
    private String hiddenTestCasesJson = "[]";

    @Column(name = "starter_code_json", columnDefinition = "TEXT")
    private String starterCodeJson = "{}";

    @Column(name = "submitted_code", columnDefinition = "LONGTEXT")
    private String submittedCode;

    private String language = "javascript";

    private String status = "pending";

    @Column(name = "execution_time")
    private Long executionTime = 0L;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public CodingQuestion() {
    }

    public CodingQuestion(String examId, String question, String description) {
        this.examId = examId;
        this.question = question;
        this.title = question;
        this.description = description;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getExamId() {
        return examId;
    }

    public void setExamId(String examId) {
        this.examId = examId;
    }

    public String getQuestion() {
        return question != null ? question : title;
    }

    public void setQuestion(String question) {
        this.question = question;
        if (this.title == null) {
            this.title = question;
        }
    }

    public String getTitle() {
        return title != null ? title : question;
    }

    public void setTitle(String title) {
        this.title = title;
        if (this.question == null) {
            this.question = title;
        }
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getConstraints() {
        return constraints;
    }

    public void setConstraints(String constraints) {
        this.constraints = constraints;
    }

    public String getExamplesJson() {
        return examplesJson != null ? examplesJson : "[]";
    }

    public void setExamplesJson(String examplesJson) {
        this.examplesJson = examplesJson;
    }

    public String getDifficulty() {
        return difficulty != null ? difficulty : "Medium";
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public Double getMarks() {
        return marks != null ? marks : 20.0;
    }

    public void setMarks(Double marks) {
        this.marks = marks != null ? marks : 20.0;
    }

    public String getAllowedLanguages() {
        return allowedLanguages != null ? allowedLanguages : "javascript,python,java,c,cpp";
    }

    public void setAllowedLanguages(String allowedLanguages) {
        this.allowedLanguages = allowedLanguages;
    }

    public Integer getTimeLimitMs() {
        return timeLimitMs != null ? timeLimitMs : 2000;
    }

    public void setTimeLimitMs(Integer timeLimitMs) {
        this.timeLimitMs = timeLimitMs;
    }

    public Integer getMemoryLimitMb() {
        return memoryLimitMb != null ? memoryLimitMb : 256;
    }

    public void setMemoryLimitMb(Integer memoryLimitMb) {
        this.memoryLimitMb = memoryLimitMb;
    }

    public String getSampleTestCasesJson() {
        return sampleTestCasesJson != null ? sampleTestCasesJson : "[]";
    }

    public void setSampleTestCasesJson(String sampleTestCasesJson) {
        this.sampleTestCasesJson = sampleTestCasesJson;
    }

    public String getHiddenTestCasesJson() {
        return hiddenTestCasesJson != null ? hiddenTestCasesJson : "[]";
    }

    public void setHiddenTestCasesJson(String hiddenTestCasesJson) {
        this.hiddenTestCasesJson = hiddenTestCasesJson;
    }

    public String getStarterCodeJson() {
        return starterCodeJson != null ? starterCodeJson : "{}";
    }

    public void setStarterCodeJson(String starterCodeJson) {
        this.starterCodeJson = starterCodeJson;
    }

    public String getSubmittedCode() {
        return submittedCode;
    }

    public void setSubmittedCode(String submittedCode) {
        this.submittedCode = submittedCode;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getExecutionTime() {
        return executionTime;
    }

    public void setExecutionTime(Long executionTime) {
        this.executionTime = executionTime;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
