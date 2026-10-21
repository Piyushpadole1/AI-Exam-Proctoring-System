package com.aieval8.examproctoring.controller;



import com.aieval8.examproctoring.dto.request.CreateExamRequest;

import com.aieval8.examproctoring.dto.response.AttemptResponse;

import com.aieval8.examproctoring.dto.response.ExamResponse;

import com.aieval8.examproctoring.entity.*;

import com.aieval8.examproctoring.exception.ExamAccessException;

import com.aieval8.examproctoring.exception.ResourceNotFoundException;

import com.aieval8.examproctoring.repository.*;

import com.aieval8.examproctoring.security.CustomUserDetails;

import com.aieval8.examproctoring.service.EnrollmentService;

import com.aieval8.examproctoring.service.ExamAttemptService;

import com.aieval8.examproctoring.service.ExamService;

import com.fasterxml.jackson.core.JsonProcessingException;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;



import java.time.Instant;

import java.time.LocalDateTime;

import java.time.ZoneId;

import java.time.format.DateTimeFormatter;

import java.util.*;



@RestController

@Transactional

public class LegacyExamSessionController {



    private final ExamService examService;

    private final ExamAttemptService attemptService;

    private final EnrollmentService enrollmentService;

    private final ExamRepository examRepository;

    private final QuestionRepository questionRepository;

    private final ExamAttemptRepository attemptRepository;

    private final CodingQuestionRepository codingQuestionRepository;

    private final CheatingLogEntryRepository cheatingLogRepository;

    private final ProctoringSessionRepository sessionRepository;

    private final ProctoringEventRepository eventRepository;

    private final UserRepository userRepository;

    private final ExamEnrollmentRepository enrollmentRepository;

    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private final com.aieval8.examproctoring.service.CodeExecutionService codeExecutionService;

    private final com.aieval8.examproctoring.service.NotificationService notificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();



    public LegacyExamSessionController(ExamService examService,

                                        ExamAttemptService attemptService,

                                        EnrollmentService enrollmentService,

                                        ExamRepository examRepository,

                                        QuestionRepository questionRepository,

                                        ExamAttemptRepository attemptRepository,

                                        CodingQuestionRepository codingQuestionRepository,

                                        CheatingLogEntryRepository cheatingLogRepository,

                                        ProctoringSessionRepository sessionRepository,

                                        ProctoringEventRepository eventRepository,

                                        UserRepository userRepository,

                                        ExamEnrollmentRepository enrollmentRepository,

                                        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,

                                        com.aieval8.examproctoring.service.CodeExecutionService codeExecutionService,

                                        com.aieval8.examproctoring.service.NotificationService notificationService) {

        this.examService = examService;

        this.attemptService = attemptService;

        this.enrollmentService = enrollmentService;

        this.examRepository = examRepository;

        this.questionRepository = questionRepository;

        this.attemptRepository = attemptRepository;

        this.codingQuestionRepository = codingQuestionRepository;

        this.cheatingLogRepository = cheatingLogRepository;

        this.sessionRepository = sessionRepository;

        this.eventRepository = eventRepository;

        this.userRepository = userRepository;

        this.enrollmentRepository = enrollmentRepository;

        this.passwordEncoder = passwordEncoder;

        this.codeExecutionService = codeExecutionService;

        this.notificationService = notificationService;

    }



    private CustomUserDetails resolveUser(CustomUserDetails principal) {

        if (principal != null && principal.getId() != null) {

            return principal;

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {

            return cud;

        }

        return null;

    }



    private Optional<Exam> findExamByCodeOrId(String identifier) {

        if (identifier == null || identifier.trim().isEmpty()) {

            return Optional.empty();

        }

        String clean = identifier.trim();

        return examRepository.findByExamCode(clean.toUpperCase())

                .or(() -> examRepository.findByExamCode(clean))

                .or(() -> {

                    try {

                        return examRepository.findById(Long.parseLong(clean));

                    } catch (Exception e) {

                        return Optional.empty();

                    }

                });

    }



    private LocalDateTime parseDateTime(Object obj) {

        if (obj == null) return null;

        String s = obj.toString().trim();

        if (s.isEmpty()) return null;

        try {

            return LocalDateTime.parse(s);

        } catch (Exception e1) {

            try {

                return LocalDateTime.parse(s, DateTimeFormatter.ISO_DATE_TIME);

            } catch (Exception e2) {

                try {

                    return LocalDateTime.ofInstant(Instant.parse(s), ZoneId.systemDefault());

                } catch (Exception e3) {

                    return null;

                }

            }

        }

    }



    // ── Legacy Exam Endpoints (/api/users/exam) ───────────────────────────



    @GetMapping("/api/users/exam")

    public ResponseEntity<List<Map<String, Object>>> getLegacyExams(@AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolvedUser = resolveUser(userDetails);

        List<Exam> exams;

        boolean isTeacher = resolvedUser != null && "ROLE_TEACHER".equals(resolvedUser.getRole());

        boolean isStudent = resolvedUser != null && "ROLE_STUDENT".equals(resolvedUser.getRole());



        if (isTeacher) {

            // Strict Teacher Isolation: A teacher must ONLY ever see their own exams

            exams = examRepository.findByTeacherId(resolvedUser.getId());

        } else {

            // Students only see active/published exams

            exams = examRepository.findByStatus("PUBLISHED");

        }



        List<Map<String, Object>> result = new ArrayList<>();

        for (Exam e : exams) {

            Map<String, Object> map = new HashMap<>();

            map.put("_id", e.getId().toString());

            map.put("id", e.getId().toString());

            map.put("examId", e.getExamCode());

            map.put("examName", e.getExamName());

            map.put("description", e.getDescription() != null ? e.getDescription() : "Comprehensive Examination");

            map.put("subject", e.getSubject() != null ? e.getSubject() : "Computer Science");

            map.put("duration", e.getDurationMinutes());

            map.put("totalQuestions", e.getTotalQuestions());

            map.put("totalMarks", e.getTotalMarks());

            map.put("passingMarks", e.getPassingMarks());

            map.put("liveDate", e.getExamDate() != null ? e.getExamDate().toString() : e.getCreatedAt().toString());

            map.put("deadDate", e.getEndTime() != null ? e.getEndTime().toString() : e.getCreatedAt().plusDays(30).toString());

            map.put("teacherName", e.getTeacher() != null ? e.getTeacher().getName() : "Faculty");

            map.put("teacherId", e.getTeacher() != null ? e.getTeacher().getId() : null);

            map.put("hasCodingRound", e.getHasCodingRound() != null ? e.getHasCodingRound() : false);

            map.put("codingMarks", e.getCodingMarks() != null ? e.getCodingMarks() : 0.0);

            map.put("requiresPassword", true);



            if (isStudent && resolvedUser != null) {

                Optional<ExamEnrollment> enOpt = enrollmentRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId());

                List<ExamAttempt> pastAttempts = attemptRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId());

                boolean hasAttempted = pastAttempts.stream().anyMatch(a ->

                        a.getStatus() == AttemptStatus.SUBMITTED ||

                        a.getStatus() == AttemptStatus.COMPLETED ||

                        a.getStatus() == AttemptStatus.DISQUALIFIED ||

                        a.getStatus() == AttemptStatus.AUTO_SUBMITTED);



                String status = "NOT_ENROLLED";

                if (hasAttempted || (enOpt.isPresent() && enOpt.get().getStatus() == EnrollmentStatus.COMPLETED)) {

                    status = "COMPLETED";

                } else if (enOpt.isPresent()) {

                    status = enOpt.get().getStatus().name();

                }



                map.put("enrollmentStatus", status);

                map.put("isEnrolled", "ENROLLED".equals(status));

                map.put("isCompleted", "COMPLETED".equals(status));

                map.put("hasAttempted", hasAttempted);

            } else {

                map.put("enrollmentStatus", "ENROLLED");

                map.put("isEnrolled", true);

                map.put("isCompleted", false);

                map.put("hasAttempted", false);

            }

            result.add(map);

        }

