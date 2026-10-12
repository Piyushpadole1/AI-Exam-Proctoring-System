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
                                        com.aieval8.examproctoring.service.CodeExecutionService codeExecutionService) {
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
            exams = examRepository.findAll();
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
            map.put("requiresPassword", true);

            if (isStudent) {
                boolean enrolled = enrollmentRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId())
                        .map(en -> en.getStatus() == EnrollmentStatus.ENROLLED)
                        .orElse(false);
                map.put("isEnrolled", enrolled);
            } else {
                map.put("isEnrolled", false);
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
        map.put("requiresPassword", true);

        if (isStudent) {
            boolean enrolled = enrollmentRepository.findByExamIdAndStudentId(e.getId(), resolvedUser.getId())
                    .map(en -> en.getStatus() == EnrollmentStatus.ENROLLED)
                    .orElse(false);
            map.put("isEnrolled", enrolled);
        } else {
            map.put("isEnrolled", false);
        }

        return ResponseEntity.ok(map);
    }

    @PostMapping("/api/users/exam")
    public ResponseEntity<Map<String, Object>> createLegacyExam(@RequestBody Map<String, Object> body,
                                                                 @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CreateExamRequest req = new CreateExamRequest();
        req.setExamName((String) body.getOrDefault("examName", "New Exam"));
        String code = (String) body.get("examId");
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

        LocalDateTime startTime = parseDateTime(body.get("liveDate"));
        LocalDateTime endTime = parseDateTime(body.get("deadDate"));
        req.setStartTime(startTime);
        req.setEndTime(endTime);
        req.setExamDate(startTime != null ? startTime : LocalDateTime.now());

        CustomUserDetails resolvedTeacher = resolveUser(teacherDetails);
        if (resolvedTeacher == null) {
            User teacher = null;
            if (body.get("userId") != null) {
                try {
                    teacher = userRepository.findById(Long.parseLong(body.get("userId").toString())).orElse(null);
                } catch (Exception ignored) {}
            }
            if (teacher == null && body.get("teacherId") != null) {
                try {
                    teacher = userRepository.findById(Long.parseLong(body.get("teacherId").toString())).orElse(null);
                } catch (Exception ignored) {}
            }
            if (teacher == null && body.get("email") != null) {
                teacher = userRepository.findByEmail((String) body.get("email")).orElse(null);
            }
            if (teacher == null) {
                teacher = userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ROLE_TEACHER)
                        .findFirst()
                        .orElse(null);
            }
            if (teacher != null) {
                resolvedTeacher = new CustomUserDetails(teacher);
            }
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
        Optional<Exam> examOpt = findExamByCodeOrId(examId);
        if (examOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Exam not found: " + examId));
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
    public ResponseEntity<List<Map<String, Object>>> getQuestionsByExam(
            @PathVariable String examCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        CustomUserDetails resolved = resolveUser(userDetails);
        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Exam exam = examOpt.get();
        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        List<Question> questions = questionRepository.findByExamId(exam.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Question q : questions) {
            Map<String, Object> map = new HashMap<>();
            map.put("_id", q.getId().toString());
            map.put("examId", examCode);
            map.put("question", q.getQuestionText());
            try {
                map.put("options", objectMapper.readValue(q.getOptionsJson(), List.class));
            } catch (Exception e) {
                map.put("options", Collections.emptyList());
            }
            map.put("marks", q.getMarks());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/api/users/exam/questions")
    public ResponseEntity<Map<String, Object>> createQuestion(@RequestBody Map<String, Object> body,
                                                               @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolveUser(teacherDetails);
        String examCode = (String) body.get("examId");
        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found: " + examCode));
        }

        Exam exam = examOpt.get();
        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
        }

        String questionText = (String) body.get("question");
        Object optionsObj = body.get("options");
        String optionsJson = "[]";
        try {
            optionsJson = objectMapper.writeValueAsString(optionsObj);
        } catch (JsonProcessingException ignored) {
        }

        Question q = new Question(exam, questionText, optionsJson, 0, 1.0);
        q = questionRepository.save(q);

        exam.setTotalQuestions(exam.getTotalQuestions() + 1);
        examRepository.save(exam);

        return ResponseEntity.ok(Map.of("_id", q.getId().toString(), "message", "Question created"));
    }

    @PutMapping("/api/users/exam/questions/{questionId}")
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable Long questionId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolveUser(teacherDetails);
        Optional<Question> qOpt = questionRepository.findById(questionId);
        if (qOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Question q = qOpt.get();
        Exam exam = q.getExam();
        if (exam != null && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
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
        Optional<Question> qOpt = questionRepository.findById(questionId);
        if (qOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Question q = qOpt.get();
        Exam exam = q.getExam();
        if (exam != null && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
        }
        questionRepository.delete(q);
        if (exam != null && exam.getTotalQuestions() > 0) {
            exam.setTotalQuestions(exam.getTotalQuestions() - 1);
            examRepository.save(exam);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Question deleted"));
    }

    // ── Coding Questions (/api/coding/**) ─────────────────────────────────

    @PostMapping("/api/coding/question")
    public ResponseEntity<Map<String, Object>> createCodingQuestion(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolveUser(teacherDetails);
        String examId = String.valueOf(body.get("examId"));
        Optional<Exam> examOpt = findExamByCodeOrId(examId);

        if (examOpt.isPresent() && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            Exam exam = examOpt.get();
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
        }

        String question = (String) body.get("question");
        String description = (String) body.get("description");

        CodingQuestion cq = new CodingQuestion(examId, question, description);
        cq = codingQuestionRepository.save(cq);

        Map<String, Object> map = new HashMap<>();
        map.put("_id", cq.getId().toString());
        map.put("examId", cq.getExamId());
        map.put("question", cq.getQuestion());
        map.put("description", cq.getDescription());

        return new ResponseEntity<>(Map.of("success", true, "data", map), HttpStatus.CREATED);
    }

    @PutMapping("/api/coding/question/{id}")
    public ResponseEntity<Map<String, Object>> updateCodingQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolveUser(teacherDetails);
        Optional<CodingQuestion> opt = codingQuestionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CodingQuestion cq = opt.get();
        Optional<Exam> examOpt = findExamByCodeOrId(cq.getExamId());
        if (examOpt.isPresent() && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            Exam exam = examOpt.get();
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
        }
        if (body.get("question") != null) cq.setQuestion((String) body.get("question"));
        if (body.get("description") != null) cq.setDescription((String) body.get("description"));
        if (body.get("language") != null) cq.setLanguage((String) body.get("language"));
        cq = codingQuestionRepository.save(cq);
        return ResponseEntity.ok(Map.of("success", true, "data", cq));
    }

    @DeleteMapping("/api/coding/question/{id}")
    public ResponseEntity<Map<String, Object>> deleteCodingQuestion(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolveUser(teacherDetails);
        Optional<CodingQuestion> opt = codingQuestionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CodingQuestion cq = opt.get();
        Optional<Exam> examOpt = findExamByCodeOrId(cq.getExamId());
        if (examOpt.isPresent() && resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            Exam exam = examOpt.get();
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: You do not own this exam."));
            }
        }
        codingQuestionRepository.delete(cq);
        return ResponseEntity.ok(Map.of("success", true, "message", "Coding question deleted"));
    }

    @GetMapping("/api/coding/questions/exam/{examId}")
    public ResponseEntity<Map<String, Object>> getCodingQuestionByExam(@PathVariable String examId) {
        Optional<CodingQuestion> opt = codingQuestionRepository.findFirstByExamId(examId);
        if (opt.isEmpty()) {
            // Check by numeric ID if examId was a code or vice versa
            Optional<Exam> examOpt = findExamByCodeOrId(examId);
            if (examOpt.isPresent()) {
                opt = codingQuestionRepository.findFirstByExamId(examOpt.get().getExamCode())
                        .or(() -> codingQuestionRepository.findFirstByExamId(examOpt.get().getId().toString()));
            }
        }

        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "message", "No coding question configured for this exam"));
        }

        CodingQuestion cq = opt.get();
        Map<String, Object> map = new HashMap<>();
        map.put("_id", cq.getId().toString());
        map.put("examId", cq.getExamId());
        map.put("question", cq.getQuestion());
        map.put("description", cq.getDescription());
        map.put("language", cq.getLanguage());

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
            map.put("question", cq.getQuestion());
            map.put("description", cq.getDescription());
            data.add(map);
        }
        return ResponseEntity.ok(Map.of("success", true, "count", data.size(), "data", data));
    }

    @PostMapping("/api/coding/submit")
    public ResponseEntity<Map<String, Object>> submitCodingAnswer(@RequestBody Map<String, Object> body) {
        String code = body != null ? (String) body.get("code") : "";
        String language = body != null && body.containsKey("language") ? (String) body.get("language") : "javascript";
        Object qId = body != null ? body.get("questionId") : null;

        com.aieval8.examproctoring.service.CodeExecutionService.ExecutionResult result = null;
        if (code != null && !code.trim().isEmpty()) {
            result = codeExecutionService.execute(code, language, null);
        }

        if (qId != null) {
            try {
                Long id = Long.parseLong(qId.toString());
                final com.aieval8.examproctoring.service.CodeExecutionService.ExecutionResult finalRes = result;
                codingQuestionRepository.findById(id).ifPresent(cq -> {
                    cq.setSubmittedCode(code);
                    cq.setLanguage(language);
                    if (finalRes != null) {
                        cq.setStatus(finalRes.isSuccess() ? "Accepted" : "Error");
                        cq.setExecutionTime(finalRes.getExecutionTimeMs());
                    } else {
                        cq.setStatus("Accepted");
                        cq.setExecutionTime(0L);
                    }
                    codingQuestionRepository.save(cq);
                });
            } catch (Exception ignored) {
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Code submitted and evaluated successfully.");
        if (result != null) {
            resp.put("result", Map.of(
                    "success", result.isSuccess(),
                    "output", result.getOutput(),
                    "executionTimeMs", result.getExecutionTimeMs()
            ));
        }
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

    @GetMapping("/api/users/results/user")
    public ResponseEntity<Map<String, Object>> getUserResults(@AuthenticationPrincipal CustomUserDetails userDetails) {
        CustomUserDetails resolved = resolveUser(userDetails);
        List<ExamAttempt> attempts;
        if (resolved != null) {
            attempts = attemptRepository.findByStudentId(resolved.getId());
        } else {
            attempts = attemptRepository.findAll();
        }

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
        Map<String, Object> res = new HashMap<>();
        res.put("_id", String.valueOf(System.currentTimeMillis()));
        Double totalMarks = body.get("totalMarks") instanceof Number ? ((Number) body.get("totalMarks")).doubleValue() : 0.0;
        Double percentage = body.get("percentage") instanceof Number ? ((Number) body.get("percentage")).doubleValue() : 0.0;
        res.put("totalMarks", totalMarks);
        res.put("percentage", percentage);
        res.put("showToStudent", true);
        return new ResponseEntity<>(Map.of("success", true, "data", res), HttpStatus.CREATED);
    }

    private Map<String, Object> buildResultMap(ExamAttempt a) {
        Map<String, Object> item = new HashMap<>();
        item.put("_id", a.getId().toString());

        Map<String, Object> userMap = new HashMap<>();
        if (a.getStudent() != null) {
            userMap.put("_id", a.getStudent().getId().toString());
            userMap.put("name", a.getStudent().getName());
            userMap.put("email", a.getStudent().getEmail());
        }
        item.put("userId", userMap);

        Map<String, Object> examMap = new HashMap<>();
        if (a.getExam() != null) {
            item.put("examId", a.getExam().getId().toString());
            examMap.put("_id", a.getExam().getId().toString());
            examMap.put("examName", a.getExam().getExamName());
            examMap.put("examId", a.getExam().getExamCode());
        }
        item.put("exam", examMap);

        item.put("totalMarks", a.getScore() != null ? a.getScore() : 0.0);
        item.put("percentage", a.getPercentage() != null ? a.getPercentage() : 0.0);
        item.put("passed", a.getPassed() != null ? a.getPassed() : false);
        item.put("showToStudent", true);
        item.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : LocalDateTime.now().toString());

        Optional<ProctoringSession> sessionOpt = sessionRepository.findByAttemptId(a.getId());
        sessionOpt.ifPresent(ps -> item.put("sessionId", ps.getId().toString()));

        item.put("codingSubmissions", Collections.emptyList());

        return item;
    }

    // ── Cheating Logs (/api/users/cheatingLogs/**, /api/cheatingLogs/**) ───

    @GetMapping({"/api/users/cheatingLogs/{examId}", "/api/cheatingLogs/{examId}"})
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

        List<CheatingLogEntry> entries = cheatingLogRepository.findByExamIdOrderByCreatedAtDesc(examId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (CheatingLogEntry e : entries) {
            Map<String, Object> map = new HashMap<>();
            map.put("_id", e.getId().toString());
            map.put("examId", e.getExamId());
            map.put("username", e.getUsername());
            map.put("email", e.getEmail());
            map.put("noFaceCount", e.getNoFaceCount());
            map.put("multipleFaceCount", e.getMultipleFaceCount());
            map.put("cellPhoneCount", e.getCellPhoneCount());
            map.put("prohibitedObjectCount", e.getProhibitedObjectCount());
            try {
                map.put("screenshots", objectMapper.readValue(e.getScreenshotsJson(), List.class));
            } catch (Exception ex) {
                map.put("screenshots", Collections.emptyList());
            }
            result.add(map);
        }

        if (result.isEmpty() && examOpt.isPresent()) {
            List<ExamAttempt> attempts = attemptRepository.findByExamId(examOpt.get().getId());
                for (ExamAttempt att : attempts) {
                    Optional<ProctoringSession> sOpt = sessionRepository.findByAttemptId(att.getId());
                    if (sOpt.isPresent()) {
                        ProctoringSession ps = sOpt.get();
                        List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(ps.getId());

                        int noFace = 0;
                        int multiFace = 0;
                        int cellPhone = 0;
                        int prohibited = 0;
                        List<Map<String, Object>> screenshots = new ArrayList<>();

                        for (ProctoringEvent ev : events) {
                            String type = ev.getEventType().toUpperCase();
                            if (type.contains("NO_FACE") || type.contains("NOT_VISIBLE")) noFace++;
                            else if (type.contains("MULTIPLE")) multiFace++;
                            else if (type.contains("CELL") || type.contains("PHONE")) cellPhone++;
                            else prohibited++;

                            if (ev.getEvidenceUrl() != null && !ev.getEvidenceUrl().isEmpty()) {
                                screenshots.add(Map.of(
                                        "url", ev.getEvidenceUrl(),
                                        "type", ev.getEventType(),
                                        "detectedAt", ev.getTimestamp().toString()
                                ));
                            }
                        }

                        Map<String, Object> map = new HashMap<>();
                        map.put("_id", ps.getId().toString());
                        map.put("examId", examId);
                        map.put("username", att.getStudent() != null ? att.getStudent().getName() : "Student");
                        map.put("email", att.getStudent() != null ? att.getStudent().getEmail() : "student@demo.com");
                        map.put("noFaceCount", noFace);
                        map.put("multipleFaceCount", multiFace);
                        map.put("cellPhoneCount", cellPhone);
                        map.put("prohibitedObjectCount", prohibited);
                        map.put("screenshots", screenshots);
                        result.add(map);
                    }
                }
            }

        return ResponseEntity.ok(result);
    }

    @PostMapping({"/api/users/cheatingLogs", "/api/cheatingLogs"})
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
        String examCode = (String) body.get("examId");
        String examPassword = body.get("examPassword") != null ? (String) body.get("examPassword") : (String) body.get("password");
        String deviceInfo = request.getHeader("User-Agent");

        Optional<Exam> examOpt = findExamByCodeOrId(examCode);
        String finalCode = examOpt.map(Exam::getExamCode).orElse(examCode);

        AttemptResponse res = attemptService.startOrResumeAttempt(finalCode, examPassword, deviceInfo, resolved);

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
        return ResponseEntity.ok(map);
    }

    @PutMapping("/api/sessions/{attemptId}/autosave")
    public ResponseEntity<Map<String, Object>> autoSave(
            @PathVariable Long attemptId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {

        CustomUserDetails resolved = resolveUser(studentDetails);
        Map<String, String> answers = (Map<String, String>) body.get("answers");
        attemptService.autosaveAnswers(attemptId, answers, resolved);
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

        return ResponseEntity.ok(Map.of(
                "success", true,
                "score", res.getScore(),
                "percentage", res.getPercentage(),
                "passed", res.getPassed(),
                "status", res.getStatus().name()
        ));
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

        // 1. Enrollment check - Credentials alone NEVER grant access
        Optional<ExamEnrollment> enrollOpt = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());
        if (enrollOpt.isEmpty() || enrollOpt.get().getStatus() != EnrollmentStatus.ENROLLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "Access Denied: You are not enrolled in this exam. Only students authorized by the teacher may participate.",
                    "enrolled", false
            ));
        }

        // 2. Exam window check
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

        // 3. Password check
        String password = body.get("password");
        if (exam.getExamPasswordHash() != null && !exam.getExamPasswordHash().isEmpty()) {
            if (password == null || !passwordEncoder.matches(password.trim(), exam.getExamPasswordHash())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "error", "Invalid exam password. Access denied.",
                        "enrolled", true,
                        "passwordValid", false
                ));
            }
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

    // ── Teacher Student Enrollment Endpoints ──────────────────────────────

    @GetMapping("/api/users/students")
    public ResponseEntity<List<Map<String, Object>>> getAvailableStudentsList(
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
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
        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Exam exam = examOpt.get();
        if (resolved != null && "ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() != null && !exam.getTeacher().getId().equals(resolved.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
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

    @PostMapping("/api/users/exam/{examCode}/enroll-student")
    public ResponseEntity<Map<String, Object>> enrollStudentInExam(
            @PathVariable String examCode,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {

        CustomUserDetails resolved = resolveUser(teacherDetails);
        Optional<Exam> examOpt = findExamByCodeOrId(examCode);

        if (examOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Exam not found: " + examCode));
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
}
