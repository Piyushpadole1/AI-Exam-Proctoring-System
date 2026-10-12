package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.CreateExamRequest;
import com.aieval8.examproctoring.dto.request.EnrollStudentsRequest;
import com.aieval8.examproctoring.dto.response.EnrollmentResponse;
import com.aieval8.examproctoring.dto.response.ExamResponse;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.EnrollmentService;
import com.aieval8.examproctoring.service.ExamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    private final ExamService examService;
    private final EnrollmentService enrollmentService;

    public TeacherController(ExamService examService, EnrollmentService enrollmentService) {
        this.examService = examService;
        this.enrollmentService = enrollmentService;
    }

    private CustomUserDetails resolveTeacher(CustomUserDetails principal) {
        if (principal != null && principal.getId() != null) {
            return principal;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    @PostMapping("/exams")
    public ResponseEntity<ExamResponse> createExam(
            @Valid @RequestBody CreateExamRequest request,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        ExamResponse response = examService.createExam(request, resolveTeacher(teacherDetails));
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/exams/{examId}")
    public ResponseEntity<ExamResponse> updateExam(
            @PathVariable Long examId,
            @RequestBody CreateExamRequest request,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        ExamResponse response = examService.updateExam(examId, request, resolveTeacher(teacherDetails));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/exams")
    public ResponseEntity<List<ExamResponse>> getMyExams(
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        List<ExamResponse> exams = examService.getTeacherExams(resolveTeacher(teacherDetails));
        return ResponseEntity.ok(exams);
    }

    @GetMapping("/exams/{examId}")
    public ResponseEntity<ExamResponse> getExamById(
            @PathVariable Long examId,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        ExamResponse exam = examService.getExamByIdAndTeacher(examId, resolveTeacher(teacherDetails));
        return ResponseEntity.ok(exam);
    }

    @DeleteMapping("/exams/{examId}")
    public ResponseEntity<Void> deleteExam(
            @PathVariable Long examId,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        examService.deleteExam(examId, resolveTeacher(teacherDetails));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/exams/{examId}/students")
    public ResponseEntity<List<EnrollmentResponse>> enrollStudents(
            @PathVariable Long examId,
            @Valid @RequestBody EnrollStudentsRequest request,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        List<EnrollmentResponse> enrolled = enrollmentService.enrollStudentsManual(examId, request.getStudentIds(), resolveTeacher(teacherDetails));
        return ResponseEntity.ok(enrolled);
    }

    @GetMapping("/exams/{examId}/students")
    public ResponseEntity<List<EnrollmentResponse>> getEnrolledStudents(
            @PathVariable Long examId,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        List<EnrollmentResponse> students = enrollmentService.getExamEnrolledStudents(examId, resolveTeacher(teacherDetails));
        return ResponseEntity.ok(students);
    }

    @GetMapping("/students")
    public ResponseEntity<List<Map<String, Object>>> getAvailableStudents(
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        List<Map<String, Object>> students = enrollmentService.getAvailableStudentsForTeacher(resolveTeacher(teacherDetails));
        return ResponseEntity.ok(students);
    }

    @PostMapping("/exams/{examId}/enroll-email")
    public ResponseEntity<EnrollmentResponse> enrollStudentByEmail(
            @PathVariable Long examId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        String email = body.get("email");
        EnrollmentResponse res = enrollmentService.enrollStudentByEmail(examId, email, resolveTeacher(teacherDetails));
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/exams/{examId}/students/{studentId}")
    public ResponseEntity<Map<String, Object>> unenrollStudent(
            @PathVariable Long examId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal CustomUserDetails teacherDetails) {
        enrollmentService.unenrollStudent(examId, studentId, resolveTeacher(teacherDetails));
        return ResponseEntity.ok(Map.of("success", true, "message", "Student removed from exam enrollment."));
    }
}