        return ResponseEntity.ok(result);

    }



    @GetMapping("/api/users/exam/{examId}")

    public ResponseEntity<Map<String, Object>> getLegacyExamById(@PathVariable String examId,

                                                                 @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolvedUser = resolveUser(userDetails);

        Optional<Exam> examOpt = findExamByCodeOrId(examId);

        if (examOpt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }

        Exam e = examOpt.get();

        boolean isTeacher = resolvedUser != null && "ROLE_TEACHER".equals(resolvedUser.getRole());

        boolean isStudent = resolvedUser != null && "ROLE_STUDENT".equals(resolvedUser.getRole());



        if (isTeacher) {

            if (e.getTeacher() != null && !e.getTeacher().getId().equals(resolvedUser.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }



        Map<String, Object> map = new HashMap<>();

        map.put("_id", e.getId().toString());

        map.put("id", e.getId().toString());

        map.put("examId", e.getExamCode());

        map.put("examName", e.getExamName());

        map.put("description", e.getDescription() != null ? e.getDescription() : "");

        map.put("subject", e.getSubject() != null ? e.getSubject() : "");

        map.put("duration", e.getDurationMinutes());

        map.put("totalQuestions", e.getTotalQuestions());

        map.put("totalMarks", e.getTotalMarks());

        map.put("passingMarks", e.getPassingMarks());

        map.put("liveDate", e.getExamDate() != null ? e.getExamDate().toString() : e.getCreatedAt().toString());

        map.put("deadDate", e.getEndTime() != null ? e.getEndTime().toString() : e.getCreatedAt().plusDays(30).toString());

        map.put("teacherName", e.getTeacher() != null ? e.getTeacher().getName() : "Faculty");

        map.put("teacherId", e.getTeacher() != null ? e.getTeacher().getId() : null);

        map.put("hasCodingRound", e.getHasCodingRound() != null ? e.getHasCodingRound() : false);

        map.put("codingMarks", e.getCodingMarks() != null ? e.getCodingMarks() : 0.0);

        map.put("requiresPassword", true);



        if (isStudent && resolvedUser != null) {

            Optional<ExamEnrollment> enOpt = enrollmentRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId());

            List<ExamAttempt> pastAttempts = attemptRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId());

            boolean hasAttempted = pastAttempts.stream().anyMatch(a ->

                    a.getStatus() == AttemptStatus.SUBMITTED ||

                    a.getStatus() == AttemptStatus.COMPLETED ||

                    a.getStatus() == AttemptStatus.DISQUALIFIED ||

                    a.getStatus() == AttemptStatus.AUTO_SUBMITTED);



            String status = "NOT_ENROLLED";

            if (hasAttempted || (enOpt.isPresent() && enOpt.get().getStatus() == EnrollmentStatus.COMPLETED)) {

                status = "COMPLETED";

            } else if (enOpt.isPresent()) {

                status = enOpt.get().getStatus().name();

            }



            map.put("enrollmentStatus", status);

            map.put("isEnrolled", "ENROLLED".equals(status));

            map.put("isCompleted", "COMPLETED".equals(status));

            map.put("hasAttempted", hasAttempted);

        } else {

            map.put("enrollmentStatus", "ENROLLED");

            map.put("isEnrolled", true);

            map.put("isCompleted", false);

            map.put("hasAttempted", false);

        }



        return ResponseEntity.ok(map);

    }



    @PostMapping({"/api/users/exam", "/api/users/exam/create"})

    public ResponseEntity<Map<String, Object>> createLegacyExam(@RequestBody Map<String, Object> body,

                                                                 @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CreateExamRequest req = new CreateExamRequest();

        req.setExamName((String) body.getOrDefault("examName", "New Exam"));

        String code = (String) body.get("examId");

        if (code == null || code.trim().isEmpty()) {

            code = (String) body.get("examCode");

        }

        if (code == null || code.trim().isEmpty()) {

            code = "EXAM_" + (System.currentTimeMillis() % 100000);

        }

        req.setExamCode(code);

        req.setExamPassword((String) body.getOrDefault("examPassword", "EXAM123"));

        req.setSubject((String) body.getOrDefault("subject", "General"));

        req.setDescription((String) body.getOrDefault("description", ""));



        Object duration = body.get("duration");

        if (duration instanceof Number) {

            req.setDurationMinutes(((Number) duration).intValue());

        } else if (duration != null) {

            try {

                req.setDurationMinutes(Integer.parseInt(duration.toString().trim()));

            } catch (Exception ignored) {

                req.setDurationMinutes(30);

            }

        } else {

            req.setDurationMinutes(30);

        }



        Object totalQ = body.get("totalQuestions");

        if (totalQ instanceof Number) {

            req.setTotalQuestions(((Number) totalQ).intValue());

        } else if (totalQ != null) {

            try {

                req.setTotalQuestions(Integer.parseInt(totalQ.toString().trim()));

            } catch (Exception ignored) {}

        }



        if (body.get("passingMarks") != null) {

            try {

                req.setPassingMarks(Double.parseDouble(body.get("passingMarks").toString().trim()));

            } catch (Exception ignored) {}

        }

        if (body.get("totalMarks") != null) {

            try {

                req.setTotalMarks(Double.parseDouble(body.get("totalMarks").toString().trim()));

            } catch (Exception ignored) {}

        }



        if (body.get("hasCodingRound") != null) {

            try { req.setHasCodingRound(Boolean.parseBoolean(body.get("hasCodingRound").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("codingMarks") != null) {

            try { req.setCodingMarks(Double.parseDouble(body.get("codingMarks").toString().trim())); } catch (Exception ignored) {}

        }



        LocalDateTime startTime = parseDateTime(body.get("liveDate"));

        LocalDateTime endTime = parseDateTime(body.get("deadDate"));

        req.setStartTime(startTime);

        req.setEndTime(endTime);

        req.setExamDate(startTime != null ? startTime : LocalDateTime.now());



        CustomUserDetails resolvedTeacher = resolveUser(teacherDetails);

        if (resolvedTeacher == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolvedTeacher.getRole()) && !"ROLE_ADMIN".equals(resolvedTeacher.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Teacher role required to create exams."));

        }



        ExamResponse res = examService.createExam(req, resolvedTeacher);



        Map<String, Object> map = new HashMap<>();

        map.put("_id", res.getId().toString());

        map.put("id", res.getId().toString());

        map.put("examId", res.getExamCode());

        map.put("examName", res.getExamName());

        map.put("subject", res.getSubject());

        map.put("duration", res.getDurationMinutes());

        map.put("totalQuestions", res.getTotalQuestions());

        map.put("totalMarks", res.getTotalMarks());

        map.put("passingMarks", res.getPassingMarks());

        map.put("teacherId", res.getTeacherId());

        map.put("teacherName", res.getTeacherName());



        return ResponseEntity.ok(map);

    }



    @PutMapping("/api/users/exam/{examId}")

    public ResponseEntity<Map<String, Object>> updateLegacyExam(@PathVariable String examId,

                                                                 @RequestBody Map<String, Object> body,

                                                                 @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can update exams."));

        }

        Optional<Exam> examOpt = findExamByCodeOrId(examId);

        if (examOpt.isEmpty()) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Exam not found: " + examId));

        }



        Exam exam = examOpt.get();

        if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }



        CreateExamRequest req = new CreateExamRequest();

        if (body.get("examName") != null) req.setExamName((String) body.get("examName"));

        if (body.get("subject") != null) req.setSubject((String) body.get("subject"));

        if (body.get("description") != null) req.setDescription((String) body.get("description"));

        if (body.get("examPassword") != null) req.setExamPassword((String) body.get("examPassword"));

        if (body.get("duration") != null) {

            try { req.setDurationMinutes(Integer.parseInt(body.get("duration").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("totalQuestions") != null) {

            try { req.setTotalQuestions(Integer.parseInt(body.get("totalQuestions").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("passingMarks") != null) {

            try { req.setPassingMarks(Double.parseDouble(body.get("passingMarks").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("totalMarks") != null) {

            try { req.setTotalMarks(Double.parseDouble(body.get("totalMarks").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("liveDate") != null) req.setStartTime(parseDateTime(body.get("liveDate")));

        if (body.get("deadDate") != null) req.setEndTime(parseDateTime(body.get("deadDate")));

        if (body.get("hasCodingRound") != null) {

            try { req.setHasCodingRound(Boolean.parseBoolean(body.get("hasCodingRound").toString().trim())); } catch (Exception ignored) {}

        }

        if (body.get("codingMarks") != null) {

            try { req.setCodingMarks(Double.parseDouble(body.get("codingMarks").toString().trim())); } catch (Exception ignored) {}

        }



        if (req.getTotalQuestions() != null) {

            long existingQuestions = questionRepository.countByExamId(examOpt.get().getId());

            if (req.getTotalQuestions() < existingQuestions) {

                return ResponseEntity.badRequest().body(Map.of("error", "Cannot reduce total questions to " + req.getTotalQuestions() + " because this exam already has " + existingQuestions + " questions."));

            }

        }



        ExamResponse res = examService.updateExam(examOpt.get().getId(), req, resolved);

        return ResponseEntity.ok(Map.of("success", true, "data", res));

    }



    @RequestMapping(value = "/api/users/exam/{examId}", method = {RequestMethod.POST, RequestMethod.DELETE})

    public ResponseEntity<Map<String, Object>> deleteLegacyExam(@PathVariable String examId,

                                                                 @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        Optional<Exam> examOpt = findExamByCodeOrId(examId);



        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            examService.deleteExam(exam.getId(), resolved);

            return ResponseEntity.ok(Map.of("success", true, "message", "Exam deleted successfully"));

        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Exam already deleted or not found"));

    }



    // ── MCQ Questions ─────────────────────────────────────────────────────



    @GetMapping("/api/users/exam/questions/{examCode}")

    public ResponseEntity<?> getQuestionsByExam(

            @PathVariable String examCode,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);



        if (examOpt.isEmpty()) {

            return ResponseEntity.ok(Collections.emptyList());

        }



        Exam exam = examOpt.get();

        boolean isTeacher = "ROLE_TEACHER".equals(resolved.getRole());

        boolean isStudent = "ROLE_STUDENT".equals(resolved.getRole());



        if (isTeacher) {

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        } else if (isStudent) {

            Optional<ExamEnrollment> enOpt = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());

            if (enOpt.isEmpty() || enOpt.get().getStatus() != EnrollmentStatus.ENROLLED) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You must be enrolled and approved to access questions."));

            }

        }



        List<Question> questions = questionRepository.findByExamId(exam.getId());

        List<Map<String, Object>> result = new ArrayList<>();

        for (Question q : questions) {

            Map<String, Object> map = new HashMap<>();

            map.put("_id", q.getId().toString());

            map.put("id", q.getId().toString());

            map.put("examId", examCode);

            map.put("question", q.getQuestionText());



            List<Map<String, Object>> normalizedOptions = new ArrayList<>();

            try {

                List<?> rawList = objectMapper.readValue(q.getOptionsJson(), List.class);

                if (rawList != null) {

                    for (int i = 0; i < rawList.size(); i++) {

                        Object item = rawList.get(i);

                        Map<String, Object> optMap = new HashMap<>();

                        String optText = "";

                        boolean isCor = (i == q.getCorrectOptionIndex());



                        if (item instanceof Map<?, ?> m) {

                            Object t = m.get("optionText");

                            if (t == null) t = m.get("text");

                            if (t == null) t = m.get("option");

                            optText = t != null ? t.toString() : "";

                            if (m.get("isCorrect") != null) {

                                isCor = Boolean.TRUE.equals(m.get("isCorrect")) || "true".equalsIgnoreCase(m.get("isCorrect").toString());

                            }

                        } else if (item != null) {

                            optText = item.toString();

                        }



                        optMap.put("id", String.valueOf(i));

                        optMap.put("_id", String.valueOf(i));

                        optMap.put("index", i);

                        optMap.put("optionText", optText);

                        optMap.put("text", optText);

                        optMap.put("option", optText);

                        optMap.put("isCorrect", isStudent ? false : isCor);

                        normalizedOptions.add(optMap);

                    }

                }

            } catch (Exception e) {

                // If parsing fails, provide empty list

            }



            map.put("options", normalizedOptions);

            map.put("marks", q.getMarks());

            map.put("correctOptionIndex", isStudent ? null : q.getCorrectOptionIndex());

            result.add(map);

        }

        return ResponseEntity.ok(result);

    }



    @PostMapping("/api/users/exam/questions")

    public ResponseEntity<Map<String, Object>> createQuestion(@RequestBody Map<String, Object> body,

                                                               @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can add questions."));

        }



        String examCode = (String) body.get("examId");

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);



        if (examOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found: " + examCode));

        }



        Exam exam = examOpt.get();

        if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }



        long currentCount = questionRepository.countByExamId(exam.getId());

        int maxAllowed = exam.getTotalQuestions() != null ? exam.getTotalQuestions() : 0;

        if (maxAllowed > 0 && currentCount >= maxAllowed) {

            return ResponseEntity.badRequest().body(Map.of("error", "Cannot add question: Exam question capacity (" + maxAllowed + ") has been reached."));

        }



        String questionText = (String) body.get("question");

        if (questionText == null && body.get("questionText") != null) {

            questionText = body.get("questionText").toString();

        }

        if (questionText == null) {

            questionText = "Question";

        }



        Object optionsObj = body.get("options");

        if (optionsObj == null && body.get("optionsJson") != null) {

            try {

                optionsObj = objectMapper.readValue(body.get("optionsJson").toString(), List.class);

            } catch (Exception ignored) {}

        }



        String optionsJson = "[]";

        int correctIndex = 0;

        if (body.get("correctOptionIndex") != null) {

            try {

                correctIndex = Integer.parseInt(body.get("correctOptionIndex").toString());

            } catch (Exception ignored) {}

        } else if (optionsObj instanceof List<?> list) {

            for (int i = 0; i < list.size(); i++) {

                Object item = list.get(i);

                if (item instanceof Map<?, ?> m) {

                    Object isCor = m.get("isCorrect");

                    if (Boolean.TRUE.equals(isCor) || "true".equalsIgnoreCase(String.valueOf(isCor))) {

                        correctIndex = i;

                        break;

                    }

                }

            }

        }

        try {

            optionsJson = objectMapper.writeValueAsString(optionsObj != null ? optionsObj : Collections.emptyList());

        } catch (JsonProcessingException ignored) {

        }



        double marks = 1.0;

        if (body.get("marks") != null) {

            try { marks = Double.parseDouble(body.get("marks").toString()); } catch (Exception ignored) {}

        }



        Question q = new Question(exam, questionText, optionsJson, correctIndex, marks);

        q = questionRepository.save(q);



        Map<String, Object> resp = new HashMap<>();

        resp.put("_id", q.getId().toString());

        resp.put("id", q.getId().toString());

        resp.put("questionId", q.getId().toString());

        resp.put("examId", exam.getExamCode());

        resp.put("question", q.getQuestionText());

        resp.put("questionText", q.getQuestionText());

        resp.put("options", optionsObj != null ? optionsObj : Collections.emptyList());

        resp.put("marks", q.getMarks());

        resp.put("correctOptionIndex", q.getCorrectOptionIndex());

        resp.put("message", "Question created");

        return ResponseEntity.ok(resp);

    }



    @PutMapping("/api/users/exam/questions/{questionId}")

    public ResponseEntity<Map<String, Object>> updateQuestion(

            @PathVariable Long questionId,

            @RequestBody Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can update questions."));

        }

        Optional<Question> qOpt = questionRepository.findById(questionId);

        if (qOpt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }

        Question q = qOpt.get();

        Exam exam = q.getExam();

        if (exam != null && exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }

        if (body.get("question") != null) q.setQuestionText((String) body.get("question"));

        if (body.get("options") != null) {

            try {

                q.setOptionsJson(objectMapper.writeValueAsString(body.get("options")));

            } catch (Exception ignored) {}

        }

        if (body.get("marks") instanceof Number num) q.setMarks(num.doubleValue());

        questionRepository.save(q);

        return ResponseEntity.ok(Map.of("success", true, "message", "Question updated"));

    }



    @DeleteMapping("/api/users/exam/questions/{questionId}")

    public ResponseEntity<Map<String, Object>> deleteQuestion(

            @PathVariable Long questionId,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can delete questions."));

        }

        Optional<Question> qOpt = questionRepository.findById(questionId);

        if (qOpt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }

        Question q = qOpt.get();

        Exam exam = q.getExam();

        if (exam != null && exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }

        questionRepository.delete(q);

        if (exam != null && exam.getTotalQuestions() > 0) {

            exam.setTotalQuestions(exam.getTotalQuestions() - 1);

            examRepository.save(exam);

        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Question deleted"));

    }



    // ── Coding Questions (/api/coding/**) ─────────────────────────────────



    private boolean compareOutputs(String actual, String expected) {

        if (actual == null && expected == null) return true;

        if (actual == null || expected == null) return false;

        String a = actual.replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").trim();

        String e = expected.replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").trim();

        return a.equals(e);

    }



    @PostMapping({"/api/coding/question", "/api/coding/questions"})

    public ResponseEntity<Map<String, Object>> createCodingQuestion(

            @RequestBody Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can create coding questions."));

        }

        String examId = String.valueOf(body.get("examId"));

        Optional<Exam> examOpt = findExamByCodeOrId(examId);



        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }



        String title = (String) body.getOrDefault("title", body.get("question"));

        String description = (String) body.get("description");

        String constraints = (String) body.get("constraints");

        String difficulty = (String) body.getOrDefault("difficulty", "Medium");

        String allowedLanguages = (String) body.getOrDefault("allowedLanguages", "javascript,python,java,c,cpp");



        double marks = 20.0;

        if (body.get("marks") != null) {

            try { marks = Double.parseDouble(body.get("marks").toString()); } catch (Exception ignored) {}

        }



        String sampleTestCasesJson = "[]";

        if (body.get("sampleTestCases") != null) {

            try { sampleTestCasesJson = objectMapper.writeValueAsString(body.get("sampleTestCases")); } catch (Exception ignored) {}

        }



        String hiddenTestCasesJson = "[]";

        if (body.get("hiddenTestCases") != null) {

            try { hiddenTestCasesJson = objectMapper.writeValueAsString(body.get("hiddenTestCases")); } catch (Exception ignored) {}

        }



        String examplesJson = "[]";

        if (body.get("examples") != null) {

            try { examplesJson = objectMapper.writeValueAsString(body.get("examples")); } catch (Exception ignored) {}

        }



        String starterCodeJson = "{}";

        if (body.get("starterCode") != null) {

            try { starterCodeJson = objectMapper.writeValueAsString(body.get("starterCode")); } catch (Exception ignored) {}

        }



        Optional<CodingQuestion> existingOpt = codingQuestionRepository.findFirstByExamId(examId);

        CodingQuestion cq = existingOpt.orElseGet(() -> new CodingQuestion(examId, title, description));

        cq.setTitle(title);

        cq.setQuestion(title);

        cq.setDescription(description);

        cq.setConstraints(constraints);

        cq.setDifficulty(difficulty);

        cq.setMarks(marks);

        cq.setAllowedLanguages(allowedLanguages);

        cq.setSampleTestCasesJson(sampleTestCasesJson);

        cq.setHiddenTestCasesJson(hiddenTestCasesJson);

        cq.setExamplesJson(examplesJson);

        cq.setStarterCodeJson(starterCodeJson);



        cq = codingQuestionRepository.save(cq);



        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            exam.setHasCodingRound(true);

            exam.setCodingMarks(marks);

            examRepository.save(exam);

        }



        Map<String, Object> map = new HashMap<>();

        map.put("_id", cq.getId().toString());

        map.put("examId", cq.getExamId());

        map.put("title", cq.getTitle());

        map.put("question", cq.getQuestion());

        map.put("description", cq.getDescription());

        map.put("constraints", cq.getConstraints());

        map.put("difficulty", cq.getDifficulty());

        map.put("marks", cq.getMarks());

        map.put("allowedLanguages", cq.getAllowedLanguages());



        return new ResponseEntity<>(Map.of("success", true, "data", map), HttpStatus.CREATED);

    }



    @PutMapping("/api/coding/question/{id}")

    public ResponseEntity<Map<String, Object>> updateCodingQuestion(

            @PathVariable Long id,

            @RequestBody Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can update coding questions."));

        }

        Optional<CodingQuestion> opt = codingQuestionRepository.findById(id);

        if (opt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }

        CodingQuestion cq = opt.get();

        Optional<Exam> examOpt = findExamByCodeOrId(cq.getExamId());

        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }

        if (body.get("title") != null) cq.setTitle((String) body.get("title"));

        if (body.get("question") != null) cq.setQuestion((String) body.get("question"));

        if (body.get("description") != null) cq.setDescription((String) body.get("description"));

        if (body.get("constraints") != null) cq.setConstraints((String) body.get("constraints"));

        if (body.get("difficulty") != null) cq.setDifficulty((String) body.get("difficulty"));

        if (body.get("marks") != null) {

            try { cq.setMarks(Double.parseDouble(body.get("marks").toString())); } catch (Exception ignored) {}

        }

        if (body.get("allowedLanguages") != null) cq.setAllowedLanguages((String) body.get("allowedLanguages"));

        if (body.get("sampleTestCases") != null) {

            try { cq.setSampleTestCasesJson(objectMapper.writeValueAsString(body.get("sampleTestCases"))); } catch (Exception ignored) {}

        }

        if (body.get("hiddenTestCases") != null) {

            try { cq.setHiddenTestCasesJson(objectMapper.writeValueAsString(body.get("hiddenTestCases"))); } catch (Exception ignored) {}

        }

        if (body.get("examples") != null) {

            try { cq.setExamplesJson(objectMapper.writeValueAsString(body.get("examples"))); } catch (Exception ignored) {}

        }

        if (body.get("starterCode") != null) {

            try { cq.setStarterCodeJson(objectMapper.writeValueAsString(body.get("starterCode"))); } catch (Exception ignored) {}

        }

        cq = codingQuestionRepository.save(cq);

        return ResponseEntity.ok(Map.of("success", true, "data", cq));

    }



    @DeleteMapping("/api/coding/question/{id}")

    public ResponseEntity<Map<String, Object>> deleteCodingQuestion(

            @PathVariable Long id,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can delete coding questions."));

        }

        Optional<CodingQuestion> opt = codingQuestionRepository.findById(id);

        if (opt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }

        CodingQuestion cq = opt.get();

        Optional<Exam> examOpt = findExamByCodeOrId(cq.getExamId());

        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }

        codingQuestionRepository.delete(cq);

        if (examOpt.isPresent()) {

            Exam exam = examOpt.get();

            exam.setHasCodingRound(false);

            exam.setCodingMarks(0.0);

            examRepository.save(exam);

        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Coding question deleted"));

    }



    @GetMapping("/api/coding/questions/exam/{examId}")

    public ResponseEntity<Map<String, Object>> getCodingQuestionByExam(@PathVariable String examId) {

        Optional<CodingQuestion> opt = codingQuestionRepository.findFirstByExamId(examId);

        if (opt.isEmpty()) {

            Optional<Exam> examOpt = findExamByCodeOrId(examId);

            if (examOpt.isPresent()) {

                opt = codingQuestionRepository.findFirstByExamId(examOpt.get().getExamCode())

                        .or(() -> codingQuestionRepository.findFirstByExamId(examOpt.get().getId().toString()));

            }

        }



        if (opt.isEmpty()) {

            return ResponseEntity.ok(Map.of("success", false, "message", "No coding question configured for this exam"));

        }



        CodingQuestion cq = opt.get();

        Map<String, Object> map = new HashMap<>();

        map.put("_id", cq.getId().toString());

        map.put("examId", cq.getExamId());

        map.put("title", cq.getTitle());

        map.put("question", cq.getQuestion());

        map.put("description", cq.getDescription());

        map.put("constraints", cq.getConstraints());

        map.put("difficulty", cq.getDifficulty());

        map.put("marks", cq.getMarks());

        map.put("allowedLanguages", cq.getAllowedLanguages());

        map.put("language", cq.getLanguage());



        try {

            map.put("sampleTestCases", objectMapper.readValue(cq.getSampleTestCasesJson(), List.class));

        } catch (Exception e) {

            map.put("sampleTestCases", Collections.emptyList());

        }



        try {

            map.put("examples", objectMapper.readValue(cq.getExamplesJson(), List.class));

        } catch (Exception e) {

            map.put("examples", Collections.emptyList());

        }



        try {

            map.put("starterCode", objectMapper.readValue(cq.getStarterCodeJson(), Map.class));

        } catch (Exception e) {

            map.put("starterCode", Collections.emptyMap());

        }



        return ResponseEntity.ok(Map.of("success", true, "data", map));

    }



    @GetMapping("/api/coding/questions")

    public ResponseEntity<Map<String, Object>> getAllCodingQuestions() {

        List<CodingQuestion> list = codingQuestionRepository.findAll();

        List<Map<String, Object>> data = new ArrayList<>();

        for (CodingQuestion cq : list) {

            Map<String, Object> map = new HashMap<>();

            map.put("_id", cq.getId().toString());

            map.put("examId", cq.getExamId());

            map.put("title", cq.getTitle());

            map.put("question", cq.getQuestion());

            map.put("description", cq.getDescription());

            map.put("difficulty", cq.getDifficulty());

            map.put("marks", cq.getMarks());

            data.add(map);

        }

        return ResponseEntity.ok(Map.of("success", true, "count", data.size(), "data", data));

    }



    @PostMapping({"/api/coding/run", "/api/coding/submit"})

    public ResponseEntity<Map<String, Object>> evaluateCodingAnswer(

            @RequestBody Map<String, Object> body,

            HttpServletRequest request,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        String code = body != null ? (String) body.get("code") : "";

        String language = body != null && body.containsKey("language") ? (String) body.get("language") : "javascript";

        String examId = body != null && body.containsKey("examId") ? String.valueOf(body.get("examId")) : null;

        Object qId = body != null ? body.get("questionId") : null;



        String uri = request.getRequestURI();

        boolean isRunOnly = uri.contains("/run") || (body != null && Boolean.TRUE.equals(body.get("runOnly")));



        Optional<CodingQuestion> cqOpt = Optional.empty();

        if (qId != null) {

            try { cqOpt = codingQuestionRepository.findById(Long.parseLong(qId.toString())); } catch (Exception ignored) {}

        }

        if (cqOpt.isEmpty() && examId != null) {

            cqOpt = codingQuestionRepository.findFirstByExamId(examId);

            if (cqOpt.isEmpty()) {

                Optional<Exam> examOpt = findExamByCodeOrId(examId);

                if (examOpt.isPresent()) {

                    cqOpt = codingQuestionRepository.findFirstByExamId(examOpt.get().getExamCode())

                            .or(() -> codingQuestionRepository.findFirstByExamId(examOpt.get().getId().toString()));

                }

            }

        }



        List<Map<String, Object>> testCasesToRun = new ArrayList<>();

        double questionMarks = 20.0;

        if (cqOpt.isPresent()) {

            CodingQuestion cq = cqOpt.get();

            questionMarks = cq.getMarks() != null ? cq.getMarks() : 20.0;

            try {

                List<Map<String, Object>> samples = objectMapper.readValue(cq.getSampleTestCasesJson(), List.class);

                if (samples != null) {

                    for (int i = 0; i < samples.size(); i++) {

                        Map<String, Object> sc = new HashMap<>(samples.get(i));

                        sc.put("isHidden", false);

                        sc.put("caseNumber", i + 1);

                        testCasesToRun.add(sc);

                    }

                }

            } catch (Exception ignored) {}



            if (!isRunOnly) {

                // Submit executes against hidden test cases too

                try {

                    List<Map<String, Object>> hidden = objectMapper.readValue(cq.getHiddenTestCasesJson(), List.class);

                    if (hidden != null) {

                        for (int i = 0; i < hidden.size(); i++) {

                            Map<String, Object> hc = new HashMap<>(hidden.get(i));

                            hc.put("isHidden", true);

                            hc.put("caseNumber", testCasesToRun.size() + 1);

                            testCasesToRun.add(hc);

                        }

                    }

                } catch (Exception ignored) {}

            }

        }



        List<Map<String, Object>> testResults = new ArrayList<>();

        int passedCount = 0;

        long totalExecutionTime = 0L;



        if (!testCasesToRun.isEmpty()) {

            for (Map<String, Object> tc : testCasesToRun) {

                String input = tc.get("input") != null ? String.valueOf(tc.get("input")) : "";

                String expected = tc.get("expectedOutput") != null ? String.valueOf(tc.get("expectedOutput")) : "";

                boolean isHidden = Boolean.TRUE.equals(tc.get("isHidden"));

                int caseNum = tc.get("caseNumber") != null ? ((Number) tc.get("caseNumber")).intValue() : testResults.size() + 1;



                com.aieval8.examproctoring.service.CodeExecutionService.ExecutionResult res =

                        codeExecutionService.execute(code, language, input);



                totalExecutionTime += res.getExecutionTimeMs();

                boolean passed = res.isSuccess() && compareOutputs(res.getOutput(), expected);

                if (passed) passedCount++;



                Map<String, Object> r = new HashMap<>();

                r.put("testCase", caseNum);

                r.put("passed", passed);

                r.put("runtimeMs", res.getExecutionTimeMs());

                r.put("status", passed ? "Passed" : (res.isSuccess() ? "Wrong Answer" : "Runtime Error"));

                if (!isHidden || isRunOnly) {

                    r.put("input", input);

                    r.put("expectedOutput", expected);

                    r.put("actualOutput", res.getOutput());

                } else {

                    r.put("input", "[Hidden Test Case]");

                    r.put("expectedOutput", "[Hidden]");

                    r.put("actualOutput", passed ? "Match" : "Mismatch");

                }

                testResults.add(r);

            }

        } else {

            String customIn = body != null && body.get("input") != null ? String.valueOf(body.get("input")) : null;

            com.aieval8.examproctoring.service.CodeExecutionService.ExecutionResult res =

                    codeExecutionService.execute(code, language, customIn);

            totalExecutionTime = res.getExecutionTimeMs();

            boolean passed = res.isSuccess();

            if (passed) passedCount = 1;



            Map<String, Object> r = new HashMap<>();

            r.put("testCase", 1);

            r.put("passed", passed);

            r.put("input", customIn != null ? customIn : "");

            r.put("actualOutput", res.getOutput());

            r.put("expectedOutput", res.getOutput());

            r.put("runtimeMs", res.getExecutionTimeMs());

            r.put("status", passed ? "Passed" : "Error");

            testResults.add(r);

        }



        int totalCases = Math.max(1, testCasesToRun.isEmpty() ? 1 : testCasesToRun.size());

        double marksEarned = Math.round(((double) passedCount / totalCases) * questionMarks * 10.0) / 10.0;

        String status = passedCount == totalCases ? "Accepted" : (passedCount > 0 ? "Partially Accepted" : "Wrong Answer");



        if (cqOpt.isPresent()) {

            CodingQuestion cq = cqOpt.get();

            cq.setSubmittedCode(code);

            cq.setLanguage(language);

            cq.setStatus(status);

            cq.setExecutionTime(totalExecutionTime);

            codingQuestionRepository.save(cq);

        }



        if (!isRunOnly && resolved != null && examId != null) {

            Optional<Exam> examOpt = findExamByCodeOrId(examId);

            if (examOpt.isPresent()) {

                Exam exam = examOpt.get();

                List<ExamAttempt> attempts = attemptRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());

                if (!attempts.isEmpty()) {

                    ExamAttempt attempt = attempts.get(attempts.size() - 1);

                    double currentScore = attempt.getScore() != null ? attempt.getScore() : 0.0;

                    double newScore = currentScore + marksEarned;

                    boolean isTerminated = attempt.getStatus() == AttemptStatus.DISQUALIFIED ||

                            (attempt.getTerminationReason() != null && !attempt.getTerminationReason().isBlank()) ||

                            (attempt.getIntegrityScore() != null && attempt.getIntegrityScore() <= 0.0);

                    double passMark = exam.getPassingMarks() != null ? exam.getPassingMarks() : 40.0;

                    boolean marksPassed = newScore >= passMark;

                    boolean passed = !isTerminated && marksPassed;



                    attempt.setScore(newScore);

                    double totalMax = exam.getTotalMarks() != null && exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100.0;

                    attempt.setPercentage(Math.min(100.0, Math.round((newScore / totalMax) * 1000.0) / 10.0));

                    attempt.setPassed(passed);

                    if (!passed) {

                        attempt.setFailReason(isTerminated ? "Failed: exam terminated due to violations." :

                                "Failed: marks below passing score (" + Math.round(newScore) + " obtained, " + Math.round(passMark) + " required).");

                    } else {

                        attempt.setFailReason(null);

                    }

                    if (isTerminated) {

                        attempt.setStatus(AttemptStatus.DISQUALIFIED);

                    } else {

                        attempt.setStatus(AttemptStatus.SUBMITTED);

                    }

                    attempt.setSubmittedAt(LocalDateTime.now());

                    attemptRepository.save(attempt);



                    // Mark student enrollment as COMPLETED upon submitting exam

                    try {

                        enrollmentRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId())

                                .ifPresent(en -> {

                                    en.setStatus(EnrollmentStatus.COMPLETED);

                                    en.setUpdatedAt(LocalDateTime.now());

                                    enrollmentRepository.save(en);

                                });

                    } catch (Exception ignored) {}

                }

            }

        }



        Map<String, Object> resp = new HashMap<>();

        resp.put("success", true);

        resp.put("isRunOnly", isRunOnly);

        resp.put("status", status);

        resp.put("totalTestCases", totalCases);

        resp.put("passedTestCases", passedCount);

        resp.put("marksEarned", marksEarned);

        resp.put("totalMarks", questionMarks);

        resp.put("executionTimeMs", totalExecutionTime);

        resp.put("testResults", testResults);

        resp.put("output", !testResults.isEmpty() ? testResults.get(0).get("actualOutput") : "Execution complete");

        resp.put("message", isRunOnly ? "Code evaluated against sample test cases." : "Solution evaluated against all test cases.");



        return ResponseEntity.ok(resp);

    }



    // ── Exam Results (/api/users/results/**) ──────────────────────────────



    @GetMapping("/api/users/results/all")

    public ResponseEntity<Map<String, Object>> getAllResults(@AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        List<ExamAttempt> attempts;

        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {

            List<Exam> teacherExams = examRepository.findByTeacherId(resolved.getId());

            Set<Long> teacherExamIds = new HashSet<>();

            for (Exam te : teacherExams) {

                teacherExamIds.add(te.getId());

            }

            attempts = attemptRepository.findAll().stream()

                    .filter(a -> a.getExam() != null && teacherExamIds.contains(a.getExam().getId()))

                    .toList();

        } else {

            attempts = attemptRepository.findAll();

        }

        List<Map<String, Object>> data = new ArrayList<>();



        for (ExamAttempt a : attempts) {

            data.add(buildResultMap(a));

        }



        return ResponseEntity.ok(Map.of("success", true, "count", data.size(), "data", data));

    }



    @GetMapping({"/api/users/results/user", "/api/users/results/my-results"})

    public ResponseEntity<Map<String, Object>> getUserResults(@AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        List<ExamAttempt> attempts;

        if (resolved != null) {

            attempts = new ArrayList<>(attemptRepository.findByStudentId(resolved.getId()));

        } else {

            attempts = new ArrayList<>(attemptRepository.findAll());

        }



        attempts.sort((a, b) -> {

            LocalDateTime t1 = a.getSubmittedAt() != null ? a.getSubmittedAt() : (a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN);

            LocalDateTime t2 = b.getSubmittedAt() != null ? b.getSubmittedAt() : (b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN);

            return t2.compareTo(t1);

        });



        List<Map<String, Object>> data = new ArrayList<>();

        for (ExamAttempt a : attempts) {

            data.add(buildResultMap(a));

        }



        return ResponseEntity.ok(Map.of("success", true, "count", data.size(), "data", data));

    }



    @GetMapping("/api/users/results/exam/{examId}")

    public ResponseEntity<Map<String, Object>> getResultsByExam(

            @PathVariable String examId,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        Optional<Exam> examOpt = findExamByCodeOrId(examId);



        if (examOpt.isEmpty()) {

            return ResponseEntity.ok(Map.of("success", true, "count", 0, "data", Collections.emptyList()));

        }



        Exam exam = examOpt.get();

        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }



        List<ExamAttempt> attempts = attemptRepository.findByExamId(exam.getId());



        List<Map<String, Object>> data = new ArrayList<>();

        for (ExamAttempt a : attempts) {

            data.add(buildResultMap(a));

        }



        return ResponseEntity.ok(Map.of("success", true, "count", data.size(), "data", data));

    }



    @PutMapping("/api/users/results/{resultId}/toggle-visibility")

    public ResponseEntity<Map<String, Object>> toggleResultVisibility(@PathVariable Long resultId) {

        return ResponseEntity.ok(Map.of("success", true, "message", "Visibility updated"));

    }



    @PostMapping({"/api/users/results", "/api/results"})

    public ResponseEntity<Map<String, Object>> saveLegacyResult(@RequestBody Map<String, Object> body,

                                                               @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        String examId = (String) body.get("examId");

        Optional<Exam> examOpt = findExamByCodeOrId(examId);



        ExamAttempt attempt = null;

        if (resolved != null && examOpt.isPresent()) {

            List<ExamAttempt> attempts = attemptRepository.findByExamIdAndStudentId(examOpt.get().getId(), resolved.getId());

            if (!attempts.isEmpty()) {

                attempt = attempts.get(attempts.size() - 1);

            }

        }



        Map<String, String> answers = new HashMap<>();

        if (body.get("answers") instanceof Map<?, ?> m) {

            for (Map.Entry<?, ?> entry : m.entrySet()) {

                if (entry.getKey() != null && entry.getValue() != null) {

                    answers.put(entry.getKey().toString(), entry.getValue().toString());

                }

            }

        }



        if (attempt != null && resolved != null) {

            attemptService.submitAttempt(attempt.getId(), answers, resolved);

            ExamAttempt updated = attemptRepository.findById(attempt.getId()).orElse(attempt);

            return new ResponseEntity<>(Map.of("success", true, "data", buildResultMap(updated)), HttpStatus.CREATED);

        }



        Map<String, Object> res = new HashMap<>();

        res.put("_id", String.valueOf(System.currentTimeMillis()));

        Double totalMarks = body.get("totalMarks") instanceof Number ? ((Number) body.get("totalMarks")).doubleValue() : 0.0;

        Double percentage = body.get("percentage") instanceof Number ? ((Number) body.get("percentage")).doubleValue() : 0.0;

        res.put("totalMarks", totalMarks);

        res.put("score", totalMarks);

        res.put("percentage", percentage);

        res.put("showToStudent", true);

        return new ResponseEntity<>(Map.of("success", true, "data", res), HttpStatus.CREATED);

    }



    private Map<String, Object> buildResultMap(ExamAttempt a) {

        Map<String, Object> item = new HashMap<>();

        item.put("_id", a.getId().toString());

        item.put("id", a.getId().toString());

        item.put("attemptId", a.getId().toString());



        Map<String, Object> userMap = new HashMap<>();

        if (a.getStudent() != null) {

            userMap.put("_id", a.getStudent().getId().toString());

            userMap.put("id", a.getStudent().getId().toString());

            userMap.put("name", a.getStudent().getName());

            userMap.put("email", a.getStudent().getEmail());

        }

        item.put("userId", userMap);



        Map<String, Object> examMap = new HashMap<>();

        if (a.getExam() != null) {

            item.put("examId", a.getExam().getExamCode());

            item.put("examCode", a.getExam().getExamCode());

            item.put("examName", a.getExam().getExamName());

            examMap.put("_id", a.getExam().getId().toString());

            examMap.put("id", a.getExam().getId().toString());

            examMap.put("examName", a.getExam().getExamName());

            examMap.put("examId", a.getExam().getExamCode());

            examMap.put("examCode", a.getExam().getExamCode());

            examMap.put("totalMarks", a.getExam().getTotalMarks());

            examMap.put("passingMarks", a.getExam().getPassingMarks());

        }

        item.put("exam", examMap);



        boolean isTerminated = a.getStatus() == AttemptStatus.DISQUALIFIED ||

                (a.getTerminationReason() != null && !a.getTerminationReason().isBlank()) ||

                (a.getIntegrityScore() != null && a.getIntegrityScore() <= 0.0);

        double passMark = a.getExam() != null && a.getExam().getPassingMarks() != null ? a.getExam().getPassingMarks() : 40.0;

        double score = a.getScore() != null ? a.getScore() : 0.0;

        boolean marksPassed = score >= passMark;

        boolean passed = !isTerminated && marksPassed && Boolean.TRUE.equals(a.getPassed());

        String failReason = a.getFailReason();

        if (!passed && (failReason == null || failReason.isBlank())) {

            failReason = isTerminated ? "Failed: exam terminated due to violations." :

                    "Failed: marks below passing score (" + Math.round(score) + " obtained, " + Math.round(passMark) + " required).";

        }



        item.put("score", score);

        item.put("totalMarks", a.getExam() != null ? a.getExam().getTotalMarks() : (a.getScore() != null ? a.getScore() : 0.0));

        item.put("obtainedMarks", score);

        item.put("percentage", a.getPercentage() != null ? a.getPercentage() : 0.0);

        item.put("passed", passed);

        item.put("status", isTerminated ? "DISQUALIFIED" : a.getStatus().name());

        item.put("terminationReason", a.getTerminationReason());

        item.put("failReason", failReason);

        item.put("showToStudent", true);

        item.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : LocalDateTime.now().toString());

        item.put("submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : "");



        double integrity = a.getIntegrityScore() != null ? a.getIntegrityScore() : 100.0;

        Optional<ProctoringSession> sessionOpt = sessionRepository.findByAttemptId(a.getId());

        if (sessionOpt.isPresent()) {

            ProctoringSession ps = sessionOpt.get();

            item.put("sessionId", ps.getId().toString());

            if (ps.getIntegrityScore() != null) {

                integrity = ps.getIntegrityScore();

            }

        }



        item.put("integrityScore", Math.round(integrity * 10.0) / 10.0);

        item.put("fairnessScore", Math.round(integrity * 10.0) / 10.0);

        item.put("codingSubmissions", Collections.emptyList());



        return item;

    }



    @GetMapping({

            "/api/users/results/{attemptId}/detailed-report",

            "/api/results/{attemptId}/detailed-report",

            "/api/users/results/attempt/{attemptId}",

            "/api/results/attempt/{attemptId}",

            "/api/users/results/{attemptId}"

    })

    public ResponseEntity<Map<String, Object>> getDetailedResultReport(

            @PathVariable Long attemptId,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        ExamAttempt a = attemptRepository.findById(attemptId).orElse(null);

        if (a == null) {

            return ResponseEntity.notFound().build();

        }



        boolean isTeacher = resolved != null && "ROLE_TEACHER".equals(resolved.getRole());

        if (isTeacher) {

            if (a.getExam() != null && a.getExam().getTeacher() != null && !a.getExam().getTeacher().getId().equals(resolved.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        } else if (resolved != null && "ROLE_STUDENT".equals(resolved.getRole())) {

            if (a.getStudent() != null && !a.getStudent().getId().equals(resolved.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this attempt."));

            }

        }



        Exam exam = a.getExam();

        User student = a.getStudent();



        // Student's saved answers

        Map<String, String> answers = new HashMap<>();

        if (a.getSavedAnswers() != null && !a.getSavedAnswers().isBlank()) {

            try {

                answers = objectMapper.readValue(a.getSavedAnswers(), Map.class);

            } catch (Exception ignored) {}

        }



        // Questions breakdown

        List<Question> questions = exam != null ? questionRepository.findByExamId(exam.getId()) : Collections.emptyList();

        List<Map<String, Object>> questionReports = new ArrayList<>();

        int correctCount = 0;

        int answeredCount = 0;



        for (int qIdx = 0; qIdx < questions.size(); qIdx++) {

            Question q = questions.get(qIdx);

            Map<String, Object> qr = new HashMap<>();

            qr.put("questionNumber", qIdx + 1);

            qr.put("questionId", q.getId().toString());

            qr.put("questionText", q.getQuestionText());

            qr.put("marks", q.getMarks());



            List<Map<String, Object>> opts = new ArrayList<>();

            String correctAnsText = "";

            try {

                List<?> rawList = objectMapper.readValue(q.getOptionsJson(), List.class);

                if (rawList != null) {

                    for (int i = 0; i < rawList.size(); i++) {

                        Object item = rawList.get(i);

                        String t = "";

                        boolean isCor = (i == q.getCorrectOptionIndex());

                        if (item instanceof Map<?, ?> m) {

                            Object textObj = m.get("optionText");

                            if (textObj == null) textObj = m.get("text");

                            if (textObj == null) textObj = m.get("option");

                            t = textObj != null ? textObj.toString() : "";

                        } else if (item != null) {

                            t = item.toString();

                        }

                        if (isCor) {

                            correctAnsText = t;

                        }

                        opts.add(Map.of("index", i, "text", t, "isCorrect", isCor));

                    }

                }

            } catch (Exception ignored) {}



            qr.put("options", opts);

            qr.put("correctAnswer", correctAnsText);



            String studentAns = null;

            if (answers.containsKey(q.getId().toString())) {

                studentAns = String.valueOf(answers.get(q.getId().toString()));

            } else if (answers.containsKey(String.valueOf(q.getId()))) {

                studentAns = String.valueOf(answers.get(String.valueOf(q.getId())));

            } else if (answers.containsKey(String.valueOf(qIdx))) {

                studentAns = String.valueOf(answers.get(String.valueOf(qIdx)));

            } else if (answers.containsKey(String.valueOf(qIdx + 1))) {

                studentAns = String.valueOf(answers.get(String.valueOf(qIdx + 1)));

            } else {

                for (Map.Entry<String, String> entry : answers.entrySet()) {

                    if (entry.getKey() != null && (

                            entry.getKey().trim().equalsIgnoreCase(q.getId().toString()) ||

                            entry.getKey().trim().equalsIgnoreCase(String.valueOf(qIdx)) ||

                            entry.getKey().trim().equalsIgnoreCase(q.getQuestionText().trim()))) {

                        studentAns = String.valueOf(entry.getValue());

                        break;

                    }

                }

            }



            String studentAnsDisplay = "Not Answered";

            boolean isCorrect = false;



            if (studentAns != null && !studentAns.trim().isEmpty()) {

                answeredCount++;

                String cleanAns = studentAns.trim();



                // 1. Direct index matching (0-based)

                try {

                    int selIdx = Integer.parseInt(cleanAns);

                    if (selIdx >= 0 && selIdx < opts.size()) {

                        studentAnsDisplay = (String) opts.get(selIdx).get("text");

                    } else if (selIdx > 0 && (selIdx - 1) < opts.size()) {

                        studentAnsDisplay = (String) opts.get(selIdx - 1).get("text");

                    } else {

                        studentAnsDisplay = cleanAns;

                    }



                    if (selIdx == q.getCorrectOptionIndex() || selIdx == (q.getCorrectOptionIndex() + 1)) {

                        isCorrect = true;

                    }

                } catch (NumberFormatException ignored) {}



                // 2. Letter matching (A, B, C, D)

                if (!isCorrect && cleanAns.length() == 1) {

                    char c = Character.toUpperCase(cleanAns.charAt(0));

                    if (c >= 'A' && c <= 'Z') {

                        int letterIdx = c - 'A';

                        if (letterIdx >= 0 && letterIdx < opts.size()) {

                            studentAnsDisplay = (String) opts.get(letterIdx).get("text");

                        }

                        if (letterIdx == q.getCorrectOptionIndex()) {

                            isCorrect = true;

                        }

                    }

                }



                // 3. Option text or ID matching

                if (!isCorrect) {

                    for (int i = 0; i < opts.size(); i++) {

                        String optTxt = (String) opts.get(i).get("text");

                        if (optTxt != null && optTxt.trim().equalsIgnoreCase(cleanAns)) {

                            studentAnsDisplay = optTxt;

                            if (i == q.getCorrectOptionIndex()) {

                                isCorrect = true;

                            }

                            break;

                        }

                    }

                    if (studentAnsDisplay.equals("Not Answered")) {

                        studentAnsDisplay = cleanAns;

                    }

                }

            }



            if (isCorrect) {

                correctCount++;

            }



            qr.put("studentAnswer", studentAnsDisplay);

            qr.put("isCorrect", isCorrect);

            qr.put("marksObtained", isCorrect ? q.getMarks() : 0.0);

            questionReports.add(qr);

        }



        // Violations list & summary

        List<Map<String, Object>> violationList = new ArrayList<>();

        Optional<ProctoringSession> sOpt = sessionRepository.findByAttemptId(a.getId());

        if (sOpt.isPresent()) {

            List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(sOpt.get().getId()).stream()

                    .filter(ev -> ev.getPenaltyPoints() != null && ev.getPenaltyPoints() > 0 &&

                                  !ev.getEventType().equalsIgnoreCase("EXAM_STARTED") &&

                                  !ev.getEventType().equalsIgnoreCase("EXAM_SUBMITTED"))

                    .toList();

            for (ProctoringEvent ev : events) {

                Map<String, Object> vMap = new HashMap<>();

                vMap.put("id", ev.getId() != null ? ev.getId().toString() : "");

                vMap.put("eventType", ev.getEventType() != null ? ev.getEventType() : "");

                vMap.put("severity", ev.getSeverity() != null ? ev.getSeverity().name() : "LOW");

                vMap.put("penaltyPoints", ev.getPenaltyPoints() != null ? ev.getPenaltyPoints() : 1);

                vMap.put("description", ev.getDescription() != null ? ev.getDescription() : "");

                vMap.put("evidenceUrl", ev.getEvidenceUrl() != null ? ev.getEvidenceUrl() : "");

                vMap.put("timestamp", ev.getTimestamp() != null ? ev.getTimestamp().toString() : "");

                violationList.add(vMap);

            }

        }



        boolean isTerminated = a.getStatus() == AttemptStatus.DISQUALIFIED ||

                (a.getTerminationReason() != null && !a.getTerminationReason().isBlank()) ||

                (a.getIntegrityScore() != null && a.getIntegrityScore() <= 0.0);

        double passMark = exam != null && exam.getPassingMarks() != null ? exam.getPassingMarks() : 40.0;

        double score = a.getScore() != null ? a.getScore() : 0.0;

        boolean marksPassed = score >= passMark;

        boolean passed = !isTerminated && marksPassed && Boolean.TRUE.equals(a.getPassed());

        String failReason = a.getFailReason();

        if (!passed && (failReason == null || failReason.isBlank())) {

            failReason = isTerminated ? "Failed: exam terminated due to violations." :

                    "Failed: marks below passing score (" + Math.round(score) + " obtained, " + Math.round(passMark) + " required).";

        }



        Map<String, Object> resp = new HashMap<>();

        resp.put("attemptId", a.getId() != null ? a.getId().toString() : "");

        resp.put("score", score);

        resp.put("totalMarks", exam != null && exam.getTotalMarks() != null ? exam.getTotalMarks() : score);

        resp.put("percentage", a.getPercentage() != null ? a.getPercentage() : 0.0);

        resp.put("passed", passed);

        resp.put("status", isTerminated ? "DISQUALIFIED" : (a.getStatus() != null ? a.getStatus().name() : "SUBMITTED"));

        resp.put("terminationReason", a.getTerminationReason());

        resp.put("failReason", failReason);

        resp.put("submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : (a.getCreatedAt() != null ? a.getCreatedAt().toString() : LocalDateTime.now().toString()));



        if (student != null) {

            Map<String, Object> sMap = new HashMap<>();

            sMap.put("id", student.getId() != null ? student.getId().toString() : "");

            sMap.put("name", student.getName() != null ? student.getName() : "");

            sMap.put("email", student.getEmail() != null ? student.getEmail() : "");

            resp.put("student", sMap);

        }



        if (exam != null) {

            Map<String, Object> eMap = new HashMap<>();

            eMap.put("id", exam.getId() != null ? exam.getId().toString() : "");

            eMap.put("examCode", exam.getExamCode() != null ? exam.getExamCode() : "");

            eMap.put("examName", exam.getExamName() != null ? exam.getExamName() : "");

            eMap.put("subject", exam.getSubject() != null ? exam.getSubject() : "");

            eMap.put("passingMarks", exam.getPassingMarks() != null ? exam.getPassingMarks() : 40.0);

            eMap.put("totalMarks", exam.getTotalMarks() != null ? exam.getTotalMarks() : 0.0);

            resp.put("exam", eMap);

        }



        Map<String, Object> summaryMap = new HashMap<>();

        summaryMap.put("totalQuestions", questions.size());

        summaryMap.put("answeredCount", answeredCount);

        summaryMap.put("correctCount", correctCount);

        summaryMap.put("wrongCount", answeredCount - correctCount);

        summaryMap.put("totalViolations", violationList.size());

        resp.put("summary", summaryMap);



        double detailedIntegrity = a.getIntegrityScore() != null ? a.getIntegrityScore() : 100.0;

        if (sOpt.isPresent() && sOpt.get().getIntegrityScore() != null) {

            detailedIntegrity = sOpt.get().getIntegrityScore();

        }

        resp.put("integrityScore", Math.round(detailedIntegrity * 10.0) / 10.0);

        resp.put("fairnessScore", Math.round(detailedIntegrity * 10.0) / 10.0);



        resp.put("questions", questionReports);

        resp.put("violations", violationList);



        return ResponseEntity.ok(resp);

    }



    // ── Cheating Logs (/api/users/cheatingLogs/**, /api/cheatingLogs/**) ───



    @GetMapping({

            "/api/users/cheatingLogs/{examId}",

            "/api/cheatingLogs/{examId}",

            "/api/users/cheating-logs/{examId}",

            "/api/cheating-logs/{examId}"

    })

    public ResponseEntity<List<Map<String, Object>>> getCheatingLogs(

            @PathVariable String examId,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        Optional<Exam> examOpt = findExamByCodeOrId(examId);



        if (examOpt.isPresent() && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {

            Exam exam = examOpt.get();

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

            }

        }



        Map<String, Map<String, Object>> logsByEmail = new LinkedHashMap<>();



        // 1. Load attempts and their live proctoring events

        if (examOpt.isPresent()) {

            List<ExamAttempt> attempts = attemptRepository.findByExamId(examOpt.get().getId());

            for (ExamAttempt att : attempts) {

                String email = att.getStudent() != null ? att.getStudent().getEmail() : "student@demo.com";

                String name = att.getStudent() != null ? att.getStudent().getName() : "Student";

                double fairness = att.getIntegrityScore() != null ? att.getIntegrityScore() : 100.0;



                int noFace = 0;

                int multiFace = 0;

                int cellPhone = 0;

                int prohibited = 0;

                int faceMismatch = att.getFaceMismatchCount();

                List<Map<String, Object>> screenshots = new ArrayList<>();



                Optional<ProctoringSession> sOpt = sessionRepository.findByAttemptId(att.getId());

                if (sOpt.isPresent()) {

                    ProctoringSession ps = sOpt.get();

                    if (ps.getIntegrityScore() != null) fairness = ps.getIntegrityScore();

                    if (ps.getTotalFaceMismatches() > 0) faceMismatch = Math.max(faceMismatch, ps.getTotalFaceMismatches());

                    List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(ps.getId());

                    for (ProctoringEvent ev : events) {

                        if (ev.getPenaltyPoints() == null || ev.getPenaltyPoints() <= 0) continue;

                        String type = ev.getEventType().toUpperCase();

                        if (type.contains("START") || type.contains("SUBMIT")) continue;

                        if (type.contains("MISMATCH") || type.contains("UNAUTHORIZED")) faceMismatch++;

                        else if (type.contains("NO_FACE") || type.contains("NOT_VISIBLE")) noFace++;

                        else if (type.contains("MULTIPLE")) multiFace++;

                        else if (type.contains("CELL") || type.contains("PHONE")) cellPhone++;

                        else prohibited++;



                        if (ev.getEvidenceUrl() != null && !ev.getEvidenceUrl().isEmpty()) {

                            Map<String, Object> sc = new HashMap<>();

                            sc.put("url", ev.getEvidenceUrl());

                            sc.put("type", ev.getEventType() != null ? ev.getEventType() : "");

                            sc.put("detectedAt", ev.getTimestamp() != null ? ev.getTimestamp().toString() : "");

                            screenshots.add(sc);

                        }

                    }

                }



                String verificationStatus = att.getFaceVerificationStatus() != null ? att.getFaceVerificationStatus() : (faceMismatch > 0 ? "MISMATCH" : "VERIFIED");



                Map<String, Object> map = new HashMap<>();

                map.put("_id", att.getId().toString());

                map.put("studentId", att.getStudent() != null ? att.getStudent().getId() : null);

                map.put("examId", examId);

                map.put("username", name);

                map.put("email", email);

                map.put("faceMismatchCount", faceMismatch);

                map.put("faceVerificationStatus", verificationStatus);

                map.put("noFaceCount", noFace);

                map.put("multipleFaceCount", multiFace);

                map.put("cellPhoneCount", cellPhone);

                map.put("prohibitedObjectCount", prohibited);

                map.put("fairnessScore", Math.round(fairness));

                map.put("integrityScore", Math.round(fairness));

                map.put("totalViolations", noFace + multiFace + cellPhone + prohibited + faceMismatch);

                map.put("status", att.getStatus().toString());

                map.put("screenshots", screenshots);

                logsByEmail.put(email.toLowerCase(), map);

            }

        }



        // 2. Overlay / Merge with any entries directly in cheatingLogRepository

        List<CheatingLogEntry> entries = new ArrayList<>(cheatingLogRepository.findByExamIdOrderByCreatedAtDesc(examId));

        if (examOpt.isPresent()) {

            Exam ex = examOpt.get();

            if (ex.getExamCode() != null && !ex.getExamCode().equalsIgnoreCase(examId)) {

                entries.addAll(cheatingLogRepository.findByExamIdOrderByCreatedAtDesc(ex.getExamCode()));

            }

            if (ex.getId() != null && !ex.getId().toString().equalsIgnoreCase(examId)) {

                entries.addAll(cheatingLogRepository.findByExamIdOrderByCreatedAtDesc(ex.getId().toString()));

            }

        }

        for (CheatingLogEntry e : entries) {

            String emailKey = e.getEmail() != null ? e.getEmail().toLowerCase() : "";

            Map<String, Object> map = logsByEmail.get(emailKey);

            if (map == null) {

                map = new HashMap<>();

                map.put("_id", e.getId().toString());

                map.put("examId", e.getExamId());

                map.put("username", e.getUsername());

                map.put("email", e.getEmail());

                int nf = e.getNoFaceCount() != null ? e.getNoFaceCount() : 0;

                int mf = e.getMultipleFaceCount() != null ? e.getMultipleFaceCount() : 0;

                int cp = e.getCellPhoneCount() != null ? e.getCellPhoneCount() : 0;

                int pr = e.getProhibitedObjectCount() != null ? e.getProhibitedObjectCount() : 0;

                map.put("noFaceCount", nf);

                map.put("multipleFaceCount", mf);

                map.put("cellPhoneCount", cp);

                map.put("prohibitedObjectCount", pr);

                int totalV = nf + mf + cp + pr;

                double fs = e.getFairnessScore() != null ? e.getFairnessScore() : 100.0;

                map.put("fairnessScore", Math.round(fs));

                map.put("integrityScore", Math.round(fs));

                map.put("totalViolations", totalV);

                try {

                    map.put("screenshots", objectMapper.readValue(e.getScreenshotsJson(), List.class));

                } catch (Exception ex) {

                    map.put("screenshots", Collections.emptyList());

                }

                logsByEmail.put(emailKey, map);

            } else {

                int noFace = Math.max(((Number) map.get("noFaceCount")).intValue(), e.getNoFaceCount() != null ? e.getNoFaceCount() : 0);

                int multiFace = Math.max(((Number) map.get("multipleFaceCount")).intValue(), e.getMultipleFaceCount() != null ? e.getMultipleFaceCount() : 0);

                int cellPhone = Math.max(((Number) map.get("cellPhoneCount")).intValue(), e.getCellPhoneCount() != null ? e.getCellPhoneCount() : 0);

                int prohibited = Math.max(((Number) map.get("prohibitedObjectCount")).intValue(), e.getProhibitedObjectCount() != null ? e.getProhibitedObjectCount() : 0);

                int totalVMerged = noFace + multiFace + cellPhone + prohibited;

                map.put("noFaceCount", noFace);

                map.put("multipleFaceCount", multiFace);

                map.put("cellPhoneCount", cellPhone);

                map.put("prohibitedObjectCount", prohibited);

                map.put("totalViolations", totalVMerged);

                double mergedFs = e.getFairnessScore() != null ? e.getFairnessScore() : 100.0;

                map.put("fairnessScore", Math.round(mergedFs));

                map.put("integrityScore", Math.round(mergedFs));

                try {

                    List<Map<String, Object>> existing = new ArrayList<>((List<Map<String, Object>>) map.get("screenshots"));

                    List<Map<String, Object>> fromEntry = objectMapper.readValue(e.getScreenshotsJson(), List.class);

                    if (fromEntry != null) {

                        for (Map<String, Object> sc : fromEntry) {

                            if (existing.stream().noneMatch(s -> Objects.equals(s.get("url"), sc.get("url")))) {

                                existing.add(sc);

                            }

                        }

                    }

                    map.put("screenshots", existing);

                } catch (Exception ignored) {}

            }

        }



        List<Map<String, Object>> result = new ArrayList<>(logsByEmail.values());

        return ResponseEntity.ok(result);

    }



    @PostMapping({

            "/api/users/cheatingLogs",

            "/api/cheatingLogs",

            "/api/users/cheating-logs",

            "/api/cheating-logs"

    })

    public ResponseEntity<Map<String, Object>> saveCheatingLog(@RequestBody Map<String, Object> body) {

        String examId = String.valueOf(body.get("examId"));

        String username = (String) body.get("username");

        String email = (String) body.get("email");



        Integer noFace = body.get("noFaceCount") instanceof Number ? ((Number) body.get("noFaceCount")).intValue() : 0;

        Integer multiFace = body.get("multipleFaceCount") instanceof Number ? ((Number) body.get("multipleFaceCount")).intValue() : 0;

        Integer cellPhone = body.get("cellPhoneCount") instanceof Number ? ((Number) body.get("cellPhoneCount")).intValue() : 0;

        Integer prohibited = body.get("prohibitedObjectCount") instanceof Number ? ((Number) body.get("prohibitedObjectCount")).intValue() : 0;



        String screenshotsJson = "[]";

        if (body.get("screenshots") != null) {

            try {

                screenshotsJson = objectMapper.writeValueAsString(body.get("screenshots"));

            } catch (Exception ignored) {

            }

        }



        CheatingLogEntry entry = new CheatingLogEntry(examId, username, email, noFace, multiFace, cellPhone, prohibited, screenshotsJson);

        entry = cheatingLogRepository.save(entry);



        Map<String, Object> res = new HashMap<>();

        res.put("_id", entry.getId().toString());

        res.put("examId", entry.getExamId());

        res.put("username", entry.getUsername());

        res.put("email", entry.getEmail());

        res.put("noFaceCount", entry.getNoFaceCount());

        res.put("multipleFaceCount", entry.getMultipleFaceCount());

        res.put("cellPhoneCount", entry.getCellPhoneCount());

        res.put("prohibitedObjectCount", entry.getProhibitedObjectCount());

        res.put("screenshots", body.get("screenshots") != null ? body.get("screenshots") : Collections.emptyList());



        return new ResponseEntity<>(res, HttpStatus.CREATED);

    }



    // ── Legacy Session Endpoints (/api/sessions) ──────────────────────────



    @PostMapping("/api/sessions/start")

    public ResponseEntity<Map<String, Object>> startLegacySession(

            @RequestBody Map<String, Object> body,

            HttpServletRequest request,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {



        CustomUserDetails resolved = resolveUser(studentDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_STUDENT".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only students can start exam sessions."));

        }

        String examCode = (String) body.get("examId");

        String examPassword = body.get("examPassword") != null ? (String) body.get("examPassword") : (String) body.get("password");

        String deviceInfo = request.getHeader("User-Agent");



        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        String finalCode = examOpt.map(Exam::getExamCode).orElse(examCode);



        AttemptResponse res = attemptService.startOrResumeAttempt(finalCode, examPassword, deviceInfo, resolved);



        // Milestone event: EXAM_STARTED

        sessionRepository.findByAttemptId(res.getAttemptId()).ifPresent(ps -> {

            ProctoringEvent ev = new ProctoringEvent(ps, "EXAM_STARTED", ViolationSeverity.LOW, 1.0, 0, "Student started exam session", null, "{}");

            eventRepository.save(ev);

        });



        Map<String, Object> map = new HashMap<>();

        map.put("session", Map.of(

                "_id", res.getAttemptId().toString(),

                "examId", finalCode,

                "status", res.getStatus().name(),

                "serverDeadline", res.getServerDeadline().toString(),

                "answers", res.getSavedAnswers() != null ? res.getSavedAnswers() : "{}"

        ));

        map.put("sessionId", res.getAttemptId().toString());

        map.put("attemptId", res.getAttemptId().toString());

        map.put("timeLeftSeconds", res.getTimeLeftSeconds());

        map.put("resumed", false);

        double startIntegrity = sessionRepository.findByAttemptId(res.getAttemptId())

                .map(ps -> ps.getIntegrityScore() != null ? ps.getIntegrityScore() : 100.0)

                .orElse(100.0);

        map.put("integrityScore", startIntegrity);

        map.put("fairnessScore", startIntegrity);

        return ResponseEntity.ok(map);

    }



    @RequestMapping(value = "/api/sessions/{attemptId}/autosave", method = {RequestMethod.PUT, RequestMethod.POST})

    public ResponseEntity<Map<String, Object>> autoSave(

            @PathVariable Long attemptId,

            @RequestBody Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {



        CustomUserDetails resolved = resolveUser(studentDetails);

        Map<String, String> answers = (Map<String, String>) body.get("answers");

        attemptService.autosaveAnswers(attemptId, answers, resolved);



        // Milestone event: QUESTION_ANSWERED

        sessionRepository.findByAttemptId(attemptId).ifPresent(ps -> {

            int count = answers != null ? answers.size() : 0;

            ProctoringEvent ev = new ProctoringEvent(ps, "QUESTION_ANSWERED", ViolationSeverity.LOW, 1.0, 0, "Student answered " + count + " question(s)", null, "{}");

            eventRepository.save(ev);

        });



        return ResponseEntity.ok(Map.of("success", true));

    }



    @PostMapping("/api/sessions/{attemptId}/submit")

    public ResponseEntity<Map<String, Object>> submitLegacySession(

            @PathVariable Long attemptId,

            @RequestBody Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {



        CustomUserDetails resolved = resolveUser(studentDetails);

        Map<String, String> answers = (Map<String, String>) body.get("answers");

        AttemptResponse res = attemptService.submitAttempt(attemptId, answers, resolved);



        // Milestone event: EXAM_SUBMITTED

        sessionRepository.findByAttemptId(attemptId).ifPresent(ps -> {

            ProctoringEvent ev = new ProctoringEvent(ps, "EXAM_SUBMITTED", ViolationSeverity.LOW, 1.0, 0,

                    "Exam submitted with score: " + res.getScore() + " (" + res.getPercentage() + "%)", null, "{}");

            eventRepository.save(ev);

        });



        Map<String, Object> respMap = new HashMap<>();

        respMap.put("success", true);

        respMap.put("score", res.getScore());

        respMap.put("percentage", res.getPercentage());

        respMap.put("passed", res.getPassed());

        respMap.put("status", res.getStatus().name());

        respMap.put("terminationReason", res.getTerminationReason());

        respMap.put("failReason", res.getFailReason());

        return ResponseEntity.ok(respMap);

    }



    @GetMapping("/api/sessions/{attemptId}")

    public ResponseEntity<Map<String, Object>> getLegacySession(

            @PathVariable Long attemptId,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {

        ExamAttempt attempt = attemptRepository.findById(attemptId).orElse(null);

        if (attempt == null) {

            return ResponseEntity.notFound().build();

        }

        Map<String, Object> map = new HashMap<>();

        map.put("_id", attempt.getId().toString());

        map.put("sessionId", attempt.getId().toString());

        map.put("attemptId", attempt.getId().toString());

        map.put("examId", attempt.getExam() != null ? attempt.getExam().getExamCode() : "");

        map.put("status", attempt.getStatus().name());

        map.put("serverDeadline", attempt.getServerDeadline() != null ? attempt.getServerDeadline().toString() : "");

        map.put("answers", attempt.getSavedAnswers() != null ? attempt.getSavedAnswers() : "{}");

        return ResponseEntity.ok(map);

    }



    @PostMapping("/api/sessions/{attemptId}/terminate")

    public ResponseEntity<Map<String, Object>> terminateLegacySession(

            @PathVariable Long attemptId,

            @RequestBody(required = false) Map<String, Object> body,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {

        CustomUserDetails resolved = resolveUser(studentDetails);

        ExamAttempt attempt = attemptRepository.findById(attemptId).orElse(null);

        if (attempt == null) {

            return ResponseEntity.notFound().build();

        }



        String reason = body != null && body.get("reason") != null ? body.get("reason").toString() : "Proctoring violation limit reached";



        // Grade whatever answers were saved so far so score is saved

        Map<String, String> answers = new HashMap<>();

        if (attempt.getSavedAnswers() != null && !attempt.getSavedAnswers().isBlank()) {

            try {

                answers = objectMapper.readValue(attempt.getSavedAnswers(), Map.class);

            } catch (Exception ignored) {}

        }

        if (resolved != null) {

            try {

                attemptService.submitAttempt(attemptId, answers, resolved);

            } catch (Exception ignored) {}

        }



        attempt = attemptRepository.findById(attemptId).orElse(attempt);

        attempt.setStatus(AttemptStatus.DISQUALIFIED);

        attempt.setTerminationReason(reason);

        attempt.setPassed(false);

        attempt.setFailReason("Failed: exam terminated due to violations.");

        attempt.setSubmittedAt(LocalDateTime.now());

        attempt = attemptRepository.save(attempt);



        // Mark student enrollment as COMPLETED on exam termination

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



        sessionRepository.findByAttemptId(attempt.getId()).ifPresent(s -> {

            s.setVerdict("TERMINATED");

            s.setEndedAt(LocalDateTime.now());

            sessionRepository.save(s);

            ProctoringEvent ev = new ProctoringEvent(s, "EXAM_TERMINATED", ViolationSeverity.CRITICAL, 1.0, 20, reason, null, "{}");

            eventRepository.save(ev);

        });



        Map<String, Object> termResp = new HashMap<>();

        termResp.put("success", true);

        termResp.put("score", attempt.getScore() != null ? attempt.getScore() : 0.0);

        termResp.put("percentage", attempt.getPercentage() != null ? attempt.getPercentage() : 0.0);

        termResp.put("passed", false);

        termResp.put("status", "DISQUALIFIED");

        termResp.put("terminationReason", reason);

        termResp.put("failReason", "Failed: exam terminated due to violations.");

        termResp.put("message", "Session terminated due to proctoring violation limit: " + reason);

        return ResponseEntity.ok(termResp);

    }



    // ── Exam Password & Enrollment Verification Gatekeeper ────────────────



    @PostMapping("/api/sessions/verify-access")

    public ResponseEntity<Map<String, Object>> verifyExamAccess(

            @RequestBody Map<String, String> body,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {



        CustomUserDetails resolved = resolveUser(studentDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required. Please log in."));

        }



        String examCode = body.get("examId");

        if (examCode == null || examCode.trim().isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam code is required."));

        }



        Optional<Exam> examOpt = findExamByCodeOrId(examCode.trim());

        if (examOpt.isEmpty()) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Exam not found: " + examCode));

        }

        Exam exam = examOpt.get();

        boolean isTeacher = "ROLE_TEACHER".equals(resolved.getRole());



        // 1. Password check

        String password = body.get("password");

        if (exam.getExamPasswordHash() != null && !exam.getExamPasswordHash().isEmpty()) {

            if (password == null || !passwordEncoder.matches(password.trim(), exam.getExamPasswordHash())) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(

                        "error", "Invalid exam password. Access denied.",

                        "enrolled", false,

                        "passwordValid", false

                ));

            }

        }



        // 2. Strict Enrollment check: Unapproved/unenrolled students are rejected

        if (!isTeacher) {

            Optional<ExamEnrollment> enrollmentOpt = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());

            if (enrollmentOpt.isEmpty()) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: You are not enrolled in this exam. Please request enrollment first.",

                        "enrolled", false,

                        "status", "NOT_ENROLLED"

                ));

            }



            ExamEnrollment enrollment = enrollmentOpt.get();

            if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: You have already completed and submitted this examination. Multiple attempts are not permitted.",

                        "enrolled", false,

                        "status", "COMPLETED"

                ));

            }



            List<ExamAttempt> pastAttempts = attemptRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());

            LocalDateTime reEnrolledAt = enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt() : LocalDateTime.MIN;

            boolean alreadySubmitted = pastAttempts.stream().anyMatch(a ->

                    (a.getStatus() == AttemptStatus.SUBMITTED ||

                     a.getStatus() == AttemptStatus.COMPLETED ||

                     a.getStatus() == AttemptStatus.DISQUALIFIED ||

                     a.getStatus() == AttemptStatus.AUTO_SUBMITTED) &&

                    (a.getSubmittedAt() == null || !a.getSubmittedAt().isBefore(reEnrolledAt)));

            if (alreadySubmitted) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: You have already completed and submitted this examination. Multiple attempts are not permitted.",

                        "enrolled", false,

                        "status", "COMPLETED"

                ));

            }



            if (enrollment.getStatus() == EnrollmentStatus.PENDING) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: Your enrollment request is pending approval by the instructor.",

                        "enrolled", false,

                        "status", "PENDING"

                ));

            }

            if (enrollment.getStatus() == EnrollmentStatus.REJECTED) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: Your enrollment request was rejected by the instructor.",

                        "enrolled", false,

                        "status", "REJECTED"

                ));

            }

            if (enrollment.getStatus() == EnrollmentStatus.BLOCKED) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: You are blocked from participating in this exam.",

                        "enrolled", false,

                        "status", "BLOCKED"

                ));

            }

            if (enrollment.getStatus() != EnrollmentStatus.ENROLLED) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                        "error", "Access Denied: You are not authorized to participate in this exam.",

                        "enrolled", false,

                        "status", enrollment.getStatus().name()

                ));

            }

        }



        // 3. Exam window check

        LocalDateTime now = LocalDateTime.now();

        if (exam.getStartTime() != null && now.isBefore(exam.getStartTime())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                    "error", "Exam has not started yet. Starts at: " + exam.getStartTime(),

                    "enrolled", true

            ));

        }

        if (exam.getEndTime() != null && now.isAfter(exam.getEndTime())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(

                    "error", "Exam has ended. Ended at: " + exam.getEndTime(),

                    "enrolled", true

            ));

        }



        return ResponseEntity.ok(Map.of(

                "success", true,

                "verified", true,

                "valid", true,

                "enrolled", true,

                "examId", exam.getExamCode(),

                "examName", exam.getExamName(),

                "duration", exam.getDurationMinutes()

        ));

    }



    // ── Student Enrollment Request & Approval Endpoints ──────────────────



    @PostMapping("/api/users/exam/{examCode}/request-enrollment")

    public ResponseEntity<Map<String, Object>> requestEnrollment(

            @PathVariable String examCode,

            @AuthenticationPrincipal CustomUserDetails studentDetails) {



        CustomUserDetails resolved = resolveUser(studentDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_STUDENT".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only students can request enrollment."));

        }



        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {

            return ResponseEntity.notFound().build();

        }



        Exam exam = examOpt.get();

        User student = userRepository.findById(resolved.getId()).orElse(null);

        if (student == null) {

            return ResponseEntity.badRequest().body(Map.of("error", "Student record not found."));

        }



        List<ExamAttempt> pastAttempts = attemptRepository.findByExamIdAndStudentId(exam.getId(), student.getId());

        boolean alreadySubmitted = pastAttempts.stream().anyMatch(a ->

                a.getStatus() == AttemptStatus.SUBMITTED ||

                a.getStatus() == AttemptStatus.COMPLETED ||

                a.getStatus() == AttemptStatus.DISQUALIFIED ||

                a.getStatus() == AttemptStatus.AUTO_SUBMITTED);



        Optional<ExamEnrollment> enOpt = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId());

        if (alreadySubmitted || (enOpt.isPresent() && enOpt.get().getStatus() == EnrollmentStatus.COMPLETED)) {

            return ResponseEntity.badRequest().body(Map.of(

                    "error", "You have already completed this exam and cannot re-enroll.",

                    "status", "COMPLETED"

            ));

        }



        ExamEnrollment enrollment;

        if (enOpt.isPresent()) {

            enrollment = enOpt.get();

            if (enrollment.getStatus() == EnrollmentStatus.ENROLLED) {

                return ResponseEntity.ok(Map.of("success", true, "message", "You are already enrolled and approved for this exam.", "status", "ENROLLED"));

            }

            enrollment.setStatus(EnrollmentStatus.PENDING);

            enrollment.setEnrolledAt(LocalDateTime.now());

        } else {

            enrollment = new ExamEnrollment(exam, student, EnrollmentStatus.PENDING, null);

        }

        enrollmentRepository.save(enrollment);



        if (exam.getTeacher() != null) {

            try {

                notificationService.createNotification(

                        exam.getTeacher(),

                        "ENROLLMENT_REQUEST",

                        "New Enrollment Request",

                        "Student " + student.getName() + " requested enrollment for exam " + (exam.getExamName() != null ? exam.getExamName() : exam.getExamCode()),

                        exam.getExamCode(),

                        enrollment.getId(),

                        "/user-approvals?tab=pending&examCode=" + exam.getExamCode() + "&requestId=" + enrollment.getId()

                );

            } catch (Exception ignored) {}

        }



        return ResponseEntity.ok(Map.of(

                "success", true,

                "message", "Enrollment request submitted successfully. Waiting for teacher approval.",

                "status", "PENDING"

        ));

    }



    @GetMapping({

            "/api/users/exam/{examCode}/enrollment-requests",

            "/api/users/exam/pending-requests",

            "/api/users/exam/all/enrollment-requests"

    })

    public ResponseEntity<List<Map<String, Object>>> getEnrollmentRequests(

            @PathVariable(required = false) String examCode,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        }

        List<ExamEnrollment> requests = new ArrayList<>();



        if (examCode == null || "all".equalsIgnoreCase(examCode) || "pending-requests".equalsIgnoreCase(examCode)) {

            if ("ROLE_TEACHER".equals(resolved.getRole())) {

                requests = enrollmentRepository.findByExamTeacherIdAndStatus(resolved.getId(), EnrollmentStatus.PENDING);

            } else {

                requests = enrollmentRepository.findAll().stream()

                        .filter(r -> r.getStatus() == EnrollmentStatus.PENDING)

                        .toList();

            }

        } else {

            Optional<Exam> examOpt = findExamByCodeOrId(examCode);

            if (examOpt.isEmpty()) {

                return ResponseEntity.ok(Collections.emptyList());

            }



            Exam exam = examOpt.get();

            if ("ROLE_TEACHER".equals(resolved.getRole())) {

                if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

                }

            }



            requests = enrollmentRepository.findByExamId(exam.getId());

        }



        List<Map<String, Object>> result = new ArrayList<>();

        for (ExamEnrollment req : requests) {

            User s = req.getStudent();

            if (s == null) continue;

            Map<String, Object> map = new HashMap<>();

            map.put("id", req.getId().toString());

            map.put("enrollmentId", req.getId().toString());

            map.put("studentId", s.getId().toString());

            map.put("name", s.getName());

            map.put("studentName", s.getName());

            map.put("email", s.getEmail());

            map.put("studentIdNumber", s.getStudentIdNumber() != null ? s.getStudentIdNumber() : "—");

            map.put("status", req.getStatus().name());

            map.put("examId", req.getExam() != null ? req.getExam().getExamCode() : "");

            map.put("examCode", req.getExam() != null ? req.getExam().getExamCode() : "");

            map.put("examName", req.getExam() != null ? req.getExam().getExamName() : "");

            map.put("requestedAt", req.getEnrolledAt() != null ? req.getEnrolledAt().toString() : (req.getCreatedAt() != null ? req.getCreatedAt().toString() : ""));

            result.add(map);

        }

        return ResponseEntity.ok(result);

    }



    @PostMapping({"/api/users/exam/{examCode}/approve-student/{studentId}", "/api/users/exam/{examCode}/enrollment/{studentId}/approve", "/api/users/exam/{examCode}/approve-enrollment/{studentId}"})

    public ResponseEntity<Map<String, Object>> approveStudent(

            @PathVariable String examCode,

            @PathVariable Long studentId,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can approve students."));

        }

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found"));

        }



        Exam exam = examOpt.get();

        if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }



        User student = userRepository.findById(studentId).orElse(null);

        if (student == null) {

            return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));

        }



        User teacher = resolved != null ? userRepository.findById(resolved.getId()).orElse(null) : null;

        ExamEnrollment en = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), studentId)

                .orElseGet(() -> new ExamEnrollment(exam, student, EnrollmentStatus.ENROLLED, teacher));



        en.setStatus(EnrollmentStatus.ENROLLED);

        en.setEnrolledBy(teacher);

        en.setEnrolledAt(LocalDateTime.now());

        if (en.getAttemptsUsed() >= en.getAttemptLimit()) {

            en.setAttemptLimit(en.getAttemptsUsed() + 1);

        }

        enrollmentRepository.save(en);



        try {

            notificationService.createNotification(

                    student,

                    "ENROLLMENT_APPROVED",

                    "Enrollment Approved",

                    "Your enrollment request for exam " + (exam.getExamName() != null ? exam.getExamName() : exam.getExamCode()) + " has been approved.",

                    exam.getExamCode(),

                    en.getId(),

                    "/exam/" + exam.getExamCode()

            );

        } catch (Exception ignored) {}



        return ResponseEntity.ok(Map.of("success", true, "message", "Student approved successfully."));

    }



    @PostMapping("/api/users/exam/{examCode}/reject-student/{studentId}")

    public ResponseEntity<Map<String, Object>> rejectStudent(

            @PathVariable String examCode,

            @PathVariable Long studentId,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Only teachers can reject students."));

        }

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found"));

        }



        Exam exam = examOpt.get();

        if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

        }



        User student = userRepository.findById(studentId).orElse(null);

        ExamEnrollment en = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), studentId).orElse(null);

        if (en != null) {

            en.setStatus(EnrollmentStatus.REJECTED);

            enrollmentRepository.save(en);



            if (student != null) {

                try {

                    notificationService.createNotification(

                            student,

                            "ENROLLMENT_REJECTED",

                            "Enrollment Rejected",

                            "Your enrollment request for exam " + (exam.getExamName() != null ? exam.getExamName() : exam.getExamCode()) + " was rejected.",

                            exam.getExamCode(),

                            en.getId(),

                            "/exam"

                    );

                } catch (Exception ignored) {}

            }

        }



        return ResponseEntity.ok(Map.of("success", true, "message", "Student request rejected."));

    }



    // ── Teacher Student Enrollment Endpoints ──────────────────────────────



    @GetMapping("/api/users/students")

    public ResponseEntity<List<Map<String, Object>>> getAvailableStudentsList(

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        }

        List<User> students = userRepository.findAll().stream()

                .filter(u -> u.getRole() == Role.ROLE_STUDENT)

                .toList();



        List<Map<String, Object>> result = new ArrayList<>();

        for (User s : students) {

            Map<String, Object> map = new HashMap<>();

            map.put("_id", s.getId().toString());

            map.put("id", s.getId());

            map.put("name", s.getName());

            map.put("email", s.getEmail());

            map.put("phone", s.getPhone());

            map.put("studentIdNumber", s.getStudentIdNumber() != null ? s.getStudentIdNumber() : "—");

            map.put("institution", s.getClient() != null ? s.getClient().getName() : "General");

            result.add(map);

        }

        return ResponseEntity.ok(result);

    }



    @GetMapping("/api/users/exam/{examCode}/enrolled-students")

    public ResponseEntity<List<Map<String, Object>>> getEnrolledStudentsForExam(

            @PathVariable String examCode,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        }

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);



        if (examOpt.isEmpty()) {

            return ResponseEntity.ok(Collections.emptyList());

        }



        Exam exam = examOpt.get();

        if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        }



        List<ExamEnrollment> enrollments = enrollmentRepository.findByExamId(exam.getId());

        List<Map<String, Object>> result = new ArrayList<>();

        for (ExamEnrollment en : enrollments) {

            Map<String, Object> map = new HashMap<>();

            map.put("_id", en.getId().toString());

            map.put("enrollmentId", en.getId());

            map.put("studentId", en.getStudent().getId().toString());

            map.put("name", en.getStudent().getName());

            map.put("email", en.getStudent().getEmail());

            map.put("studentIdNumber", en.getStudent().getStudentIdNumber() != null ? en.getStudent().getStudentIdNumber() : "—");

            map.put("status", en.getStatus().name());

            map.put("attemptsUsed", en.getAttemptsUsed());

            map.put("attemptLimit", en.getAttemptLimit());

            result.add(map);

        }

        return ResponseEntity.ok(result);

    }



    @PostMapping({"/api/users/exam/{examCode}/enroll-student", "/api/users/exam/enroll-student"})

    public ResponseEntity<Map<String, Object>> enrollStudentInExam(

            @PathVariable(required = false) String examCode,

            @RequestBody Map<String, String> body,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        String targetCode = (examCode != null && !examCode.isEmpty()) ? examCode : (body != null ? body.get("examId") : null);

        Optional<Exam> examOpt = findExamByCodeOrId(targetCode);



        if (examOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found: " + (targetCode != null ? targetCode : "unknown")));

        }



        Exam exam = examOpt.get();

        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {

            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));

            }

        }



        String studentEmail = body.get("email") != null ? body.get("email") : body.get("studentEmail");

        String studentIdStr = body.get("studentId");



        User student = null;

        if (studentEmail != null && !studentEmail.trim().isEmpty()) {

            student = userRepository.findByEmail(studentEmail.trim()).orElse(null);

        } else if (studentIdStr != null) {

            try {

                student = userRepository.findById(Long.parseLong(studentIdStr)).orElse(null);

            } catch (Exception ignored) {}

        }



        if (student == null || student.getRole() != Role.ROLE_STUDENT) {

            return ResponseEntity.badRequest().body(Map.of("error", "Student account not found or invalid role."));

        }



        User enrolledStudent = student;

        ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())

                .orElseGet(() -> {

                    ExamEnrollment newEn = new ExamEnrollment();

                    newEn.setExam(exam);

                    newEn.setStudent(enrolledStudent);

                    return newEn;

                });



        enrollment.setStatus(EnrollmentStatus.ENROLLED);

        if (resolved != null) {

            userRepository.findById(resolved.getId()).ifPresent(enrollment::setEnrolledBy);

        } else if (exam.getTeacher() != null) {

            enrollment.setEnrolledBy(exam.getTeacher());

        }

        enrollmentRepository.save(enrollment);



        return ResponseEntity.ok(Map.of(

                "success", true,

                "message", "Student " + student.getName() + " enrolled successfully in " + exam.getExamName()

        ));

    }



    @DeleteMapping("/api/users/exam/{examCode}/unenroll-student/{studentId}")

    public ResponseEntity<Map<String, Object>> unenrollStudentFromExam(

            @PathVariable String examCode,

            @PathVariable Long studentId,

            @AuthenticationPrincipal CustomUserDetails teacherDetails) {



        CustomUserDetails resolved = resolveUser(teacherDetails);

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);



        if (examOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found: " + examCode));

        }



        Exam exam = examOpt.get();

        enrollmentService.unenrollStudent(exam.getId(), studentId, resolved);



        return ResponseEntity.ok(Map.of("success", true, "message", "Student unenrolled successfully."));

    }



    @GetMapping("/api/users/student/dashboard")

    public ResponseEntity<Map<String, Object>> getLegacyStudentDashboard(@AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        if (resolved == null) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));

        }

        User student = userRepository.findById(resolved.getId())

                .orElse(null);

        if (student == null) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Student not found"));

        }



        List<ExamEnrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());

        List<ExamAttempt> attempts = attemptRepository.findByStudentId(student.getId());

        List<Exam> publishedExams = examRepository.findByStatus("PUBLISHED");



        long enrolledExamsCount = enrollments.stream()

                .filter(e -> e.getStatus() == EnrollmentStatus.ENROLLED)

                .count();



        long eligibleExamsCount = publishedExams.size();



        LocalDateTime now = LocalDateTime.now();

        long upcomingExamsCount = enrollments.stream()

                .filter(e -> e.getStatus() == EnrollmentStatus.ENROLLED)

                .filter(e -> e.getExam() != null && (

                        (e.getExam().getStartTime() != null && e.getExam().getStartTime().isAfter(now)) ||

                        (e.getExam().getExamDate() != null && e.getExam().getExamDate().isAfter(now))

                ))

                .count();



        long examsAppearedCount = attempts.size();



        List<ExamAttempt> completedAttempts = attempts.stream()

                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED ||

                             a.getStatus() == AttemptStatus.COMPLETED ||

                             a.getStatus() == AttemptStatus.DISQUALIFIED ||

                             a.getStatus() == AttemptStatus.AUTO_SUBMITTED)

                .toList();



        long examsCompletedCount = completedAttempts.size();



        double averageScore = completedAttempts.isEmpty() ? 0.0 :

                completedAttempts.stream()

                        .mapToDouble(a -> a.getPercentage() != null ? a.getPercentage() : 0.0)

                        .average()

                        .orElse(0.0);

        averageScore = Math.round(averageScore * 10.0) / 10.0;



        long passCount = completedAttempts.stream()

                .filter(a -> a.getStatus() != AttemptStatus.DISQUALIFIED &&

                             (a.getTerminationReason() == null || a.getTerminationReason().isBlank()) &&

                             (a.getIntegrityScore() == null || a.getIntegrityScore() > 0.0) &&

                             Boolean.TRUE.equals(a.getPassed()))

                .count();



        long failCount = completedAttempts.size() - passCount;



        long totalViolations = 0;

        for (ExamAttempt a : attempts) {

            Optional<ProctoringSession> sessOpt = sessionRepository.findByAttemptId(a.getId());

            if (sessOpt.isPresent()) {

                totalViolations += eventRepository.countBySessionId(sessOpt.get().getId());

            }

        }



        List<Map<String, Object>> recentResults = new ArrayList<>();

        List<ExamAttempt> sortedCompleted = new ArrayList<>(completedAttempts);

        sortedCompleted.sort((a, b) -> {

            LocalDateTime t1 = a.getSubmittedAt() != null ? a.getSubmittedAt() : a.getStartedAt();

            LocalDateTime t2 = b.getSubmittedAt() != null ? b.getSubmittedAt() : b.getStartedAt();

            if (t1 == null && t2 == null) return 0;

            if (t1 == null) return 1;

            if (t2 == null) return -1;

            return t2.compareTo(t1);

        });



        int limit = Math.min(sortedCompleted.size(), 6);

        for (int i = 0; i < limit; i++) {

            ExamAttempt a = sortedCompleted.get(i);

            boolean isTerminated = a.getStatus() == AttemptStatus.DISQUALIFIED ||

                    (a.getTerminationReason() != null && !a.getTerminationReason().isBlank()) ||

                    (a.getIntegrityScore() != null && a.getIntegrityScore() <= 0.0);

            double passMark = a.getExam() != null && a.getExam().getPassingMarks() != null ? a.getExam().getPassingMarks() : 40.0;

            double score = a.getScore() != null ? a.getScore() : 0.0;

            boolean marksPassed = score >= passMark;

            boolean passed = !isTerminated && marksPassed && Boolean.TRUE.equals(a.getPassed());

            String failReason = a.getFailReason();

            if (!passed && (failReason == null || failReason.isBlank())) {

                failReason = isTerminated ? "Failed: exam terminated due to violations." :

                        "Failed: marks below passing score (" + Math.round(score) + " obtained, " + Math.round(passMark) + " required).";

            }



            Map<String, Object> r = new HashMap<>();

            r.put("attemptId", a.getId());

            r.put("examId", a.getExam() != null ? a.getExam().getExamCode() : "");

            r.put("examName", a.getExam() != null ? a.getExam().getExamName() : "Exam");

            r.put("subject", a.getExam() != null ? a.getExam().getSubject() : "");

            r.put("score", score);

            r.put("totalMarks", a.getExam() != null ? a.getExam().getTotalMarks() : 100.0);

            r.put("passingMarks", passMark);

            r.put("percentage", a.getPercentage());

            r.put("passed", passed);

            r.put("status", isTerminated ? "DISQUALIFIED" : a.getStatus().name());

            r.put("terminationReason", a.getTerminationReason());

            r.put("failReason", failReason);

            r.put("submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : (a.getStartedAt() != null ? a.getStartedAt().toString() : ""));



            long vCount = 0;

            Optional<ProctoringSession> sess = sessionRepository.findByAttemptId(a.getId());

            if (sess.isPresent()) {

                vCount = eventRepository.countBySessionId(sess.get().getId());

            }

            r.put("violationsCount", vCount);

            recentResults.add(r);

        }



        List<Map<String, Object>> upcomingExams = new ArrayList<>();

        for (ExamEnrollment en : enrollments) {

            if (en.getStatus() == EnrollmentStatus.ENROLLED && en.getExam() != null) {

                Exam ex = en.getExam();

                Map<String, Object> ue = new HashMap<>();

                ue.put("examId", ex.getExamCode());

                ue.put("examName", ex.getExamName());

                ue.put("subject", ex.getSubject());

                ue.put("duration", ex.getDurationMinutes());

                ue.put("totalMarks", ex.getTotalMarks());

                ue.put("passingMarks", ex.getPassingMarks());

                ue.put("hasCodingRound", ex.getHasCodingRound());

                ue.put("examDate", ex.getExamDate() != null ? ex.getExamDate().toString() : null);

                ue.put("startTime", ex.getStartTime() != null ? ex.getStartTime().toString() : null);

                ue.put("status", en.getStatus().name());

                upcomingExams.add(ue);

            }

        }



        Map<String, Object> profile = new HashMap<>();

        profile.put("id", student.getId());

        profile.put("name", student.getName());

        profile.put("email", student.getEmail());

        profile.put("studentId", student.getStudentIdNumber() != null ? student.getStudentIdNumber() : "N/A");

        profile.put("institution", student.getClient() != null ? student.getClient().getName() : "Evaluation Portal");

        profile.put("role", "student");

        profile.put("joinedAt", student.getCreatedAt() != null ? student.getCreatedAt().toString() : "");



        Map<String, Object> response = new HashMap<>();

        response.put("student", profile);

        response.put("enrolledExamsCount", enrolledExamsCount);

        response.put("eligibleExamsCount", eligibleExamsCount);

        response.put("upcomingExamsCount", upcomingExamsCount);

        response.put("examsAppearedCount", examsAppearedCount);

        response.put("examsCompletedCount", examsCompletedCount);

        response.put("averageScore", averageScore);

        response.put("passCount", passCount);

        response.put("failCount", failCount);

        response.put("totalViolations", totalViolations);

        response.put("recentResults", recentResults);

        response.put("upcomingExams", upcomingExams);



        return ResponseEntity.ok(response);

    }

}

