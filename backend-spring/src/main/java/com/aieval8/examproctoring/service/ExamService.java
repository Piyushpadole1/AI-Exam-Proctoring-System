package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.request.CreateExamRequest;
import com.aieval8.examproctoring.dto.response.ExamResponse;
import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.*;
import com.aieval8.examproctoring.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final QuestionRepository questionRepository;
    private final CodingQuestionRepository codingQuestionRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;
    private final CheatingLogEntryRepository cheatingLogRepository;

    public ExamService(ExamRepository examRepository,
                       UserRepository userRepository,
                       ClientRepository clientRepository,
                       PasswordEncoder passwordEncoder,
                       QuestionRepository questionRepository,
                       CodingQuestionRepository codingQuestionRepository,
                       ExamEnrollmentRepository enrollmentRepository,
                       ExamAttemptRepository attemptRepository,
                       ProctoringSessionRepository sessionRepository,
                       ProctoringEventRepository eventRepository,
                       CheatingLogEntryRepository cheatingLogRepository) {
        this.examRepository = examRepository;
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.questionRepository = questionRepository;
        this.codingQuestionRepository = codingQuestionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.attemptRepository = attemptRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.cheatingLogRepository = cheatingLogRepository;
    }

    @Transactional
    public ExamResponse createExam(CreateExamRequest request, CustomUserDetails teacherDetails) {
        User teacher = null;
        if (teacherDetails != null && teacherDetails.getId() != null) {
            teacher = userRepository.findById(teacherDetails.getId()).orElse(null);
        }
        if (teacher == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                teacher = userRepository.findById(cud.getId()).orElse(null);
            }
        }
        if (teacher == null) {
            throw new AccessDeniedException("Authentication required. Please log in as a teacher.");
        }
        if (teacher.getRole() != Role.ROLE_TEACHER && teacher.getRole() != Role.ROLE_ADMIN) {
            throw new AccessDeniedException("Access denied: Only teachers can create exams.");
        }

        String code = request.getExamCode();
        if (code == null || code.trim().isEmpty()) {
            code = "EXAM_" + (System.currentTimeMillis() % 100000);
        }
        String cleanCode = code.trim().toUpperCase();
        if (examRepository.existsByExamCode(cleanCode)) {
            cleanCode = cleanCode + "_" + (System.currentTimeMillis() % 10000);
        }

        Client client = teacher.getClient();
        if (client == null) {
            client = clientRepository.findByCode("DEFAULT")
                    .orElseGet(() -> clientRepository.save(new Client("Default Institution", "DEFAULT")));
        }

        Exam exam = new Exam();
        exam.setExamCode(cleanCode);
        String password = request.getExamPassword() != null && !request.getExamPassword().trim().isEmpty()
                ? request.getExamPassword().trim() : "EXAM123";
        exam.setExamPasswordHash(passwordEncoder.encode(password));
        exam.setEnrollmentPolicy(request.getEnrollmentPolicy() != null ? request.getEnrollmentPolicy() : EnrollmentPolicy.CODE_BASED_ENROLLMENT);
        exam.setTeacher(teacher);
        exam.setClient(client);
        exam.setExamName(request.getExamName());
        exam.setDescription(request.getDescription());
        exam.setSubject(request.getSubject());
        exam.setInstructions(request.getInstructions());
        exam.setExamDate(request.getExamDate());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());
        Double totalMarks = request.getTotalMarks() != null ? request.getTotalMarks() : 100.0;
        if (totalMarks <= 0) {
            throw new IllegalArgumentException("Total marks must be a positive number.");
        }
        Double passingMarks = request.getPassingMarks() != null ? request.getPassingMarks() : 40.0;
        if (passingMarks <= 0) {
            throw new IllegalArgumentException("Passing marks must be greater than 0.");
        }
        if (passingMarks > totalMarks) {
            throw new IllegalArgumentException("Passing marks (" + passingMarks + ") cannot exceed total marks (" + totalMarks + ").");
        }

        exam.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 30);
        exam.setTotalQuestions(request.getTotalQuestions() != null ? request.getTotalQuestions() : 0);
        exam.setTotalMarks(totalMarks);
        exam.setPassingMarks(passingMarks);
        exam.setHasCodingRound(Boolean.TRUE.equals(request.getHasCodingRound()));
        exam.setCodingMarks(request.getCodingMarks() != null ? request.getCodingMarks() : 0.0);
        exam.setStatus("PUBLISHED");

        exam = examRepository.save(exam);
        ExamResponse resp = new ExamResponse(exam);
        long count = questionRepository.countByExamId(exam.getId());
        if (count > 0 || resp.getTotalQuestions() == null || resp.getTotalQuestions() == 0) {
            resp.setTotalQuestions((int) count);
        }
        return resp;
    }

    public List<ExamResponse> getTeacherExams(CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = teacherDetails;
        if (resolved == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                resolved = cud;
            }
        }
        if (resolved == null || resolved.getId() == null) {
            return Collections.emptyList();
        }
        return examRepository.findByTeacherId(resolved.getId()).stream()
                .map(e -> {
                    ExamResponse resp = new ExamResponse(e);
                    long count = questionRepository.countByExamId(e.getId());
                    if (count > 0 || resp.getTotalQuestions() == null || resp.getTotalQuestions() == 0) {
                        resp.setTotalQuestions((int) count);
                    }
                    return resp;
                })
                .toList();
    }

    public ExamResponse getExamByIdAndTeacher(Long examId, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = teacherDetails;
        if (resolved == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                resolved = cud;
            }
        }

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }
        return new ExamResponse(exam);
    }

    @Transactional
    public ExamResponse updateExam(Long examId, CreateExamRequest request, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = teacherDetails;
        if (resolved == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                resolved = cud;
            }
        }

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {
            throw new AccessDeniedException("Access denied: Only teachers can modify exams.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        if (request.getExamName() != null && !request.getExamName().trim().isEmpty()) {
            exam.setExamName(request.getExamName().trim());
        }
        if (request.getSubject() != null) {
            exam.setSubject(request.getSubject().trim());
        }
        if (request.getDescription() != null) {
            exam.setDescription(request.getDescription().trim());
        }
        if (request.getInstructions() != null) {
            exam.setInstructions(request.getInstructions());
        }
        if (request.getDurationMinutes() != null && request.getDurationMinutes() > 0) {
            exam.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getTotalQuestions() != null) {
            long existingQuestions = questionRepository.countByExamId(examId);
            if (request.getTotalQuestions() < existingQuestions) {
                throw new IllegalArgumentException("Cannot reduce total questions to " + request.getTotalQuestions() + " because this exam already has " + existingQuestions + " questions.");
            }
            exam.setTotalQuestions(request.getTotalQuestions());
        }
        Double newTotalMarks = request.getTotalMarks() != null ? request.getTotalMarks() : exam.getTotalMarks();
        if (newTotalMarks <= 0) {
            throw new IllegalArgumentException("Total marks must be a positive number.");
        }
        Double newPassingMarks = request.getPassingMarks() != null ? request.getPassingMarks() : exam.getPassingMarks();
        if (newPassingMarks <= 0) {
            throw new IllegalArgumentException("Passing marks must be greater than 0.");
        }
        if (newPassingMarks > newTotalMarks) {
            throw new IllegalArgumentException("Passing marks (" + newPassingMarks + ") cannot exceed total marks (" + newTotalMarks + ").");
        }
        exam.setTotalMarks(newTotalMarks);
        exam.setPassingMarks(newPassingMarks);
        if (request.getHasCodingRound() != null) {
            exam.setHasCodingRound(request.getHasCodingRound());
        }
        if (request.getCodingMarks() != null) {
            exam.setCodingMarks(request.getCodingMarks());
        }
        if (request.getExamPassword() != null && !request.getExamPassword().trim().isEmpty()) {
            exam.setExamPasswordHash(passwordEncoder.encode(request.getExamPassword().trim()));
        }
        if (request.getExamDate() != null) {
            exam.setExamDate(request.getExamDate());
        }
        if (request.getStartTime() != null) {
            exam.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            exam.setEndTime(request.getEndTime());
        }

        exam = examRepository.save(exam);
        return new ExamResponse(exam);
    }

    @Transactional
    public void deleteExam(Long examId, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = teacherDetails;
        if (resolved == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                resolved = cud;
            }
        }

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {
            throw new AccessDeniedException("Access denied: Only teachers can delete exams.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        // Clean up child records to prevent foreign key errors (SQL Error 1451)
        List<ExamAttempt> attempts = attemptRepository.findByExamId(exam.getId());
        for (ExamAttempt att : attempts) {
            Optional<ProctoringSession> sess = sessionRepository.findByAttemptId(att.getId());
            if (sess.isPresent()) {
                eventRepository.deleteBySessionId(sess.get().getId());
                sessionRepository.delete(sess.get());
            }
            attemptRepository.delete(att);
        }

        enrollmentRepository.deleteByExamId(exam.getId());
        questionRepository.deleteByExamId(exam.getId());
        codingQuestionRepository.deleteByExamId(exam.getExamCode());
        try {
            codingQuestionRepository.deleteByExamId(exam.getId().toString());
        } catch (Exception ignored) {}
        cheatingLogRepository.deleteByExamId(exam.getExamCode());
        try {
            cheatingLogRepository.deleteByExamId(exam.getId().toString());
        } catch (Exception ignored) {}

        examRepository.delete(exam);
    }
}
