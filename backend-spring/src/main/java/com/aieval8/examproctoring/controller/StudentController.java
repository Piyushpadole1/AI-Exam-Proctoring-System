package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.JoinExamRequest;
import com.aieval8.examproctoring.dto.request.SaveAnswersRequest;
import com.aieval8.examproctoring.dto.response.AttemptResponse;
import com.aieval8.examproctoring.dto.response.EnrollmentResponse;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.EnrollmentService;
import com.aieval8.examproctoring.service.ExamAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.repository.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/student", "/api/students"})
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final EnrollmentService enrollmentService;
    private final ExamAttemptService attemptService;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;

    public StudentController(EnrollmentService enrollmentService,
                             ExamAttemptService attemptService,
                             UserRepository userRepository,
                             ExamRepository examRepository,
                             ExamAttemptRepository attemptRepository,
                             ExamEnrollmentRepository enrollmentRepository,
                             ProctoringSessionRepository sessionRepository,
                             ProctoringEventRepository eventRepository) {
        this.enrollmentService = enrollmentService;
        this.attemptService = attemptService;
        this.userRepository = userRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
    }

    private CustomUserDetails resolveStudent(CustomUserDetails principal) {
        if (principal != null && principal.getId() != null) {
            return principal;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Student authentication required.");
    }

    @PostMapping("/exams/join")
    public ResponseEntity<EnrollmentResponse> joinExam(
            @Valid @RequestBody JoinExamRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        EnrollmentResponse response = enrollmentService.joinExamWithCredentials(request, resolveStudent(studentDetails));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/exams")
    public ResponseEntity<List<EnrollmentResponse>> getMyExams(
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        List<EnrollmentResponse> enrollments = enrollmentService.getStudentEnrollments(resolveStudent(studentDetails));
        return ResponseEntity.ok(enrollments);
    }

    @PostMapping("/exams/{examCode}/start")
    public ResponseEntity<AttemptResponse> startExam(
            @PathVariable String examCode,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        String deviceInfo = servletRequest.getHeader("User-Agent");
        String password = (body != null) ? (body.get("password") != null ? body.get("password") : body.get("examPassword")) : null;
        AttemptResponse response = attemptService.startOrResumeAttempt(examCode, password, deviceInfo, resolveStudent(studentDetails));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active-attempt/{examCode}")
    public ResponseEntity<Map<String, Object>> getActiveAttempt(
            @PathVariable String examCode,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        CustomUserDetails resolved = resolveStudent(studentDetails);
        Exam exam = examRepository.findByExamCode(examCode.trim().toUpperCase())
                .or(() -> examRepository.findByExamCode(examCode.trim()))
                .or(() -> {
                    try {
                        return examRepository.findById(Long.parseLong(examCode.trim()));
                    } catch (Exception e) {
                        return Optional.empty();
                    }
                })
                .orElse(null);

        if (exam == null) {
            return ResponseEntity.notFound().build();
        }

        List<ExamAttempt> attempts = attemptRepository.findByExamIdAndStudentId(exam.getId(), resolved.getId());
        ExamAttempt active = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
                .findFirst()
                .or(() -> attempts.isEmpty() ? Optional.empty() : Optional.of(attempts.get(attempts.size() - 1)))
                .orElse(null);

        if (active == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> res = new HashMap<>();
        res.put("attemptId", active.getId());
        res.put("id", active.getId());
        res.put("status", active.getStatus().name());
        res.put("examId", exam.getExamCode());
        return ResponseEntity.ok(res);
    }

    @PutMapping("/attempts/{attemptId}/autosave")
    public ResponseEntity<Void> autosaveAnswers(
            @PathVariable Long attemptId,
            @RequestBody SaveAnswersRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        attemptService.autosaveAnswers(attemptId, request.getAnswers(), resolveStudent(studentDetails));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<AttemptResponse> submitExam(
            @PathVariable Long attemptId,
            @RequestBody SaveAnswersRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        AttemptResponse response = attemptService.submitAttempt(attemptId, request.getAnswers(), resolveStudent(studentDetails));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getStudentDashboard(
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        CustomUserDetails resolved = resolveStudent(studentDetails);
        User student = userRepository.findById(resolved.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

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
