package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.response.NotificationResponse;
import com.aieval8.examproctoring.entity.Notification;
import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.NotificationRepository;
import com.aieval8.examproctoring.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public NotificationResponse createNotification(User recipient, String type, String title,
                                                   String message, String relatedExamId,
                                                   Long relatedRequestId, String link) {
        Notification notification = new Notification(recipient, type, title, message, relatedExamId, relatedRequestId, link);
        Notification saved = notificationRepository.save(notification);
        NotificationResponse resp = new NotificationResponse(saved);

        // Real-time dispatch via SSE if recipient is connected
        dispatchSse(recipient.getId(), resp);

        return resp;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(CustomUserDetails user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(CustomUserDetails user) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, CustomUserDetails user) {
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));
        notification.setIsRead(true);
        Notification saved = notificationRepository.save(notification);
        return new NotificationResponse(saved);
    }

    @Transactional
    public int markAllAsRead(CustomUserDetails user) {
        return notificationRepository.markAllAsReadForRecipient(user.getId());
    }

    // SSE Registration
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(180_000L); // 3-minute timeout with client reconnect
        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to notification stream"));
        } catch (IOException e) {
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }

    private void dispatchSse(Long userId, NotificationResponse notification) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null && !emitters.isEmpty()) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("NOTIFICATION").data(notification));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                }
            }
        }
    }
}
