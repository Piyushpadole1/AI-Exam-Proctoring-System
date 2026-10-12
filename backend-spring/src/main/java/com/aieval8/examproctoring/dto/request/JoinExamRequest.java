package com.aieval8.examproctoring.dto.request;

import jakarta.validation.constraints.NotBlank;

public class JoinExamRequest {

    @NotBlank(message = "Exam code is required")
    private String examCode;

    @NotBlank(message = "Exam password is required")
    private String examPassword;

    public JoinExamRequest() {
    }

    public JoinExamRequest(String examCode, String examPassword) {
        this.examCode = examCode;
        this.examPassword = examPassword;
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
}
