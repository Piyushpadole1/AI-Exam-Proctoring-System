package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.request.ViolationEventRequest;
import com.aieval8.examproctoring.dto.response.ViolationResponse;
import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.ExamAttemptRepository;
import com.aieval8.examproctoring.repository.ProctoringEventRepository;
import com.aieval8.examproctoring.repository.ProctoringSessionRepository;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProctoringService {

    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final com.aieval8.examproctoring.repository.ExamEnrollmentRepository enrollmentRepository;
    private final com.aieval8.examproctoring.repository.CheatingLogEntryRepository cheatingLogRepository;
    private final ScoringEngineService scoringEngine;
    private final ProctoringStreamService streamService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProctoringService(ProctoringSessionRepository sessionRepository,
                             ProctoringEventRepository eventRepository,
                             ExamAttemptRepository attemptRepository,
                             com.aieval8.examproctoring.repository.ExamEnrollmentRepository enrollmentRepository,
                             com.aieval8.examproctoring.repository.CheatingLogEntryRepository cheatingLogRepository,
                             ScoringEngineService scoringEngine,
                             ProctoringStreamService streamService) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.attemptRepository = attemptRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.cheatingLogRepository = cheatingLogRepository;
        this.scoringEngine = scoringEngine;
        this.streamService = streamService;
    }

    @Transactional
    public ViolationResponse logViolation(ViolationEventRequest request, CustomUserDetails studentDetails) {
        // Idempotency check: if violationId was already processed, return existing state without double deducting
        if (request.getViolationId() != null && !request.getViolationId().isBlank()) {
            java.util.Optional<ProctoringEvent> existingEvent = eventRepository.findByViolationId(request.getViolationId().trim());
            if (existingEvent.isPresent()) {
                ProctoringEvent ev = existingEvent.get();
                ProctoringSession ps = ev.getSession();
                return new ViolationResponse(
                        true,
                        ps.getIntegrityScore(),
                        ps.getVerdict(),
                        ps.getAttempt().getStatus() == AttemptStatus.DISQUALIFIED,
                        "Violation already recorded (idempotent replay): " + (ev.getDescription() != null ? ev.getDescription() : ev.getEventType()),
                        ps.getTotalViolations(),
                        ps.getIntegrityScore(),
                        ps.getIntegrityScore(),
                        ev.getPointsDeducted(),
                        ev.getWarningNumber(),
                        ps.getAttempt().getTerminationReason()
                );
            }
        }
        // Resolve session by attemptId or sessionId
        ProctoringSession session = sessionRepository.findByAttemptId(request.getSessionId())
                .or(() -> sessionRepository.findById(request.getSessionId()))
                .orElseThrow(() -> new ResourceNotFoundException("Proctoring session not found: " + request.getSessionId()));

        ExamAttempt attempt = session.getAttempt();

        // Security check: verify this attempt belongs to the authenticated student
        if (!attempt.getStudent().getId().equals(studentDetails.getId())) {
            throw new AccessDeniedException("Access denied: You do not own this proctoring session.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            return new ViolationResponse(true, session.getIntegrityScore(), session.getVerdict(), false, "Attempt is not active; event ignored.");
        }

        String eventType = request.getEventType();
        ViolationSeverity severity = scoringEngine.getSeverity(eventType);

        // Fetch prior violations for this session
        List<ProctoringEvent> priorEvents = eventRepository.findBySessionIdOrderByTimestampAsc(session.getId());

        int priorHeadGazeCount = 0;
        int priorFullscreenCount = 0;
        int priorTotalDeductions = 0;

        for (ProctoringEvent ev : priorEvents) {
            if (scoringEngine.isHeadOrGaze(ev.getEventType())) {
                priorHeadGazeCount++;
            }
            if (scoringEngine.isFullscreenOrBlur(ev.getEventType())) {
                priorFullscreenCount++;
            }
            priorTotalDeductions += (ev.getPointsDeducted() != null ? ev.getPointsDeducted() : 0);
        }

        Integer warningNumber = null;
        if (scoringEngine.isHeadOrGaze(eventType)) {
            warningNumber = priorHeadGazeCount + 1;
        }

        int fullscreenCount = priorFullscreenCount + (scoringEngine.isFullscreenOrBlur(eventType) ? 1 : 0);

        int pointsDeducted = scoringEngine.computeDeduction(eventType, warningNumber != null ? warningNumber : 1, priorFullscreenCount);

        double newIntegrityScore = Math.max(0.0, 100.0 - (priorTotalDeductions + pointsDeducted));

        boolean shouldTerminate = false;
        String terminationReason = null;

        if (scoringEngine.isFullscreenOrBlur(eventType) && fullscreenCount >= 2) {
            shouldTerminate = true;
            terminationReason = "Left fullscreen twice";
        } else if (newIntegrityScore <= 0.0) {
            shouldTerminate = true;
            terminationReason = "Integrity score reached 0";
        }

        String classification = scoringEngine.classifyIntegrityScore(newIntegrityScore);

        String message;
        if (shouldTerminate) {
            message = "Exam Terminated: " + terminationReason;
        } else if (scoringEngine.isHeadOrGaze(eventType)) {
            if (warningNumber != null && warningNumber <= 10) {
                message = "Warning " + warningNumber + " of 10: " + (request.getDescription() != null ? request.getDescription() : "Head/Eye gaze movement detected");
            } else {
                message = "Warning " + warningNumber + ": " + (request.getDescription() != null ? request.getDescription() : "Head/Eye gaze movement detected") + " (" + pointsDeducted + " points deducted)";
            }
        } else if (scoringEngine.isFullscreenOrBlur(eventType)) {
            message = "Warning 1 of 1: Fullscreen exit detected! You must remain in fullscreen mode during the exam. Next exit will result in immediate termination.";
        } else if (scoringEngine.isAudio(eventType)) {
            message = "Audio Warning: " + (request.getDescription() != null ? request.getDescription() : "External voice / sound detected") + " (0 points deducted)";
        } else if (pointsDeducted > 0) {
            message = (request.getDescription() != null ? request.getDescription() : eventType.replace('_', ' ')) + " (" + pointsDeducted + " points deducted)";
        } else {
            message = "Warning: " + (request.getDescription() != null ? request.getDescription() : eventType.replace('_', ' '));
        }

        String metadataJson = "{}";
        if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
            try {
                metadataJson = objectMapper.writeValueAsString(request.getMetadata());
            } catch (JsonProcessingException ignored) {
            }
        }

        ProctoringEvent event = new ProctoringEvent(
                session, request.getViolationId(), eventType, severity, request.getConfidence(),
                pointsDeducted, pointsDeducted, newIntegrityScore, warningNumber,
                message, request.getEvidenceUrl(), metadataJson
        );
        eventRepository.save(event);

        int totalViolations = priorEvents.size() + 1;
        session.setEventScore(100.0 - newIntegrityScore);
        session.setAiScore(100.0 - newIntegrityScore);
        session.setHybridScore(100.0 - newIntegrityScore);
        session.setIntegrityScore(newIntegrityScore);
        session.setVerdict(classification);
        session.setTotalViolations(totalViolations);
        sessionRepository.save(session);

        attempt.setIntegrityScore(newIntegrityScore);

        if (shouldTerminate) {
            attempt.setStatus(AttemptStatus.DISQUALIFIED);
            attempt.setTerminationReason(terminationReason);
            attempt.setSubmittedAt(LocalDateTime.now());
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);

            if (attempt.getExam() != null && attempt.getStudent() != null) {
                try {
                    enrollmentRepository.findByExamIdAndStudentId(attempt.getExam().getId(), attempt.getStudent().getId())
                            .ifPresent(en -> {
                                en.setStatus(EnrollmentStatus.COMPLETED);
                                en.setUpdatedAt(LocalDateTime.now());
                                enrollmentRepository.save(en);
                            });
                } catch (Exception ignored) {}
            }
        }

        attemptRepository.save(attempt);

        // Real-time broadcast to teacher Live Monitoring panel (< 50ms)
        try {
            Long teacherId = (attempt.getExam() != null && attempt.getExam().getTeacher() != null)
                    ? attempt.getExam().getTeacher().getId() : null;
            String examCode = attempt.getExam() != null ? attempt.getExam().getExamCode() : null;

            Map<String, Object> streamPayload = new HashMap<>();
            streamPayload.put("sessionId", session.getId());
            streamPayload.put("attemptId", attempt.getId());
            streamPayload.put("examCode", examCode);
            streamPayload.put("studentId", attempt.getStudent() != null ? attempt.getStudent().getId() : null);
            streamPayload.put("studentName", attempt.getStudent() != null ? attempt.getStudent().getName() : "Student");
            streamPayload.put("studentEmail", attempt.getStudent() != null ? attempt.getStudent().getEmail() : "");
            streamPayload.put("eventType", eventType);
            streamPayload.put("description", message);
            streamPayload.put("pointsDeducted", pointsDeducted);
            streamPayload.put("integrityScore", newIntegrityScore);
            streamPayload.put("fairnessScore", newIntegrityScore);
            streamPayload.put("totalViolations", totalViolations);
            streamPayload.put("verdict", classification);
            streamPayload.put("classification", classification);
            streamPayload.put("shouldTerminate", shouldTerminate);
            streamPayload.put("terminationReason", terminationReason);
            streamPayload.put("timestamp", LocalDateTime.now().toString());
            streamPayload.put("evidenceUrl", request.getEvidenceUrl());

            streamService.broadcastTelemetry(teacherId, examCode, streamPayload);
        } catch (Exception streamEx) {
            // Non-critical: do not fail proctoring transaction on broadcast error
        }

        // Sync to cheating_logs table for teacher panel visibility
        if (attempt.getExam() != null && attempt.getStudent() != null) {
            try {
                String examCode = attempt.getExam().getExamCode();
                String studentEmail = attempt.getStudent().getEmail();
                String studentName = attempt.getStudent().getName();

                CheatingLogEntry cle = cheatingLogRepository.findFirstByExamIdAndEmail(examCode, studentEmail)
                        .orElseGet(() -> new CheatingLogEntry(examCode, studentName, studentEmail, 0, 0, 0, 0, "[]"));

                String uType = eventType.toUpperCase();
                if (uType.contains("NO_FACE") || uType.contains("NOT_VISIBLE")) {
                    cle.setNoFaceCount((cle.getNoFaceCount() == null ? 0 : cle.getNoFaceCount()) + 1);
                } else if (uType.contains("MULTIPLE")) {
                    cle.setMultipleFaceCount((cle.getMultipleFaceCount() == null ? 0 : cle.getMultipleFaceCount()) + 1);
                } else if (uType.contains("CELL") || uType.contains("PHONE")) {
                    cle.setCellPhoneCount((cle.getCellPhoneCount() == null ? 0 : cle.getCellPhoneCount()) + 1);
                } else if (scoringEngine.isAudio(eventType) || scoringEngine.isHeadOrGaze(eventType) || scoringEngine.isFullscreenOrBlur(eventType)) {
                    // Audio, gaze, and fullscreen exits are tracked individually in proctoring_events
                } else {
                    cle.setProhibitedObjectCount((cle.getProhibitedObjectCount() == null ? 0 : cle.getProhibitedObjectCount()) + 1);
                }

                cle.setFairnessScore(newIntegrityScore);
                cle.setVerdict(classification);

                if (request.getEvidenceUrl() != null && !request.getEvidenceUrl().isEmpty()) {
                    List<java.util.Map<String, Object>> screens = new java.util.ArrayList<>();
                    if (cle.getScreenshotsJson() != null && !cle.getScreenshotsJson().isEmpty()) {
                        try {
                            screens = new java.util.ArrayList<>(objectMapper.readValue(cle.getScreenshotsJson(), List.class));
                        } catch (Exception ignored) {}
                    }
                    java.util.Map<String, Object> screen = new java.util.HashMap<>();
                    screen.put("url", request.getEvidenceUrl());
                    screen.put("type", eventType);
                    screen.put("detectedAt", LocalDateTime.now().toString());
                    screens.add(screen);
                    cle.setScreenshotsJson(objectMapper.writeValueAsString(screens));
                }
                cheatingLogRepository.save(cle);
            } catch (Exception logEx) {
                // Ignore sync failures to avoid failing proctoring event
            }
        }

        return new ViolationResponse(
                true,
                newIntegrityScore,
                classification,
                shouldTerminate,
                message,
                totalViolations,
                newIntegrityScore,
                newIntegrityScore,
                pointsDeducted,
                warningNumber,
                terminationReason
        );
    }

    @Transactional
    public ViolationResponse attachEvidence(String violationId, Long sessionId, String evidenceUrl, CustomUserDetails studentDetails) {
        if (evidenceUrl == null || evidenceUrl.isBlank()) {
            return new ViolationResponse(true, 100.0, "SAFE", false, "No evidence provided.");
        }

        ProctoringSession session = sessionRepository.findByAttemptId(sessionId)
                .or(() -> sessionRepository.findById(sessionId))
                .orElse(null);

        if (session == null) {
            return new ViolationResponse(false, 100.0, "UNKNOWN", false, "Session not found.");
        }

        if (studentDetails != null && !session.getAttempt().getStudent().getId().equals(studentDetails.getId())) {
            throw new AccessDeniedException("Access denied: You do not own this proctoring session.");
        }

        // 1. Update proctoring event evidence
        if (violationId != null && !violationId.isBlank()) {
            eventRepository.findByViolationId(violationId).ifPresent(ev -> {
                ev.setEvidenceUrl(evidenceUrl);
                eventRepository.save(ev);
            });
        }

        // 2. Add screenshot to cheating_logs
        try {
            ExamAttempt attempt = session.getAttempt();
            String examCode = attempt.getExam() != null ? attempt.getExam().getExamCode() : "";
            String studentEmail = attempt.getStudent().getEmail();
            String studentName = attempt.getStudent().getName();

            CheatingLogEntry cle = cheatingLogRepository.findFirstByExamIdAndEmail(examCode, studentEmail)
                    .orElseGet(() -> new CheatingLogEntry(examCode, studentName, studentEmail, 0, 0, 0, 0, "[]"));

            List<Map<String, Object>> screens = new ArrayList<>();
            if (cle.getScreenshotsJson() != null && !cle.getScreenshotsJson().isEmpty()) {
                try {
                    screens = new ArrayList<>(objectMapper.readValue(cle.getScreenshotsJson(), List.class));
                } catch (Exception ignored) {}
            }
            Map<String, Object> screen = new HashMap<>();
            screen.put("url", evidenceUrl);
            screen.put("violationId", violationId);
            screen.put("detectedAt", LocalDateTime.now().toString());
            screens.add(screen);
            cle.setScreenshotsJson(objectMapper.writeValueAsString(screens));
            cheatingLogRepository.save(cle);
        } catch (Exception ignored) {}

        return new ViolationResponse(true, session.getIntegrityScore(), session.getVerdict(), false, "Evidence attached successfully.");
    }

    public Map<String, Object> getSessionStatus(Long sessionId, CustomUserDetails studentDetails) {
        ProctoringSession session = sessionRepository.findByAttemptId(sessionId)
                .or(() -> sessionRepository.findById(sessionId))
                .orElseThrow(() -> new ResourceNotFoundException("Proctoring session not found: " + sessionId));

        ExamAttempt attempt = session.getAttempt();
        if (studentDetails != null && !attempt.getStudent().getId().equals(studentDetails.getId()) &&
                !"ROLE_TEACHER".equals(studentDetails.getRole()) && !"ROLE_ADMIN".equals(studentDetails.getRole())) {
            throw new AccessDeniedException("Access denied.");
        }

        List<ProctoringEvent> priorEvents = eventRepository.findBySessionIdOrderByTimestampAsc(session.getId());
        int headGazeCount = 0;
        int fullscreenCount = 0;
        for (ProctoringEvent ev : priorEvents) {
            if (scoringEngine.isHeadOrGaze(ev.getEventType())) headGazeCount++;
            if (scoringEngine.isFullscreenOrBlur(ev.getEventType())) fullscreenCount++;
        }

        Map<String, Object> res = new HashMap<>();
        res.put("sessionId", session.getId());
        res.put("attemptId", attempt.getId());
        res.put("integrityScore", session.getIntegrityScore() != null ? session.getIntegrityScore() : 100.0);
        res.put("fairnessScore", session.getIntegrityScore() != null ? session.getIntegrityScore() : 100.0);
        res.put("headGazeCount", headGazeCount);
        res.put("fullscreenExits", fullscreenCount);
        res.put("totalViolations", session.getTotalViolations() != null ? session.getTotalViolations() : priorEvents.size());
        res.put("verdict", session.getVerdict());
        res.put("classification", session.getVerdict());
        res.put("status", attempt.getStatus().name());
        res.put("shouldTerminate", attempt.getStatus() == AttemptStatus.DISQUALIFIED);
        res.put("terminationReason", attempt.getTerminationReason() != null ? attempt.getTerminationReason() : "");
        return res;
    }

    public List<ProctoringEvent> getSessionEvents(Long attemptId, CustomUserDetails userDetails) {
        ProctoringSession session = sessionRepository.findByAttemptId(attemptId)
                .or(() -> sessionRepository.findById(attemptId))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + attemptId));

        ExamAttempt attempt = session.getAttempt();

        // Allow access if caller is the student, or the teacher of this exam, or an admin
        boolean isStudentOwner = attempt.getStudent().getId().equals(userDetails.getId());
        boolean isTeacherOwner = attempt.getExam().getTeacher().getId().equals(userDetails.getId());
        boolean isAdmin = "ROLE_ADMIN".equals(userDetails.getRole());

        if (!isStudentOwner && !isTeacherOwner && !isAdmin) {
            throw new AccessDeniedException("Access denied: You do not have permission to view these proctoring records.");
        }

        return eventRepository.findBySessionIdOrderByTimestampAsc(session.getId());
    }
}
