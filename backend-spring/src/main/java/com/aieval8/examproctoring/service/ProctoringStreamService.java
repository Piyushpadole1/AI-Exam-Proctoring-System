package com.aieval8.examproctoring.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ProctoringStreamService {
    private static final Logger log = LoggerFactory.getLogger(ProctoringStreamService.class);

    // Teacher ID -> Active SSE Emitters
    private final Map<Long, List<SseEmitter>> teacherEmitters = new ConcurrentHashMap<>();
    // Exam Code -> Active SSE Emitters
    private final Map<String, List<SseEmitter>> examEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribeTeacher(Long teacherId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5-minute heartbeat
        teacherEmitters.computeIfAbsent(teacherId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeTeacherEmitter(teacherId, emitter));
        emitter.onTimeout(() -> removeTeacherEmitter(teacherId, emitter));
        emitter.onError(e -> removeTeacherEmitter(teacherId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data(Map.of("message", "Connected to teacher proctoring live stream")));
        } catch (IOException e) {
            removeTeacherEmitter(teacherId, emitter);
        }

        return emitter;
    }

    public SseEmitter subscribeExam(String examCode) {
        SseEmitter emitter = new SseEmitter(300_000L);
        examEmitters.computeIfAbsent(examCode, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeExamEmitter(examCode, emitter));
        emitter.onTimeout(() -> removeExamEmitter(examCode, emitter));
        emitter.onError(e -> removeExamEmitter(examCode, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data(Map.of("message", "Connected to exam live stream: " + examCode)));
        } catch (IOException e) {
            removeExamEmitter(examCode, emitter);
        }

        return emitter;
    }

    private void removeTeacherEmitter(Long teacherId, SseEmitter emitter) {
        List<SseEmitter> list = teacherEmitters.get(teacherId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                teacherEmitters.remove(teacherId);
            }
        }
    }

    private void removeExamEmitter(String examCode, SseEmitter emitter) {
        List<SseEmitter> list = examEmitters.get(examCode);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                examEmitters.remove(examCode);
            }
        }
    }

    private final List<java.util.function.Consumer<Map<String, Object>>> telemetryListeners = new CopyOnWriteArrayList<>();

    public void addTelemetryListener(java.util.function.Consumer<Map<String, Object>> listener) {
        telemetryListeners.add(listener);
    }

    public void broadcastTelemetry(Long teacherId, String examCode, Map<String, Object> payload) {
        // Dispatch to WebSocket / external listeners
        for (java.util.function.Consumer<Map<String, Object>> listener : telemetryListeners) {
            try {
                listener.accept(payload);
            } catch (Exception e) {
                log.warn("Telemetry listener dispatch failed: {}", e.getMessage());
            }
        }

        // Dispatch to teacher SSE subscribers
        if (teacherId != null) {
            List<SseEmitter> list = teacherEmitters.get(teacherId);
            if (list != null && !list.isEmpty()) {
                for (SseEmitter emitter : list) {
                    try {
                        emitter.send(SseEmitter.event().name("PROCTORING_EVENT").data(payload));
                    } catch (Exception e) {
                        removeTeacherEmitter(teacherId, emitter);
                    }
                }
            }
        }

        // Dispatch to exam SSE subscribers
        if (examCode != null) {
            List<SseEmitter> list = examEmitters.get(examCode);
            if (list != null && !list.isEmpty()) {
                for (SseEmitter emitter : list) {
                    try {
                        emitter.send(SseEmitter.event().name("PROCTORING_EVENT").data(payload));
                    } catch (Exception e) {
                        removeExamEmitter(examCode, emitter);
                    }
                }
            }
        }
    }
}
