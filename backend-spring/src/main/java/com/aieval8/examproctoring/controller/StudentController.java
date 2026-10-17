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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/student", "/api/students"})
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final EnrollmentService enrollmentService;
    private final ExamAttemptService attemptService;

    public StudentController(EnrollmentService enrollmentService, ExamAttemptService attemptService) {
        this.enrollmentService = enrollmentService;
        this.attemptService = attemptService;
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
}
