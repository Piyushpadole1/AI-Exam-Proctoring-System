package com.aieval8.examproctoring.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_face_profiles")
public class UserFaceProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "consent_agreed", nullable = false)
    private boolean consentAgreed = true;

    @Column(name = "embedding_model", nullable = false, length = 50)
    private String embeddingModel = "face-api-resnet128";

    @Lob
    @Column(name = "embeddings_json", nullable = false, columnDefinition = "LONGTEXT")
    private String embeddingsJson;

    @Lob
    @Column(name = "average_embedding_json", nullable = false, columnDefinition = "LONGTEXT")
    private String averageEmbeddingJson;

    @Lob
    @Column(name = "image1_data", nullable = false, columnDefinition = "LONGTEXT")
    private String image1Data;

    @Lob
    @Column(name = "image2_data", nullable = false, columnDefinition = "LONGTEXT")
    private String image2Data;

    @Lob
    @Column(name = "image3_data", nullable = false, columnDefinition = "LONGTEXT")
    private String image3Data;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserFaceProfile() {
    }

    public UserFaceProfile(User user, boolean consentAgreed, String embeddingModel,
                           String embeddingsJson, String averageEmbeddingJson,
                           String image1Data, String image2Data, String image3Data) {
        this.user = user;
        this.consentAgreed = consentAgreed;
        this.embeddingModel = embeddingModel != null ? embeddingModel : "face-api-resnet128";
        this.embeddingsJson = embeddingsJson;
        this.averageEmbeddingJson = averageEmbeddingJson;
        this.image1Data = image1Data;
        this.image2Data = image2Data;
        this.image3Data = image3Data;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public boolean isConsentAgreed() {
        return consentAgreed;
    }

    public void setConsentAgreed(boolean consentAgreed) {
        this.consentAgreed = consentAgreed;
    }

    public String getEmbeddingModel() {
        return embeddingModel;
    }

    public void setEmbeddingModel(String embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    public String getEmbeddingsJson() {
        return embeddingsJson;
    }

    public void setEmbeddingsJson(String embeddingsJson) {
        this.embeddingsJson = embeddingsJson;
    }

    public String getAverageEmbeddingJson() {
        return averageEmbeddingJson;
    }

    public void setAverageEmbeddingJson(String averageEmbeddingJson) {
        this.averageEmbeddingJson = averageEmbeddingJson;
    }

    public String getImage1Data() {
        return image1Data;
    }

    public void setImage1Data(String image1Data) {
        this.image1Data = image1Data;
    }

    public String getImage2Data() {
        return image2Data;
    }

    public void setImage2Data(String image2Data) {
        this.image2Data = image2Data;
    }

    public String getImage3Data() {
        return image3Data;
    }

    public void setImage3Data(String image3Data) {
        this.image3Data = image3Data;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
