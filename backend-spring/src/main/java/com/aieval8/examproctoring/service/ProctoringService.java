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
import java.util.List;
import java.util.Optional;

@Service
public class ProctoringService {

    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final com.aieval8.examproctoring.repository.CheatingLogEntryRepository cheatingLogRepository;
    private final ScoringEngineService scoringEngine;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProctoringService(ProctoringSessionRepository sessionRepository,
                             ProctoringEventRepository eventRepository,
                             ExamAttemptRepository attemptRepository,
                             com.aieval8.examproctoring.repository.CheatingLogEntryRepository cheatingLogRepository,
                             ScoringEngineService scoringEngine) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.attemptRepository = attemptRepository;
        this.cheatingLogRepository = cheatingLogRepository;
        this.scoringEngine = scoringEngine;
    }

    @Transactional
    public ViolationResponse logViolation(ViolationEventRequest request, CustomUserDetails studentDetails) {
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
            return new ViolationResponse(true, session.getHybridScore(), session.getVerdict(), false, "Attempt is not active; event ignored.");
        }

        String eventType = request.getEventType();
        int penaltyPoints = scoringEngine.getPenaltyPoints(eventType);
        ViolationSeverity severity = scoringEngine.getSeverity(eventType);

        String metadataJson = "{}";
        if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
            try {
                metadataJson = objectMapper.writeValueAsString(request.getMetadata());
            } catch (JsonProcessingException ignored) {
            }
        }

        ProctoringEvent event = new ProctoringEvent(
                session, eventType, severity, request.getConfidence(),
                penaltyPoints, request.getDescription(), request.getEvidenceUrl(), metadataJson
        );
        eventRepository.save(event);

        // Fetch all violations for this session
        List<ProctoringEvent> allViolations = eventRepository.findBySessionIdOrderByTimestampAsc(session.getId());

        double eventScore = scoringEngine.calculateEventScore(allViolations);
        double aiScore = scoringEngine.calculateAIBehaviorScore(allViolations);
        double hybridScore = scoringEngine.calculateHybridScore(eventScore, aiScore);
        String classification = scoringEngine.classify(hybridScore);
        boolean shouldTerminate = scoringEngine.shouldTerminate(hybridScore) || allViolations.size() >= 6;
        if (allViolations.size() >= 6) {
            classification = "MALPRACTICE";
        }

        session.setEventScore(eventScore);
        session.setAiScore(aiScore);
        session.setHybridScore(hybridScore);
        session.setIntegrityScore(Math.max(0.0, 100.0 - hybridScore));
        session.setVerdict(classification);
        session.setTotalViolations(allViolations.size());
        sessionRepository.save(session);

        // Update integrity score on attempt
        attempt.setIntegrityScore(session.getIntegrityScore());

        if (shouldTerminate) {
            attempt.setStatus(AttemptStatus.DISQUALIFIED);
            attempt.setSubmittedAt(LocalDateTime.now());
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }

        attemptRepository.save(attempt);

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
                } else {
                    cle.setProhibitedObjectCount((cle.getProhibitedObjectCount() == null ? 0 : cle.getProhibitedObjectCount()) + 1);
                }

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

        return new ViolationResponse(true, hybridScore, classification, shouldTerminate,
                shouldTerminate ? "Exam terminated: Malpractice threshold exceeded." : "Violation recorded.");
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
