package com.aieval8.examproctoring.dto.response;

import com.aieval8.examproctoring.entity.Notification;
import java.time.LocalDateTime;

public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String relatedExamId;
    private Long relatedRequestId;
    private String link;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public NotificationResponse() {
    }

    public NotificationResponse(Notification n) {
        this.id = n.getId();
        this.type = n.getType();
        this.title = n.getTitle();
        this.message = n.getMessage();
        this.relatedExamId = n.getRelatedExamId();
        this.relatedRequestId = n.getRelatedRequestId();
        this.link = n.getLink();
        this.isRead = n.getIsRead();
        this.createdAt = n.getCreatedAt();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getRelatedExamId() {
        return relatedExamId;
    }

    public void setRelatedExamId(String relatedExamId) {
        this.relatedExamId = relatedExamId;
    }

    public Long getRelatedRequestId() {
        return relatedRequestId;
    }

    public void setRelatedRequestId(Long relatedRequestId) {
        this.relatedRequestId = relatedRequestId;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
