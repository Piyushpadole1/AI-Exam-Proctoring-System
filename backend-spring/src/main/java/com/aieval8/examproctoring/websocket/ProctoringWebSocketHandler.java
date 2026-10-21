package com.aieval8.examproctoring.websocket;

import com.aieval8.examproctoring.dto.request.ViolationEventRequest;
import com.aieval8.examproctoring.dto.response.ViolationResponse;
import com.aieval8.examproctoring.service.ProctoringService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * High-performance WebSocket handler for instant proctoring violation reporting (< 20ms)
 * and real-time teacher broadcasting (< 100ms).
 */
@Component
public class ProctoringWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ProctoringWebSocketHandler.class);
    private final ProctoringService proctoringService;
    private final com.aieval8.examproctoring.service.ProctoringStreamService streamService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Active teacher subscriber sessions (for live alerts)
    private final Set<WebSocketSession> teacherSessions = ConcurrentHashMap.newKeySet();

    // Active student exam sessions
    private final Set<WebSocketSession> studentSessions = ConcurrentHashMap.newKeySet();

    public ProctoringWebSocketHandler(@Lazy ProctoringService proctoringService,
                                      @Lazy com.aieval8.examproctoring.service.ProctoringStreamService streamService) {
        this.proctoringService = proctoringService;
        this.streamService = streamService;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        if (streamService != null) {
            streamService.addTelemetryListener(this::broadcastToTeachers);
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String query = session.getUri() != null ? session.getUri().getQuery() : "";
        if (query != null && query.contains("role=teacher")) {
            teacherSessions.add(session);
            log.info("[WS] Teacher connected: {}", session.getId());
        } else {
            studentSessions.add(session);
            log.info("[WS] Student/Client connected: {}", session.getId());
        }

        // Send connection ACK
        Map<String, Object> welcome = Map.of(
                "action", "CONNECTED",
                "sessionId", session.getId(),
                "timestamp", System.currentTimeMillis()
        );
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(welcome)));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        if (payload == null || payload.isBlank()) return;

        try {
            Map<String, Object> data = objectMapper.readValue(payload, new TypeReference<>() {});
            String action = (String) data.getOrDefault("action", "");

            if ("PING".equalsIgnoreCase(action)) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("action", "PONG"))));
                return;
            }

            if ("SUBSCRIBE_TEACHER".equalsIgnoreCase(action)) {
                teacherSessions.add(session);
                studentSessions.remove(session);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                        "action", "SUBSCRIBED",
                        "role", "TEACHER",
                        "status", "LISTENING"
                ))));
                return;
            }

            // Violation reporting action (instant reporting path)
            if ("VIOLATION".equalsIgnoreCase(action) || data.containsKey("eventType")) {
                handleViolationMessage(session, data);
            }
        } catch (Exception e) {
            log.warn("[WS] Error processing message from session {}: {}", session.getId(), e.getMessage());
            try {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                        "action", "ERROR",
                        "message", e.getMessage()
                ))));
            } catch (Exception ignored) {}
        }
    }

    private void handleViolationMessage(WebSocketSession session, Map<String, Object> data) throws Exception {
        String violationId = (String) data.get("violationId");
        Object sessIdObj = data.get("sessionId");
        Long targetSessionId = null;
        if (sessIdObj instanceof Number) {
            targetSessionId = ((Number) sessIdObj).longValue();
        } else if (sessIdObj instanceof String) {
            try {
                targetSessionId = Long.parseLong((String) sessIdObj);
            } catch (Exception ignored) {}
        }

        if (targetSessionId == null) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                    "action", "ERROR",
                    "message", "Invalid or missing sessionId"
            ))));
            return;
        }

        String eventType = (String) data.get("eventType");
        Double confidence = data.containsKey("confidence") ? ((Number) data.get("confidence")).doubleValue() : 1.0;
        String description = (String) data.get("description");
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) data.get("metadata");

        ViolationEventRequest req = new ViolationEventRequest();
        req.setViolationId(violationId);
        req.setSessionId(targetSessionId);
        req.setEventType(eventType);
        req.setConfidence(confidence);
        req.setDescription(description);
        req.setMetadata(metadata);

        // Process through ProctoringService
        ViolationResponse resp = proctoringService.logViolation(req, null);

        // Send instant ACK back to student over WebSocket (< 5ms)
        Map<String, Object> ack = new java.util.HashMap<>();
        ack.put("action", "VIOLATION_ACK");
        ack.put("violationId", violationId != null ? violationId : "");
        ack.put("success", resp.isSuccess());
        ack.put("integrityScore", resp.getIntegrityScore());
        ack.put("fairnessScore", resp.getFairnessScore());
        ack.put("pointsDeducted", resp.getPointsDeducted() != null ? resp.getPointsDeducted() : 0);
        ack.put("warningNumber", resp.getWarningNumber() != null ? resp.getWarningNumber() : 0);
        ack.put("totalViolations", resp.getTotalViolations());
        ack.put("shouldTerminate", resp.isShouldTerminate());
        ack.put("terminationReason", resp.getTerminationReason() != null ? resp.getTerminationReason() : "");
        ack.put("classification", resp.getClassification() != null ? resp.getClassification() : "SAFE");

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(ack)));

        // Broadcast to teacher WebSocket connections immediately (< 10ms)
        Map<String, Object> broadcast = new java.util.HashMap<>();
        broadcast.put("action", "PROCTORING_EVENT");
        broadcast.put("sessionId", targetSessionId);
        broadcast.put("violationId", violationId != null ? violationId : "");
        broadcast.put("eventType", eventType);
        broadcast.put("description", resp.getMessage() != null ? resp.getMessage() : description);
        broadcast.put("pointsDeducted", resp.getPointsDeducted() != null ? resp.getPointsDeducted() : 0);
        broadcast.put("integrityScore", resp.getIntegrityScore());
        broadcast.put("totalViolations", resp.getTotalViolations());
        broadcast.put("shouldTerminate", resp.isShouldTerminate());
        broadcast.put("terminationReason", resp.getTerminationReason() != null ? resp.getTerminationReason() : "");
        broadcast.put("classification", resp.getClassification() != null ? resp.getClassification() : "SAFE");
        broadcast.put("timestamp", System.currentTimeMillis());

        broadcastToTeachers(broadcast);
    }

    public void broadcastToTeachers(Map<String, Object> payload) {
        if (teacherSessions.isEmpty()) return;
        try {
            String json = objectMapper.writeValueAsString(payload);
            TextMessage message = new TextMessage(json);
            for (WebSocketSession s : teacherSessions) {
                if (s.isOpen()) {
                    try {
                        s.sendMessage(message);
                    } catch (IOException e) {
                        teacherSessions.remove(s);
                    }
                } else {
                    teacherSessions.remove(s);
                }
            }
        } catch (Exception e) {
            log.warn("[WS] Broadcast to teachers error: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        teacherSessions.remove(session);
        studentSessions.remove(session);
        log.info("[WS] Connection closed: {}", session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("[WS] Transport error for session {}: {}", session.getId(), exception.getMessage());
        teacherSessions.remove(session);
        studentSessions.remove(session);
    }
}
