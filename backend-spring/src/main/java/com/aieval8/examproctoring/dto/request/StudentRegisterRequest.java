package com.aieval8.examproctoring.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class StudentRegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$",
        message = "Password must be at least 8 characters long and contain at least one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special character."
    )
    private String password;

    private String phone;

    private String clientCode;

    private String studentIdNumber; // Roll number / Student ID

    private Boolean faceConsent;
    private java.util.List<String> faceImages;
    private java.util.List<java.util.List<Double>> faceEmbeddings;
    private java.util.List<Double> averageEmbedding;

    public StudentRegisterRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getClientCode() {
        return clientCode;
    }

    public void setClientCode(String clientCode) {
        this.clientCode = clientCode;
    }

    public String getStudentIdNumber() {
        return studentIdNumber;
    }

    public void setStudentIdNumber(String studentIdNumber) {
        this.studentIdNumber = studentIdNumber;
    }

    public Boolean getFaceConsent() {
        return faceConsent;
    }

    public void setFaceConsent(Boolean faceConsent) {
        this.faceConsent = faceConsent;
    }

    public java.util.List<String> getFaceImages() {
        return faceImages;
    }

    public void setFaceImages(java.util.List<String> faceImages) {
        this.faceImages = faceImages;
    }

    public java.util.List<java.util.List<Double>> getFaceEmbeddings() {
        return faceEmbeddings;
    }

    public void setFaceEmbeddings(java.util.List<java.util.List<Double>> faceEmbeddings) {
        this.faceEmbeddings = faceEmbeddings;
    }

    public java.util.List<Double> getAverageEmbedding() {
        return averageEmbedding;
    }

    public void setAverageEmbedding(java.util.List<Double> averageEmbedding) {
        this.averageEmbedding = averageEmbedding;
    }
}
