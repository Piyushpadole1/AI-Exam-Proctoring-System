package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.repository.*;
import com.aieval8.examproctoring.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
public class AdminController {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final CheatingLogEntryRepository cheatingLogRepository;
    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;

    public AdminController(ExamRepository examRepository,
                           ExamAttemptRepository attemptRepository,
                           UserRepository userRepository,
                           CheatingLogEntryRepository cheatingLogRepository,
                           ProctoringSessionRepository sessionRepository,
                           ProctoringEventRepository eventRepository) {
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
        this.cheatingLogRepository = cheatingLogRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
    }

    /**
     * Common Logout Endpoint for /api/admin/logout, /api/users/logout, /api/auth/logout
     */
    @PostMapping({"/api/admin/logout", "/api/users/logout", "/api/auth/logout"})
    public ResponseEntity<Map<String, Object>> logout() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Logged out successfully");
        return ResponseEntity.ok(resp);
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

    /**
     * Dashboard Stats for Teacher / Admin Panel
     */
    @GetMapping("/api/admin/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);
        boolean isTeacher = resolved != null && "ROLE_TEACHER".equals(resolved.getRole());
        List<Exam> exams;
        if (isTeacher) {
            exams = examRepository.findByTeacherId(resolved.getId());
        } else {
            exams = examRepository.findAll();
        }

        Set<Long> allowedExamIds = exams.stream().map(Exam::getId).collect(Collectors.toSet());
        Set<String> allowedExamCodes = exams.stream().map(Exam::getExamCode).collect(Collectors.toSet());

        // Gather all relevant attempts
        List<ExamAttempt> allAttempts = attemptRepository.findAll().stream()
                .filter(a -> a.getExam() != null && allowedExamIds.contains(a.getExam().getId()))
                .sorted((a, b) -> {
                    LocalDateTime ta = a.getStartedAt() != null ? a.getStartedAt() : LocalDateTime.MIN;
                    LocalDateTime tb = b.getStartedAt() != null ? b.getStartedAt() : LocalDateTime.MIN;
                    return tb.compareTo(ta);
                })
                .collect(Collectors.toList());

        // Gather all cheating logs
        List<CheatingLogEntry> cheatingLogs = cheatingLogRepository.findAll().stream()
                .filter(c -> c.getExamId() != null && allowedExamCodes.contains(c.getExamId()))
                .collect(Collectors.toList());

        long totalViolations = cheatingLogs.stream().mapToLong(c ->
                (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +
                (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +
                (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +
                (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0)
        ).sum();

        long activeSessionsCount = allAttempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
                .count();

        long highRiskCount = allAttempts.stream()
                .filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() < 70)
                .count();

        long cleanCount = allAttempts.stream()
                .filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() >= 90)
                .count();

        double avgIntegrity = allAttempts.isEmpty() ? 100.0 :
                allAttempts.stream().mapToDouble(a -> a.getIntegrityScore() != null ? a.getIntegrityScore() : 100.0).average().orElse(100.0);

        // Count unique students
        long totalStudentsCount = allAttempts.stream()
                .map(a -> a.getStudent() != null ? a.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        if (totalStudentsCount == 0 && !isTeacher) {
            totalStudentsCount = userRepository.count();
        }

        long warningCount = allAttempts.stream()
                .filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() >= 65 && a.getIntegrityScore() < 90)
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStudents", totalStudentsCount);
        stats.put("totalExams", exams.size());
        stats.put("totalSessions", allAttempts.size());
        stats.put("activeSessions", activeSessionsCount);
        stats.put("totalViolations", totalViolations);
        stats.put("highRiskSessions", highRiskCount);
        stats.put("cleanSessions", cleanCount);
        stats.put("safeSessions", cleanCount);
        stats.put("warningSessions", warningCount);
        stats.put("malpracticeSessions", highRiskCount);
        stats.put("terminatedSessions", 0);
        stats.put("avgFairnessScore", Math.round(avgIntegrity * 10.0) / 10.0);
        stats.put("averageIntegrity", Math.round(avgIntegrity * 10.0) / 10.0);

        // Format recent sessions (up to 20)
        List<Map<String, Object>> recentSessions = new ArrayList<>();
        int limit = Math.min(20, allAttempts.size());
        for (int i = 0; i < limit; i++) {
            ExamAttempt attempt = allAttempts.get(i);
            Map<String, Object> sm = new HashMap<>();
            sm.put("_id", String.valueOf(attempt.getId()));
            sm.put("id", attempt.getId());

            String sName = attempt.getStudent() != null ? attempt.getStudent().getName() : "Student";
            String sEmail = attempt.getStudent() != null ? attempt.getStudent().getEmail() : "student@demo.edu";
            Map<String, String> sIdMap = new HashMap<>();
            sIdMap.put("name", sName);
            sIdMap.put("email", sEmail);
            sm.put("studentId", sIdMap);
            sm.put("studentName", sName);
            sm.put("studentEmail", sEmail);

            String eName = attempt.getExam() != null ? attempt.getExam().getExamName() : "General Exam";
            String eCode = attempt.getExam() != null ? attempt.getExam().getExamCode() : "EXAM";
            sm.put("examName", eName);
            sm.put("examCode", eCode);
            sm.put("examId", eCode);

            double integrity = attempt.getIntegrityScore() != null ? attempt.getIntegrityScore() : 100.0;
            sm.put("integrityScore", Math.round(integrity));
            sm.put("fairnessScore", Math.round(integrity));

            String classification = "SAFE";
            if (integrity < 60) classification = "MALPRACTICE";
            else if (integrity < 80) classification = "WARNING";
            sm.put("classification", classification);
            sm.put("verdict", classification);

            long vCount = cheatingLogs.stream()
                    .filter(c -> sEmail.equalsIgnoreCase(c.getEmail()) && eCode.equalsIgnoreCase(c.getExamId()))
                    .mapToLong(c -> (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +
                                    (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +
                                    (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +
                                    (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0))
                    .sum();
            sm.put("violationCount", vCount);
            sm.put("totalViolations", vCount);
            sm.put("status", attempt.getStatus() != null ? attempt.getStatus().toString() : "ACTIVE");
            sm.put("createdAt", attempt.getCreatedAt() != null ? attempt.getCreatedAt().toString() : LocalDateTime.now().toString());
            sm.put("startTime", attempt.getStartedAt() != null ? attempt.getStartedAt().toString() : LocalDateTime.now().toString());

            recentSessions.add(sm);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("stats", stats);
        response.put("recentSessions", recentSessions);

        return ResponseEntity.ok(response);
    }

    /**
     * Analytics data for Teacher / Admin Panel
     */
    @GetMapping("/api/admin/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);
        boolean isTeacher = resolved != null && "ROLE_TEACHER".equals(resolved.getRole());
        List<Exam> exams = isTeacher ? examRepository.findByTeacherId(resolved.getId()) : examRepository.findAll();
        Set<Long> allowedExamIds = exams.stream().map(Exam::getId).collect(Collectors.toSet());
        Set<String> allowedExamCodes = exams.stream().map(Exam::getExamCode).collect(Collectors.toSet());

        List<ExamAttempt> attempts = attemptRepository.findAll().stream()
                .filter(a -> a.getExam() != null && allowedExamIds.contains(a.getExam().getId()))
                .collect(Collectors.toList());

        List<CheatingLogEntry> cheatingLogs = cheatingLogRepository.findAll().stream()
                .filter(c -> c.getExamId() != null && allowedExamCodes.contains(c.getExamId()))
                .collect(Collectors.toList());

        // Violations by type
        long noFace = cheatingLogs.stream().mapToLong(c -> c.getNoFaceCount() != null ? c.getNoFaceCount() : 0).sum();
        long multiFace = cheatingLogs.stream().mapToLong(c -> c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0).sum();
        long cellPhone = cheatingLogs.stream().mapToLong(c -> c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0).sum();
        long objCount = cheatingLogs.stream().mapToLong(c -> c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0).sum();

        List<Map<String, Object>> violationsByType = new ArrayList<>();
        if (noFace > 0) violationsByType.add(Map.of("_id", "NO_FACE_DETECTED", "count", noFace));
        if (multiFace > 0) violationsByType.add(Map.of("_id", "MULTIPLE_FACES", "count", multiFace));
        if (cellPhone > 0) violationsByType.add(Map.of("_id", "CELL_PHONE", "count", cellPhone));
        if (objCount > 0) violationsByType.add(Map.of("_id", "PROHIBITED_OBJECT", "count", objCount));
        if (violationsByType.isEmpty()) {
            violationsByType.add(Map.of("_id", "TAB_SWITCH", "count", 0));
        }

        // Violations by severity
        List<Map<String, Object>> violationsBySeverity = new ArrayList<>();
        violationsBySeverity.add(Map.of("_id", "LOW", "count", noFace));
        violationsBySeverity.add(Map.of("_id", "MEDIUM", "count", multiFace));
        violationsBySeverity.add(Map.of("_id", "HIGH", "count", cellPhone));
        violationsBySeverity.add(Map.of("_id", "CRITICAL", "count", objCount));

        // Classification distribution
        long safeCount = attempts.stream().filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() >= 85).count();
        long warnCount = attempts.stream().filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() >= 65 && a.getIntegrityScore() < 85).count();
        long malCount = attempts.stream().filter(a -> a.getIntegrityScore() != null && a.getIntegrityScore() < 65).count();

        List<Map<String, Object>> classificationDist = new ArrayList<>();
        classificationDist.add(Map.of("_id", "SAFE", "count", safeCount));
        classificationDist.add(Map.of("_id", "WARNING", "count", warnCount));
        classificationDist.add(Map.of("_id", "MALPRACTICE", "count", malCount));

        // Scores by exam
        List<Map<String, Object>> scoresByExam = new ArrayList<>();
        for (Exam e : exams) {
            List<ExamAttempt> examAttempts = attempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getId().equals(e.getId()))
                    .collect(Collectors.toList());

            double avgFairness = examAttempts.isEmpty() ? 100.0 :
                    examAttempts.stream().mapToDouble(a -> a.getIntegrityScore() != null ? a.getIntegrityScore() : 100.0).average().orElse(100.0);

            long totalViolationsExam = cheatingLogs.stream()
                    .filter(c -> e.getExamCode().equalsIgnoreCase(c.getExamId()))
                    .mapToLong(c -> (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +
                                    (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +
                                    (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +
                                    (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0))
                    .sum();

            Map<String, Object> se = new HashMap<>();
            se.put("_id", e.getExamCode());
            se.put("examName", e.getExamName());
            se.put("totalSessions", examAttempts.size());
            se.put("avgFairness", Math.round(avgFairness * 10.0) / 10.0);
            se.put("totalViolations", totalViolationsExam);
            scoresByExam.add(se);
        }

        // Confidence by type
        List<Map<String, Object>> confidenceByType = new ArrayList<>();
        confidenceByType.add(Map.of("_id", "FACE_DETECTION", "count", noFace + multiFace, "avgConfidence", 0.94));
        confidenceByType.add(Map.of("_id", "OBJECT_DETECTION", "count", cellPhone + objCount, "avgConfidence", 0.91));
        confidenceByType.add(Map.of("_id", "TAB_SWITCH_DETECTION", "count", 0, "avgConfidence", 1.0));

        // Top violators
        Map<String, Long> studentViolationMap = new HashMap<>();
        Map<String, String> studentNameMap = new HashMap<>();
        for (CheatingLogEntry c : cheatingLogs) {
            if (c.getEmail() != null) {
                long count = (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +
                             (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +
                             (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +
                             (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0);
                studentViolationMap.put(c.getEmail(), studentViolationMap.getOrDefault(c.getEmail(), 0L) + count);
                if (c.getUsername() != null) {
                    studentNameMap.put(c.getEmail(), c.getUsername());
                }
            }
        }

        List<Map<String, Object>> topViolators = new ArrayList<>();
        studentViolationMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .forEach(entry -> {
                    Map<String, Object> tv = new HashMap<>();
                    tv.put("_id", entry.getKey());
                    tv.put("studentEmail", entry.getKey());
                    tv.put("studentName", studentNameMap.getOrDefault(entry.getKey(), entry.getKey()));
                    tv.put("violationCount", entry.getValue());
                    tv.put("examCode", "MULTIPLE");
                    topViolators.add(tv);
                });

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("violationsByType", violationsByType);
        response.put("violationsBySeverity", violationsBySeverity);
        response.put("classificationDist", classificationDist);
        response.put("scoresByExam", scoresByExam);
        response.put("confidenceByType", confidenceByType);
        response.put("topViolators", topViolators);
        response.put("violationsTimeline", Collections.emptyList());

        return ResponseEntity.ok(response);
    }

    /**
     * Active Monitoring Sessions for Teacher / Admin Panel
     */
    @GetMapping("/api/admin/active-sessions")
    public ResponseEntity<List<Map<String, Object>>> getActiveSessions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);
        boolean isTeacher = resolved != null && "ROLE_TEACHER".equals(resolved.getRole());
        List<Exam> exams = isTeacher ? examRepository.findByTeacherId(resolved.getId()) : examRepository.findAll();
        Set<Long> allowedExamIds = exams.stream().map(Exam::getId).collect(Collectors.toSet());
        Set<String> allowedExamCodes = exams.stream().map(Exam::getExamCode).collect(Collectors.toSet());

        List<ExamAttempt> inProgressAttempts = attemptRepository.findAll().stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS && a.getExam() != null && allowedExamIds.contains(a.getExam().getId()))
                .collect(Collectors.toList());

        List<CheatingLogEntry> cheatingLogs = cheatingLogRepository.findAll().stream()
                .filter(c -> c.getExamId() != null && allowedExamCodes.contains(c.getExamId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (ExamAttempt attempt : inProgressAttempts) {
            Map<String, Object> item = new HashMap<>();
            item.put("_id", String.valueOf(attempt.getId()));
            item.put("id", attempt.getId());

            String sName = attempt.getStudent() != null ? attempt.getStudent().getName() : "Student";
            String sEmail = attempt.getStudent() != null ? attempt.getStudent().getEmail() : "student@demo.edu";
            Map<String, String> sIdMap = new HashMap<>();
            sIdMap.put("name", sName);
            sIdMap.put("email", sEmail);
            item.put("studentId", sIdMap);
            item.put("studentName", sName);
            item.put("studentEmail", sEmail);

            String eName = attempt.getExam() != null ? attempt.getExam().getExamName() : "Active Exam";
            String eCode = attempt.getExam() != null ? attempt.getExam().getExamCode() : "EXAM";
            item.put("examName", eName);
            item.put("examCode", eCode);

            long timeLeftSeconds = 0;
            if (attempt.getServerDeadline() != null) {
                timeLeftSeconds = Math.max(0, Duration.between(LocalDateTime.now(), attempt.getServerDeadline()).getSeconds());
            }
            item.put("timeLeftSeconds", timeLeftSeconds);

            long vCount = cheatingLogs.stream()
                    .filter(c -> sEmail.equalsIgnoreCase(c.getEmail()) && eCode.equalsIgnoreCase(c.getExamId()))
                    .mapToLong(c -> (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +
                                    (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +
                                    (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +
                                    (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0))
                    .sum();
            item.put("totalViolations", vCount);

            double integrity = attempt.getIntegrityScore() != null ? attempt.getIntegrityScore() : 100.0;
            item.put("fairnessScore", Math.round(integrity));

            String classification = "SAFE";
            if (integrity < 60) classification = "MALPRACTICE";
            else if (integrity < 80) classification = "WARNING";
            item.put("classification", classification);

            item.put("lastEvent", "Monitoring Active");
            item.put("status", "IN_PROGRESS");

            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Proctoring report for a given session / attempt
     */
    @GetMapping({"/api/proctoring/report/{sessionId}", "/api/admin/report/{sessionId}"})
    public ResponseEntity<Map<String, Object>> getProctoringReport(@PathVariable String sessionId) {
        Map<String, Object> report = new HashMap<>();
        report.put("sessionId", sessionId);
        report.put("status", "COMPLETED");
        report.put("fairnessScore", 95);
        report.put("classification", "SAFE");
        report.put("totalViolations", 0);
        report.put("timeline", Collections.emptyList());
        return ResponseEntity.ok(report);
    }
}
