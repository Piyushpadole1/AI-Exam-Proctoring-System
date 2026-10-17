package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.response.AttemptResponse;
import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.exception.ExamAccessException;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.*;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ExamAttemptService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ProctoringSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExamAttemptService(ExamAttemptRepository attemptRepository,
                              ExamEnrollmentRepository enrollmentRepository,
                              ExamRepository examRepository,
                              QuestionRepository questionRepository,
                              ProctoringSessionRepository sessionRepository,
                              UserRepository userRepository,
                              org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.attemptRepository = attemptRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AttemptResponse startOrResumeAttempt(String examCode, String deviceInfo, CustomUserDetails studentDetails) {
        return startOrResumeAttempt(examCode, null, deviceInfo, studentDetails);
    }

    @Transactional
    public AttemptResponse startOrResumeAttempt(String examCode, String examPassword, String deviceInfo, CustomUserDetails studentDetails) {
        String code = examCode.trim().toUpperCase();
        Exam exam = examRepository.findByExamCode(code)
                .or(() -> examRepository.findByExamCode(examCode.trim()))
                .or(() -> {
                    try {
                        return examRepository.findById(Long.parseLong(examCode.trim()));
                    } catch (Exception e) {
                        return Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examCode));

        CustomUserDetails resolved = studentDetails;
        if (resolved == null) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                resolved = cud;
            }
        }
        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required. Please log in.");
        }

        User student = userRepository.findById(resolved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        // GATEKEEPER 1: Password verification
        if (exam.getExamPasswordHash() != null && !exam.getExamPasswordHash().isEmpty()) {
            if (examPassword == null || !passwordEncoder.matches(examPassword.trim(), exam.getExamPasswordHash())) {
                throw new ExamAccessException("Invalid exam password. Access denied.");
            }
        }

        // GATEKEEPER 2: Student enrollment check — requires teacher approval/enrollment
        ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())
                .orElseThrow(() -> new ExamAccessException("Access Denied: You are not enrolled in this exam. Please request enrollment and wait for teacher approval."));

        if (enrollment.getStatus() == EnrollmentStatus.PENDING) {
            throw new ExamAccessException("Access Denied: Your enrollment request is pending approval by the instructor.");
        }
        if (enrollment.getStatus() == EnrollmentStatus.REJECTED) {
            throw new ExamAccessException("Access Denied: Your enrollment request for this exam was rejected by the instructor.");
        }
        if (enrollment.getStatus() == EnrollmentStatus.BLOCKED) {
            throw new ExamAccessException("Access Denied: You are blocked from participating in this exam.");
        }
        if (enrollment.getStatus() != EnrollmentStatus.ENROLLED) {
            throw new ExamAccessException("Access Denied: Your enrollment status is " + enrollment.getStatus() + ". Only approved students may take the exam.");
        }

        // GATEKEEPER 3: Resume existing active attempt if available
        Optional<ExamAttempt> existing = attemptRepository.findFirstByExamIdAndStudentIdAndStatus(
                exam.getId(), student.getId(), AttemptStatus.IN_PROGRESS);

        if (existing.isPresent()) {
            ExamAttempt attempt = existing.get();
            long secondsLeft = Math.max(0, Duration.between(LocalDateTime.now(), attempt.getServerDeadline()).getSeconds());
            return new AttemptResponse(attempt, secondsLeft);
        }

        // GATEKEEPER 4: Multi-client institution isolation check
        if (student.getClient() != null && exam.getClient() != null
                && !java.util.Objects.equals(student.getClient().getId(), exam.getClient().getId())) {
            throw new ExamAccessException("Access Denied: This exam belongs to a different institution.");
        }

        // GATEKEEPER 5: Exam availability and timeline check
        if ("ARCHIVED".equalsIgnoreCase(exam.getStatus()) || "DRAFT".equalsIgnoreCase(exam.getStatus())) {
            throw new ExamAccessException("Exam is currently not active or available.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (exam.getStartTime() != null && now.isBefore(exam.getStartTime())) {
            throw new ExamAccessException("Exam has not started yet. Starts at: " + exam.getStartTime());
        }
        if (exam.getEndTime() != null && now.isAfter(exam.getEndTime())) {
            throw new ExamAccessException("Exam has ended. Ended at: " + exam.getEndTime());
        }

        // GATEKEEPER 6: Check attempt limit
        if (enrollment.getAttemptsUsed() >= enrollment.getAttemptLimit()) {
            throw new ExamAccessException("Access Denied: You have already exhausted your allowed attempts for this exam.");
        }

        // Create new attempt
        int durationMins = exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 30;
        LocalDateTime deadline = LocalDateTime.now().plusMinutes(durationMins);

        ExamAttempt attempt = new ExamAttempt(enrollment, exam, student, deadline, deviceInfo);
        attempt = attemptRepository.save(attempt);

        // Increment attempts used
        enrollment.setAttemptsUsed(enrollment.getAttemptsUsed() + 1);
        enrollmentRepository.save(enrollment);

        // Create ProctoringSession
        ProctoringSession session = new ProctoringSession(attempt);
        sessionRepository.save(session);

        long secondsLeft = (long) durationMins * 60;
        return new AttemptResponse(attempt, secondsLeft);
    }

    @Transactional
    public void autosaveAnswers(Long attemptId, Map<String, String> answers, CustomUserDetails studentDetails) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));

        if (!attempt.getStudent().getId().equals(studentDetails.getId())) {
            throw new AccessDeniedException("Access denied: You do not own this attempt.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            return; // Ignore if attempt already completed/terminated
        }

        try {
            attempt.setSavedAnswers(objectMapper.writeValueAsString(answers));
            attemptRepository.save(attempt);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize answers map");
        }
    }

    @Transactional
    public AttemptResponse submitAttempt(Long attemptId, Map<String, String> answers, CustomUserDetails studentDetails) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));

        if (!attempt.getStudent().getId().equals(studentDetails.getId())) {
            throw new AccessDeniedException("Access denied: You do not own this attempt.");
        }

        if (answers != null && !answers.isEmpty()) {
            try {
                attempt.setSavedAnswers(objectMapper.writeValueAsString(answers));
            } catch (JsonProcessingException ignored) {
            }
        } else if (attempt.getSavedAnswers() != null && !attempt.getSavedAnswers().isBlank()) {
            try {
                answers = objectMapper.readValue(attempt.getSavedAnswers(), Map.class);
            } catch (Exception ignored) {
            }
        }

        // Grade MCQ Questions
        List<Question> questions = questionRepository.findByExamId(attempt.getExam().getId());
        double totalScore = 0.0;
        double maxScore = 0.0;

        for (Question q : questions) {
            maxScore += q.getMarks();
            if (answers != null) {
                String studentAns = null;
                if (answers.containsKey(q.getId().toString())) {
                    studentAns = String.valueOf(answers.get(q.getId().toString()));
                } else if (answers.containsKey(String.valueOf(q.getId()))) {
                    studentAns = String.valueOf(answers.get(String.valueOf(q.getId())));
                }

                if (studentAns != null && !studentAns.trim().isEmpty()) {
                    boolean isMatch = false;
                    try {
                        int selected = Integer.parseInt(studentAns.trim());
                        if (selected == q.getCorrectOptionIndex()) {
                            isMatch = true;
                        }
                    } catch (NumberFormatException ignored) {
                    }

                    if (!isMatch) {
                        try {
                            List<?> rawOpts = objectMapper.readValue(q.getOptionsJson(), List.class);
                            if (rawOpts != null && q.getCorrectOptionIndex() >= 0 && q.getCorrectOptionIndex() < rawOpts.size()) {
                                Object correctOpt = rawOpts.get(q.getCorrectOptionIndex());
                                String correctText = "";
                                if (correctOpt instanceof Map<?, ?> m) {
                                    Object t = m.get("optionText");
                                    if (t == null) t = m.get("text");
                                    if (t == null) t = m.get("option");
                                    correctText = t != null ? t.toString() : "";
                                } else if (correctOpt != null) {
                                    correctText = correctOpt.toString();
                                }
                                if (!correctText.isEmpty() && correctText.trim().equalsIgnoreCase(studentAns.trim())) {
                                    isMatch = true;
                                }
                            }
                        } catch (Exception ignored) {}
                    }

                    if (isMatch) {
                        totalScore += q.getMarks();
                    }
                }
            }
        }

        double percentage = maxScore > 0 ? (totalScore / maxScore) * 100.0 : 0.0;
        boolean passed = totalScore >= (attempt.getExam().getPassingMarks() != null ? attempt.getExam().getPassingMarks() : 40.0);

        attempt.setScore(totalScore);
        attempt.setPercentage(Math.round(percentage * 100.0) / 100.0);
        attempt.setPassed(passed);
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt = attemptRepository.save(attempt);

        // Update ProctoringSession
        Optional<ProctoringSession> sessionOpt = sessionRepository.findByAttemptId(attempt.getId());
        sessionOpt.ifPresent(session -> {
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
        });

        return new AttemptResponse(attempt, 0L);
    }
}
