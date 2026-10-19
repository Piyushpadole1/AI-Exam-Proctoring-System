package com.aieval8.examproctoring.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ProctoringStreamService {

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

    public void broadcastTelemetry(Long teacherId, String examCode, Map<String, Object> payload) {
        // Dispatch to teacher subscribers
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

        // Dispatch to exam subscribers
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
