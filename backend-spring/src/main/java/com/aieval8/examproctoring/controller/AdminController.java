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

    private final ExamEnrollmentRepository enrollmentRepository;



    public AdminController(ExamRepository examRepository,

                           ExamAttemptRepository attemptRepository,

                           UserRepository userRepository,

                           CheatingLogEntryRepository cheatingLogRepository,

                           ProctoringSessionRepository sessionRepository,

                           ProctoringEventRepository eventRepository,

                           ExamEnrollmentRepository enrollmentRepository) {

        this.examRepository = examRepository;

        this.attemptRepository = attemptRepository;

        this.userRepository = userRepository;

        this.cheatingLogRepository = cheatingLogRepository;

        this.sessionRepository = sessionRepository;

        this.eventRepository = eventRepository;

        this.enrollmentRepository = enrollmentRepository;

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

        if (resolved == null) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Teacher role required."));

        }

        boolean isTeacher = "ROLE_TEACHER".equals(resolved.getRole());

        List<Exam> exams = isTeacher

                ? examRepository.findByTeacherId(resolved.getId())

                : examRepository.findAll();



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



        // Enrolled students count from enrollments

        long enrolledStudentsCount = allowedExamIds.isEmpty() ? 0 :

                enrollmentRepository.findAll().stream()

                        .filter(en -> en.getExam() != null && allowedExamIds.contains(en.getExam().getId()) && en.getStatus() == EnrollmentStatus.ENROLLED)

                        .map(en -> en.getStudent() != null ? en.getStudent().getId() : null)

                        .filter(Objects::nonNull)

                        .distinct()

                        .count();



        // Active exams

        LocalDateTime now = LocalDateTime.now();

        long activeExamsCount = exams.stream()

                .filter(e -> (e.getStartTime() == null || !now.isBefore(e.getStartTime())) &&

                             (e.getEndTime() == null || !now.isAfter(e.getEndTime())))

                .count();



        // Submissions & Average Score & Pass Rate

        long submissionsCount = allAttempts.stream()

                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED || a.getStatus() == AttemptStatus.COMPLETED)

                .count();



        double avgScore = allAttempts.stream()

                .filter(a -> (a.getStatus() == AttemptStatus.SUBMITTED || a.getStatus() == AttemptStatus.COMPLETED) && a.getPercentage() != null)

                .mapToDouble(ExamAttempt::getPercentage)

                .average()

                .orElse(0.0);



        long passedCount = allAttempts.stream()

                .filter(a -> a.getStatus() != AttemptStatus.DISQUALIFIED &&

                             (a.getTerminationReason() == null || a.getTerminationReason().isBlank()) &&

                             (a.getIntegrityScore() == null || a.getIntegrityScore() > 0.0) &&

                             (a.getStatus() == AttemptStatus.SUBMITTED || a.getStatus() == AttemptStatus.COMPLETED) &&

                             Boolean.TRUE.equals(a.getPassed()))

                .count();



        double passRate = submissionsCount > 0 ? (passedCount * 100.0) / submissionsCount : 0.0;



        long terminatedCount = allAttempts.stream()

                .filter(a -> a.getStatus() == AttemptStatus.DISQUALIFIED)

                .count();



        long flaggedCount = allAttempts.stream()

                .filter(a -> a.getStatus() == AttemptStatus.DISQUALIFIED || (a.getIntegrityScore() != null && a.getIntegrityScore() < 70))

                .count();



        // Total violations from both cheatingLogs and proctoring_events

        long eventViolationsCount = 0;

        try {

            for (ProctoringEvent ev : eventRepository.findAll()) {

                try {

                    if (ev.getSession() != null && ev.getSession().getAttempt() != null &&

                        ev.getSession().getAttempt().getExam() != null &&

                        allowedExamIds.contains(ev.getSession().getAttempt().getExam().getId()) &&

                        !"EXAM_STARTED".equalsIgnoreCase(ev.getEventType()) &&

                        !"QUESTION_ANSWERED".equalsIgnoreCase(ev.getEventType()) &&

                        !"EXAM_SUBMITTED".equalsIgnoreCase(ev.getEventType())) {

                        eventViolationsCount++;

                    }

                } catch (Exception ignored) {}

            }

        } catch (Exception ignored) {}

        long finalViolations = Math.max(totalViolations, eventViolationsCount);



        Map<String, Object> stats = new HashMap<>();

        stats.put("totalStudents", enrolledStudentsCount > 0 ? enrolledStudentsCount : totalStudentsCount);

        stats.put("enrolledStudents", enrolledStudentsCount > 0 ? enrolledStudentsCount : totalStudentsCount);

        stats.put("totalExams", exams.size());

        stats.put("activeExams", activeExamsCount);

        stats.put("totalSessions", allAttempts.size());

        stats.put("submissions", submissionsCount);

        stats.put("activeSessions", activeSessionsCount);

        stats.put("studentsTakingExam", activeSessionsCount);

        stats.put("studentsCurrentlyTakingExams", activeSessionsCount);

        stats.put("averageScore", Math.round(avgScore * 10.0) / 10.0);

        stats.put("passRate", Math.round(passRate * 10.0) / 10.0);

        stats.put("totalViolations", finalViolations);

        stats.put("flaggedCount", flaggedCount);

        stats.put("highRiskSessions", highRiskCount);

        stats.put("cleanSessions", cleanCount);

        stats.put("safeSessions", cleanCount);

        stats.put("warningSessions", warningCount);

        stats.put("malpracticeSessions", highRiskCount);

        stats.put("terminatedSessions", terminatedCount);

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

            String sEmail = attempt.getStudent() != null ? attempt.getStudent().getEmail() : "";

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

            if (integrity < 30) classification = "MALPRACTICE";

            else if (integrity < 70) classification = "WARNING";

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



        Map<String, Object> response = new HashMap<>(stats);

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

        if (resolved == null) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Teacher role required."));

        }

        List<Exam> exams = "ROLE_TEACHER".equals(resolved.getRole())

                ? examRepository.findByTeacherId(resolved.getId())

                : examRepository.findAll();

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



        // Violations timeline: group events by chronological date

        Map<String, Long> timelineMap = new TreeMap<>();

        for (ExamAttempt att : attempts) {

            Optional<ProctoringSession> psOpt = sessionRepository.findByAttemptId(att.getId());

            if (psOpt.isPresent()) {

                List<ProctoringEvent> evList = eventRepository.findBySessionIdOrderByTimestampAsc(psOpt.get().getId());

                for (ProctoringEvent ev : evList) {

                    if (ev.getTimestamp() != null) {

                        String day = ev.getTimestamp().toLocalDate().toString();

                        timelineMap.put(day, timelineMap.getOrDefault(day, 0L) + 1);

                    }

                }

            }

        }

        if (timelineMap.isEmpty()) {

            for (CheatingLogEntry c : cheatingLogs) {

                if (c.getCreatedAt() != null) {

                    String day = c.getCreatedAt().toLocalDate().toString();

                    long cCount = (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +

                                  (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +

                                  (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +

                                  (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0);

                    if (cCount > 0) {

                        timelineMap.put(day, timelineMap.getOrDefault(day, 0L) + cCount);

                    }

                }

            }

        }

        List<Map<String, Object>> violationsTimeline = new ArrayList<>();

        timelineMap.forEach((day, cnt) -> violationsTimeline.add(Map.of("_id", day, "count", cnt)));



        // Score Distribution & Stats

        long passedCount = attempts.stream()

                .filter(a -> a.getStatus() != AttemptStatus.DISQUALIFIED &&

                             (a.getTerminationReason() == null || a.getTerminationReason().isBlank()) &&

                             (a.getIntegrityScore() == null || a.getIntegrityScore() > 0.0) &&

                             Boolean.TRUE.equals(a.getPassed()))

                .count();

        long failedCount = Math.max(0, attempts.size() - passedCount);

        double avgScore = attempts.isEmpty() ? 0.0 :

                Math.round(attempts.stream().mapToDouble(a -> a.getScore() != null ? a.getScore() : 0.0).average().orElse(0.0) * 10.0) / 10.0;

        double highScore = attempts.stream().mapToDouble(a -> a.getScore() != null ? a.getScore() : 0.0).max().orElse(0.0);

        double lowScore = attempts.isEmpty() ? 0.0 : attempts.stream().mapToDouble(a -> a.getScore() != null ? a.getScore() : 0.0).min().orElse(0.0);



        long dist0to20 = attempts.stream().filter(a -> (a.getPercentage() != null ? a.getPercentage() : 0.0) < 20.0).count();

        long dist20to40 = attempts.stream().filter(a -> { double p = a.getPercentage() != null ? a.getPercentage() : 0.0; return p >= 20.0 && p < 40.0; }).count();

        long dist40to60 = attempts.stream().filter(a -> { double p = a.getPercentage() != null ? a.getPercentage() : 0.0; return p >= 40.0 && p < 60.0; }).count();

        long dist60to80 = attempts.stream().filter(a -> { double p = a.getPercentage() != null ? a.getPercentage() : 0.0; return p >= 60.0 && p < 80.0; }).count();

        long dist80to100 = attempts.stream().filter(a -> (a.getPercentage() != null ? a.getPercentage() : 0.0) >= 80.0).count();



        List<Map<String, Object>> scoreDistribution = new ArrayList<>();

        scoreDistribution.add(Map.of("range", "0-20%", "count", dist0to20));

        scoreDistribution.add(Map.of("range", "20-40%", "count", dist20to40));

        scoreDistribution.add(Map.of("range", "40-60%", "count", dist40to60));

        scoreDistribution.add(Map.of("range", "60-80%", "count", dist60to80));

        scoreDistribution.add(Map.of("range", "80-100%", "count", dist80to100));



        Map<String, Object> response = new HashMap<>();

        response.put("success", true);

        response.put("violationsByType", violationsByType);

        response.put("violationsBySeverity", violationsBySeverity);

        response.put("classificationDist", classificationDist);

        response.put("scoresByExam", scoresByExam);

        response.put("confidenceByType", confidenceByType);

        response.put("topViolators", topViolators);

        response.put("violationsTimeline", violationsTimeline);

        response.put("totalAttempts", attempts.size());

        response.put("passedCount", passedCount);

        response.put("failedCount", failedCount);

        response.put("averageScore", avgScore);

        response.put("highestScore", highScore);

        response.put("lowestScore", lowScore);

        response.put("scoreDistribution", scoreDistribution);



        return ResponseEntity.ok(response);

    }



    /**

     * Active Monitoring Sessions for Teacher / Admin Panel

     */

    @GetMapping({"/api/admin/active-sessions", "/api/admin/active-monitoring"})

    public ResponseEntity<List<Map<String, Object>>> getActiveSessions(

            @AuthenticationPrincipal CustomUserDetails userDetails) {



        CustomUserDetails resolved = resolveUser(userDetails);

        if (resolved == null) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();

        }

        List<Exam> exams = "ROLE_TEACHER".equals(resolved.getRole())

                ? examRepository.findByTeacherId(resolved.getId())

                : examRepository.findAll();

        Set<Long> allowedExamIds = exams.stream().map(Exam::getId).collect(Collectors.toSet());

        Set<String> allowedExamCodes = exams.stream().map(Exam::getExamCode).collect(Collectors.toSet());



        // Get in-progress attempts first, plus recently submitted or terminated attempts

        List<ExamAttempt> inProgressAttempts = attemptRepository.findAll().stream()

                .filter(a -> a.getExam() != null && allowedExamIds.contains(a.getExam().getId()))

                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS ||

                             a.getStatus() == AttemptStatus.DISQUALIFIED ||

                             (a.getSubmittedAt() != null && a.getSubmittedAt().isAfter(LocalDateTime.now().minusHours(1))))

                .sorted((a, b) -> {

                    LocalDateTime ta = a.getStartedAt() != null ? a.getStartedAt() : LocalDateTime.MIN;

                    LocalDateTime tb = b.getStartedAt() != null ? b.getStartedAt() : LocalDateTime.MIN;

                    return tb.compareTo(ta);

                })

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

            String sEmail = attempt.getStudent() != null ? attempt.getStudent().getEmail() : "";

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



            // Fetch violations from session & eventRepository

            Optional<ProctoringSession> psOpt = sessionRepository.findByAttemptId(attempt.getId());

            long vCount = 0;

            ProctoringEvent latestEv = null;

            if (psOpt.isPresent()) {

                List<ProctoringEvent> evs = eventRepository.findBySessionIdOrderByTimestampAsc(psOpt.get().getId());

                vCount = evs.size();

                if (!evs.isEmpty()) {

                    latestEv = evs.get(evs.size() - 1);

                }

            }



            if (vCount == 0) {

                vCount = cheatingLogs.stream()

                        .filter(c -> sEmail.equalsIgnoreCase(c.getEmail()) && eCode.equalsIgnoreCase(c.getExamId()))

                        .mapToLong(c -> (c.getNoFaceCount() != null ? c.getNoFaceCount() : 0) +

                                        (c.getMultipleFaceCount() != null ? c.getMultipleFaceCount() : 0) +

                                        (c.getCellPhoneCount() != null ? c.getCellPhoneCount() : 0) +

                                        (c.getProhibitedObjectCount() != null ? c.getProhibitedObjectCount() : 0))

                        .sum();

            }

            item.put("totalViolations", vCount);



            double integrity = attempt.getIntegrityScore() != null ? attempt.getIntegrityScore() : 100.0;

            item.put("fairnessScore", Math.round(integrity));

            item.put("integrityScore", Math.round(integrity));



            String classification = "SAFE";

            if (integrity < 30) classification = "MALPRACTICE";

            else if (integrity < 70) classification = "WARNING";

            item.put("classification", classification);

            item.put("verdict", classification);



            String faceStatus = attempt.getFaceVerificationStatus() != null ? attempt.getFaceVerificationStatus() : "VERIFIED";

            int faceMismatches = attempt.getFaceMismatchCount();

            item.put("faceVerificationStatus", faceStatus);

            item.put("faceMismatchCount", faceMismatches);



            if (latestEv != null) {

                Map<String, Object> latestMap = new HashMap<>();

                latestMap.put("eventType", latestEv.getEventType());

                latestMap.put("severity", latestEv.getSeverity() != null ? latestEv.getSeverity().toString() : "MEDIUM");

                latestMap.put("timestamp", latestEv.getTimestamp() != null ? latestEv.getTimestamp().toString() : LocalDateTime.now().toString());

                item.put("latestViolation", latestMap);

                item.put("lastEvent", latestEv.getEventType().replace("_", " "));

            } else {

                item.put("latestViolation", null);

                item.put("lastEvent", vCount > 0 ? "Violation Logged" : "Monitoring Active");

            }



            // Real status: active, flagged, terminated, submitted

            String status = "active";

            if (attempt.getStatus() == AttemptStatus.DISQUALIFIED) {

                status = "terminated";

            } else if (attempt.getStatus() == AttemptStatus.COMPLETED) {

                status = "submitted";

            } else if (vCount > 0 || integrity < 80) {

                status = "flagged";

            }

            item.put("status", status);

            item.put("attemptStatus", attempt.getStatus().toString());

            item.put("score", attempt.getScore() != null ? attempt.getScore() : 0.0);



            result.add(item);

        }



        return ResponseEntity.ok(result);

    }



    /**

     * Proctoring report for a given session / attempt

     */

    @GetMapping({"/api/proctoring/report/{sessionId}", "/api/admin/report/{sessionId}", "/api/admin/proctoring-report/{sessionId}"})

    public ResponseEntity<Map<String, Object>> getProctoringReport(

            @PathVariable String sessionId,

            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CustomUserDetails resolved = resolveUser(userDetails);

        Long id = null;

        try {

            id = Long.parseLong(sessionId);

        } catch (Exception ignored) {}



        ExamAttempt attempt = null;

        ProctoringSession session = null;



        if (id != null) {

            session = sessionRepository.findById(id).orElse(null);

            if (session == null) {

                session = sessionRepository.findByAttemptId(id).orElse(null);

            }

            if (session != null) {

                attempt = session.getAttempt();

            } else {

                attempt = attemptRepository.findById(id).orElse(null);

                if (attempt != null) {

                    session = sessionRepository.findByAttemptId(attempt.getId()).orElse(null);

                }

            }

        }



        if (attempt == null) {

            return ResponseEntity.notFound().build();

        }



        if (resolved != null) {

            if ("ROLE_STUDENT".equals(resolved.getRole())) {

                if (attempt.getStudent() != null && !attempt.getStudent().getId().equals(resolved.getId())) {

                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)

                            .body(Map.of("error", "Access denied: You do not own this proctoring report."));

                }

            } else if ("ROLE_TEACHER".equals(resolved.getRole())) {

                if (attempt.getExam() != null && attempt.getExam().getTeacher() != null &&

                        !attempt.getExam().getTeacher().getId().equals(resolved.getId())) {

                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)

                            .body(Map.of("error", "Access denied: You do not own the exam for this report."));

                }

            }

        }



        Map<String, Object> report = new HashMap<>();

        Map<String, Object> studentMap = new HashMap<>();

        Map<String, Object> examMap = new HashMap<>();

        Map<String, Object> sessionMap = new HashMap<>();

        Map<String, Object> resultMap = new HashMap<>();

        Map<String, Object> proctoringMap = new HashMap<>();

        Map<String, Integer> violationsByType = new LinkedHashMap<>();

        Map<String, Integer> violationsBySeverity = new LinkedHashMap<>();

        List<Map<String, Object>> violationList = new ArrayList<>();

        List<Map<String, Object>> evidenceList = new ArrayList<>();



        if (attempt != null) {

            if (attempt.getStudent() != null) {

                studentMap.put("name", attempt.getStudent().getName());

                studentMap.put("email", attempt.getStudent().getEmail());

                studentMap.put("id", attempt.getStudent().getId().toString());

            }

            if (attempt.getExam() != null) {

                examMap.put("name", attempt.getExam().getExamName());

                examMap.put("examId", attempt.getExam().getExamCode());

                examMap.put("examCode", attempt.getExam().getExamCode());

                examMap.put("totalMarks", attempt.getExam().getTotalMarks());

            }



            sessionMap.put("status", attempt.getStatus().name());

            sessionMap.put("startTime", attempt.getStartedAt() != null ? attempt.getStartedAt().toString() : "");

            sessionMap.put("endTime", attempt.getSubmittedAt() != null ? attempt.getSubmittedAt().toString() : "");

            if (attempt.getStartedAt() != null && attempt.getSubmittedAt() != null) {

                sessionMap.put("duration", Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).getSeconds());

            } else {

                sessionMap.put("duration", 0);

            }



            boolean isTerminated = attempt.getStatus() == AttemptStatus.DISQUALIFIED ||

                    (attempt.getTerminationReason() != null && !attempt.getTerminationReason().isBlank()) ||

                    (attempt.getIntegrityScore() != null && attempt.getIntegrityScore() <= 0.0);

            double passMark = attempt.getExam() != null && attempt.getExam().getPassingMarks() != null ? attempt.getExam().getPassingMarks() : 40.0;

            double score = attempt.getScore() != null ? attempt.getScore() : 0.0;

            boolean marksPassed = score >= passMark;

            boolean passed = !isTerminated && marksPassed && Boolean.TRUE.equals(attempt.getPassed());

            String failReason = attempt.getFailReason();

            if (!passed && (failReason == null || failReason.isBlank())) {

                failReason = isTerminated ? "Failed: exam terminated due to violations." :

                        "Failed: marks below passing score (" + Math.round(score) + " obtained, " + Math.round(passMark) + " required).";

            }



            resultMap.put("score", score);

            resultMap.put("totalMarks", attempt.getExam() != null ? attempt.getExam().getTotalMarks() : 100);

            resultMap.put("percentage", attempt.getPercentage() != null ? attempt.getPercentage() : 0.0);

            resultMap.put("passed", passed);

            resultMap.put("status", isTerminated ? "DISQUALIFIED" : attempt.getStatus().name());

            resultMap.put("terminationReason", attempt.getTerminationReason());

            resultMap.put("failReason", failReason);

        }



        double fairnessScore = 100.0;

        double eventScore = 0.0;

        double aiScore = 0.0;

        String classification = "SAFE";

        int totalPenalties = 0;



        if (session != null) {

            fairnessScore = session.getIntegrityScore() != null ? session.getIntegrityScore() : 100.0;

            eventScore = session.getEventScore() != null ? session.getEventScore() : 0.0;

            aiScore = session.getAiScore() != null ? session.getAiScore() : 0.0;

            classification = session.getVerdict() != null ? session.getVerdict() : "SAFE";



            List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(session.getId());

            for (ProctoringEvent ev : events) {

                String type = ev.getEventType();

                if ("EXAM_STARTED".equalsIgnoreCase(type) || "QUESTION_ANSWERED".equalsIgnoreCase(type) || "EXAM_SUBMITTED".equalsIgnoreCase(type)) {

                    continue;

                }

                violationsByType.put(type, violationsByType.getOrDefault(type, 0) + 1);

                String sev = ev.getSeverity().name();

                violationsBySeverity.put(sev, violationsBySeverity.getOrDefault(sev, 0) + 1);

                totalPenalties += ev.getPenaltyPoints();



                Map<String, Object> vm = new HashMap<>();

                vm.put("id", ev.getId().toString());

                vm.put("eventType", type);

                vm.put("severity", sev);

                vm.put("penaltyPoints", ev.getPenaltyPoints());

                vm.put("confidence", ev.getConfidence());

                vm.put("timestamp", ev.getTimestamp().toString());

                vm.put("evidenceUrl", ev.getEvidenceUrl());

                vm.put("description", ev.getDescription());

                violationList.add(vm);



                if (ev.getEvidenceUrl() != null && !ev.getEvidenceUrl().isEmpty()) {

                    evidenceList.add(Map.of(

                            "url", ev.getEvidenceUrl(),

                            "type", type,

                            "timestamp", ev.getTimestamp().toString()

                    ));

                }

            }

        }



        proctoringMap.put("classification", classification);

        proctoringMap.put("fairnessScore", Math.round(fairnessScore));

        proctoringMap.put("eventScore", Math.round(eventScore));

        proctoringMap.put("aiScore", Math.round(aiScore));

        proctoringMap.put("totalViolations", violationList.size());

        proctoringMap.put("totalPenalties", totalPenalties);

        proctoringMap.put("decisionReason", classification.equals("SAFE") ? "No significant violations detected" :

                classification.equals("WARNING") ? "Minor anomalies observed during session" : "Malpractice detected during proctored exam");



        report.put("student", studentMap);

        report.put("exam", examMap);

        report.put("session", sessionMap);

        report.put("result", resultMap);

        report.put("proctoring", proctoringMap);

        report.put("violationsByType", violationsByType);

        report.put("violationsBySeverity", violationsBySeverity);

        report.put("violations", violationList);

        report.put("evidence", evidenceList);



        return ResponseEntity.ok(Map.of("report", report, "data", report));

    }



    /**

     * Real-time activity & violation stream for teacher panel

     */

    @GetMapping("/api/admin/logs")

    public ResponseEntity<List<Map<String, Object>>> getAdminLogs(

            @RequestParam(required = false) String examId,

            @AuthenticationPrincipal CustomUserDetails userDetails) {



        CustomUserDetails resolved = resolveUser(userDetails);

        if (resolved == null) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();

        }

        if (!"ROLE_TEACHER".equals(resolved.getRole()) && !"ROLE_ADMIN".equals(resolved.getRole())) {

            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();

        }

        List<Exam> exams = "ROLE_TEACHER".equals(resolved.getRole())

                ? examRepository.findByTeacherId(resolved.getId())

                : examRepository.findAll();



        Set<Long> allowedExamIds = exams.stream().map(Exam::getId).collect(Collectors.toSet());



        List<ProctoringEvent> events = eventRepository.findAll().stream()

                .filter(ev -> ev.getSession() != null && ev.getSession().getAttempt() != null &&

                        allowedExamIds.contains(ev.getSession().getAttempt().getExam().getId()))

                .filter(ev -> {

                    if (examId != null && !examId.trim().isEmpty() && !"all".equalsIgnoreCase(examId)) {

                        Exam ex = ev.getSession().getAttempt().getExam();

                        return ex.getExamCode().equalsIgnoreCase(examId) || String.valueOf(ex.getId()).equals(examId);

                    }

                    return true;

                })

                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))

                .limit(100)

                .collect(Collectors.toList());



        List<Map<String, Object>> result = new ArrayList<>();

        for (ProctoringEvent ev : events) {

            ExamAttempt att = ev.getSession().getAttempt();

            Map<String, Object> map = new HashMap<>();

            map.put("id", ev.getId().toString());

            map.put("timestamp", ev.getTimestamp().toString());

            map.put("eventType", ev.getEventType());

            map.put("severity", ev.getSeverity().name());

            map.put("penaltyPoints", ev.getPointsDeducted() != null ? ev.getPointsDeducted() : ev.getPenaltyPoints());

            map.put("pointsDeducted", ev.getPointsDeducted() != null ? ev.getPointsDeducted() : ev.getPenaltyPoints());

            map.put("integrityScoreAfter", ev.getIntegrityScoreAfter() != null ? ev.getIntegrityScoreAfter() : 100.0);

            map.put("warningNumber", ev.getWarningNumber());

            map.put("description", ev.getDescription());

            map.put("evidenceUrl", ev.getEvidenceUrl());

            map.put("confidence", ev.getConfidence());

            map.put("studentName", att.getStudent() != null ? att.getStudent().getName() : "Student");

            map.put("studentEmail", att.getStudent() != null ? att.getStudent().getEmail() : "");

            map.put("examCode", att.getExam() != null ? att.getExam().getExamCode() : "");

            map.put("examName", att.getExam() != null ? att.getExam().getExamName() : "");

            result.add(map);

        }



        return ResponseEntity.ok(result);

    }

}

