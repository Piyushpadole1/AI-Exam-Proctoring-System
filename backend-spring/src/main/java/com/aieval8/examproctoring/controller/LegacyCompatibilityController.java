package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.LoginRequest;
import com.aieval8.examproctoring.dto.request.StudentRegisterRequest;
import com.aieval8.examproctoring.dto.request.TeacherRegisterRequest;
import com.aieval8.examproctoring.dto.response.AuthResponse;
import com.aieval8.examproctoring.entity.AttemptStatus;
import com.aieval8.examproctoring.entity.CheatingLogEntry;
import com.aieval8.examproctoring.entity.EnrollmentStatus;
import com.aieval8.examproctoring.entity.Exam;
import com.aieval8.examproctoring.entity.ExamAttempt;
import com.aieval8.examproctoring.entity.ExamEnrollment;
import com.aieval8.examproctoring.entity.ProctoringSession;
import com.aieval8.examproctoring.entity.Role;
import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.entity.UserFaceProfile;
import com.aieval8.examproctoring.repository.CheatingLogEntryRepository;
import com.aieval8.examproctoring.repository.ExamAttemptRepository;
import com.aieval8.examproctoring.repository.ExamEnrollmentRepository;
import com.aieval8.examproctoring.repository.ExamRepository;
import com.aieval8.examproctoring.repository.ProctoringSessionRepository;
import com.aieval8.examproctoring.repository.UserFaceProfileRepository;
import com.aieval8.examproctoring.repository.UserRepository;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.security.JwtTokenProvider;
import com.aieval8.examproctoring.service.AuthService;
import com.aieval8.examproctoring.util.PasswordValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Compatibility Controller providing support for frontend user endpoints
 * (/api/users/auth, /api/users, /api/users/profile, /api/users/profile-photo, /api/users/profile-summary, /api/users/tasks, etc.)
 */
@RestController
@RequestMapping("/api/users")
public class LegacyCompatibilityController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final UserFaceProfileRepository userFaceProfileRepository;
    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository examEnrollmentRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final CheatingLogEntryRepository cheatingLogEntryRepository;
    private final ProctoringSessionRepository proctoringSessionRepository;

    public LegacyCompatibilityController(AuthService authService,
                                         UserRepository userRepository,
                                         PasswordEncoder passwordEncoder,
                                         JwtTokenProvider tokenProvider,
                                         UserFaceProfileRepository userFaceProfileRepository,
                                         ExamRepository examRepository,
                                         ExamEnrollmentRepository examEnrollmentRepository,
                                         ExamAttemptRepository examAttemptRepository,
                                         CheatingLogEntryRepository cheatingLogEntryRepository,
                                         ProctoringSessionRepository proctoringSessionRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.userFaceProfileRepository = userFaceProfileRepository;
        this.examRepository = examRepository;
        this.examEnrollmentRepository = examEnrollmentRepository;
        this.examAttemptRepository = examAttemptRepository;
        this.cheatingLogEntryRepository = cheatingLogEntryRepository;
        this.proctoringSessionRepository = proctoringSessionRepository;
    }

    private String extractInitials(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "U";
        }
        String[] parts = name.trim().split("[\\s\\.]+");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                sb.append(Character.toUpperCase(part.charAt(0)));
                if (sb.length() == 2) break;
            }
        }
        return sb.length() > 0 ? sb.toString() : "U";
    }

    @PostMapping("/auth")
    public ResponseEntity<Map<String, Object>> legacyLogin(@RequestBody Map<String, String> body) {
        LoginRequest req = new LoginRequest(body.get("email"), body.get("password"));
        AuthResponse authResponse = authService.login(req);

        Map<String, Object> response = new HashMap<>();
        response.put("_id", authResponse.getUser().getId().toString());
        response.put("name", authResponse.getUser().getName());
        response.put("email", authResponse.getUser().getEmail());
        response.put("role", authResponse.getUser().getRole().replace("ROLE_", "").toLowerCase());
        response.put("token", authResponse.getToken());
        response.put("isApproved", true);
        response.put("isVerified", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> legacyRegister(@RequestBody Map<String, Object> body) {
        Object pwdObj = body.get("password");
        if (pwdObj == null || !PasswordValidator.isValid(pwdObj.toString())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", PasswordValidator.PASSWORD_REQUIREMENTS_MESSAGE
            ));
        }
        String role = body.getOrDefault("role", "student").toString().trim().toLowerCase();
        AuthResponse authResponse;

        if ("teacher".equals(role)) {
            TeacherRegisterRequest req = new TeacherRegisterRequest();
            req.setName((String) body.get("name"));
            req.setEmail((String) body.get("email"));
            req.setPassword((String) body.get("password"));
            req.setPhone((String) body.get("phone"));
            req.setClientCode((String) body.get("clientCode"));
            authResponse = authService.registerTeacher(req);
        } else if ("student".equals(role)) {
            StudentRegisterRequest req = new StudentRegisterRequest();
            req.setName((String) body.get("name"));
            req.setEmail((String) body.get("email"));
            req.setPassword((String) body.get("password"));
            req.setPhone((String) body.get("phone"));
            req.setClientCode((String) body.get("clientCode"));
            req.setStudentIdNumber((String) body.get("studentId"));

            if (body.get("faceConsent") instanceof Boolean) {
                req.setFaceConsent((Boolean) body.get("faceConsent"));
            } else if (body.get("faceConsent") != null) {
                req.setFaceConsent(Boolean.parseBoolean(body.get("faceConsent").toString()));
            }

            if (body.get("faceImages") instanceof java.util.List) {
                req.setFaceImages((java.util.List<String>) body.get("faceImages"));
            }
            if (body.get("faceEmbeddings") instanceof java.util.List) {
                req.setFaceEmbeddings((java.util.List<java.util.List<Double>>) body.get("faceEmbeddings"));
            }
            if (body.get("averageEmbedding") instanceof java.util.List) {
                req.setAverageEmbedding((java.util.List<Double>) body.get("averageEmbedding"));
            }
            authResponse = authService.registerStudent(req);
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid role specified. Only Teacher and Student accounts are permitted."
            ));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("_id", authResponse.getUser().getId().toString());
        response.put("name", authResponse.getUser().getName());
        response.put("email", authResponse.getUser().getEmail());
        response.put("role", authResponse.getUser().getRole().replace("ROLE_", "").toLowerCase());
        response.put("token", authResponse.getToken());
        response.put("isApproved", true);
        response.put("isVerified", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> legacySendOtp(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP verified successfully. You may complete registration."
        ));
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("_id", user.getId().toString());
        response.put("id", user.getId().toString());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole() != null ? user.getRole().name().replace("ROLE_", "").toLowerCase() : "student");
        response.put("initials", extractInitials(user.getName()));
        response.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");
        response.put("isApproved", true);
        response.put("isVerified", true);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required."));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found."));
        }

        if (body.get("name") != null && !body.get("name").toString().trim().isEmpty()) {
            user.setName(body.get("name").toString().trim());
        }
        if (body.get("email") != null && !body.get("email").toString().trim().isEmpty()) {
            String newEmail = body.get("email").toString().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Email is already in use by another account."));
                }
                user.setEmail(newEmail);
            }
        }

        // Require current password verification before changing password
        if (body.get("password") != null && !body.get("password").toString().trim().isEmpty()) {
            String newPassword = body.get("password").toString().trim();
            if (!PasswordValidator.isValid(newPassword)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", PasswordValidator.PASSWORD_REQUIREMENTS_MESSAGE
                ));
            }
            Object currentPasswordObj = body.get("currentPassword");
            if (currentPasswordObj == null || currentPasswordObj.toString().trim().isEmpty()) {
                currentPasswordObj = body.get("oldPassword");
            }
            if (currentPasswordObj == null || currentPasswordObj.toString().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Current password is required to change password."));
            }
            String currentPassword = currentPasswordObj.toString().trim();
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Current password does not match our records."));
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        if (body.get("phone") != null) {
            user.setPhone(body.get("phone").toString().trim());
        }
        if (body.get("studentId") != null) {
            user.setStudentIdNumber(body.get("studentId").toString().trim());
        }

        user = userRepository.save(user);
        String newToken = tokenProvider.generateToken(new CustomUserDetails(user));

        Map<String, Object> response = new HashMap<>();
        response.put("_id", user.getId().toString());
        response.put("id", user.getId().toString());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name().replace("ROLE_", "").toLowerCase());
        response.put("token", newToken);
        response.put("isApproved", true);
        response.put("isVerified", true);
        response.put("initials", extractInitials(user.getName()));
        return ResponseEntity.ok(response);
    }

    /**
     * Secure endpoint: Load current user profile photo
     */
    @GetMapping("/profile-photo")
    public ResponseEntity<?> getCurrentUserProfilePhoto(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String photo = null;
        boolean isStudent = user.getRole() == Role.ROLE_STUDENT;
        if (isStudent) {
            Optional<UserFaceProfile> profileOpt = userFaceProfileRepository.findByUserId(user.getId());
            if (profileOpt.isPresent()) {
                photo = profileOpt.get().getImage1Data();
            }
        } else {
            photo = user.getProfilePicture();
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("hasPhoto", photo != null && !photo.trim().isEmpty());
        resp.put("photo", photo);
        resp.put("initials", extractInitials(user.getName()));
        resp.put("name", user.getName());
        resp.put("role", user.getRole() != null ? user.getRole().name().replace("ROLE_", "").toLowerCase() : "student");
        return ResponseEntity.ok(resp);
    }

    /**
     * Secure endpoint: Load user photo by ID (only owner or teacher/admin)
     */
    @GetMapping("/profile-photo/{userId}")
    public ResponseEntity<?> getUserProfilePhotoById(@PathVariable Long userId,
                                                     @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        boolean isOwner = userDetails.getId().equals(userId);
        boolean isTeacherOrAdmin = "ROLE_TEACHER".equals(userDetails.getRole()) || "ROLE_ADMIN".equals(userDetails.getRole());
        if (!isOwner && !isTeacherOrAdmin) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied. Only account owners and teachers may access this photo."));
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String photo = null;
        if (targetUser.getRole() == Role.ROLE_STUDENT) {
            Optional<UserFaceProfile> profileOpt = userFaceProfileRepository.findByUserId(targetUser.getId());
            if (profileOpt.isPresent()) {
                photo = profileOpt.get().getImage1Data();
            }
        } else {
            photo = targetUser.getProfilePicture();
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("hasPhoto", photo != null && !photo.trim().isEmpty());
        resp.put("photo", photo);
        resp.put("initials", extractInitials(targetUser.getName()));
        resp.put("name", targetUser.getName());
        resp.put("role", targetUser.getRole() != null ? targetUser.getRole().name().replace("ROLE_", "").toLowerCase() : "student");
        return ResponseEntity.ok(resp);
    }

    /**
     * Secure endpoint: Teacher profile photo upload
     * Students cannot modify registered biometric face photos.
     */
    @PutMapping("/profile-photo")
    public ResponseEntity<?> updateProfilePhoto(@RequestBody Map<String, Object> body,
                                                @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        if (user.getRole() == Role.ROLE_STUDENT) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", "Students cannot modify registered biometric face photos. These photos are strictly linked to exam proctoring identity verification."
            ));
        }

        Object photoObj = body.get("photo");
        if (photoObj == null || photoObj.toString().trim().isEmpty()) {
            photoObj = body.get("profilePicture");
        }
        if (photoObj == null || photoObj.toString().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Photo data is required"));
        }

        String photoData = photoObj.toString().trim();
        user.setProfilePicture(photoData);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Profile photo updated successfully",
                "photo", photoData,
                "hasPhoto", true,
                "initials", extractInitials(user.getName())
        ));
    }

    /**
     * Comprehensive Profile Summary endpoint for student / teacher
     */
    @GetMapping("/profile-summary")
    public ResponseEntity<?> getProfileSummary(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("id", user.getId());
        summary.put("_id", user.getId().toString());
        summary.put("name", user.getName());
        summary.put("email", user.getEmail());
        String roleStr = user.getRole() != null ? user.getRole().name().replace("ROLE_", "").toLowerCase() : "student";
        summary.put("role", roleStr);
        summary.put("initials", extractInitials(user.getName()));
        summary.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");

        if (user.getRole() == Role.ROLE_STUDENT) {
            Optional<UserFaceProfile> faceProfileOpt = userFaceProfileRepository.findByUserId(user.getId());
            List<String> faceImages = new ArrayList<>();
            if (faceProfileOpt.isPresent()) {
                UserFaceProfile fp = faceProfileOpt.get();
                if (fp.getImage1Data() != null) faceImages.add(fp.getImage1Data());
                if (fp.getImage2Data() != null) faceImages.add(fp.getImage2Data());
                if (fp.getImage3Data() != null) faceImages.add(fp.getImage3Data());
                summary.put("photo", fp.getImage1Data());
            } else {
                summary.put("photo", null);
            }
            summary.put("facePhotos", faceImages);

            List<ExamAttempt> attempts = examAttemptRepository.findByStudentId(user.getId());
            List<ExamAttempt> completedAttempts = attempts.stream()
                    .filter(a -> a.getStatus() != AttemptStatus.NOT_STARTED && a.getStatus() != AttemptStatus.IN_PROGRESS)
                    .toList();

            long examsTaken = completedAttempts.size();
            long passedCount = completedAttempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
            long failedCount = completedAttempts.stream().filter(a -> !Boolean.TRUE.equals(a.getPassed())).count();

            double avgScore = 0.0;
            if (examsTaken > 0) {
                double totalScore = completedAttempts.stream()
                        .mapToDouble(a -> a.getPercentage() != null ? a.getPercentage() : (a.getScore() != null ? a.getScore() : 0.0))
                        .sum();
                avgScore = Math.round((totalScore / examsTaken) * 10.0) / 10.0;
            }

            long totalViolations = 0;
            for (ExamAttempt a : attempts) {
                Optional<ProctoringSession> sessionOpt = proctoringSessionRepository.findByAttemptId(a.getId());
                if (sessionOpt.isPresent()) {
                    totalViolations += sessionOpt.get().getTotalViolations();
                }
            }

            summary.put("examsTaken", examsTaken);
            summary.put("averageScore", avgScore);
            summary.put("passedCount", passedCount);
            summary.put("failedCount", failedCount);
            summary.put("totalViolations", totalViolations);
        } else {
            summary.put("photo", user.getProfilePicture());
            List<Exam> exams = examRepository.findByTeacherId(user.getId());
            long examsCreated = exams.size();

            List<ExamEnrollment> teacherEnrollments = examEnrollmentRepository.findByExamTeacherId(user.getId());
            long totalStudentsEnrolled = teacherEnrollments.size();
            long pendingEnrollmentRequests = teacherEnrollments.stream()
                    .filter(e -> e.getStatus() == EnrollmentStatus.PENDING)
                    .count();

            summary.put("examsCreated", examsCreated);
            summary.put("totalStudentsEnrolled", totalStudentsEnrolled);
            summary.put("pendingEnrollmentRequests", pendingEnrollmentRequests);
        }

        return ResponseEntity.ok(summary);
    }

    /**
     * Actionable Task list endpoint for Student / Teacher
     */
    @GetMapping("/tasks")
    public ResponseEntity<?> getUserTasks(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        Map<String, Object> tasksResp = new HashMap<>();
        List<Map<String, Object>> tasksList = new ArrayList<>();

        if (user.getRole() == Role.ROLE_STUDENT) {
            // 1. Ready to take / Enrolled exams that haven't been completed
            List<ExamEnrollment> enrollments = examEnrollmentRepository.findByStudentId(user.getId());
            for (ExamEnrollment enrollment : enrollments) {
                if (enrollment.getStatus() == EnrollmentStatus.ENROLLED) {
                    Exam exam = enrollment.getExam();
                    if (exam != null) {
                        List<ExamAttempt> attempts = examAttemptRepository.findByExamIdAndStudentId(exam.getId(), user.getId());
                        boolean alreadyCompleted = attempts.stream()
                                .anyMatch(a -> a.getStatus() == AttemptStatus.COMPLETED || a.getStatus() == AttemptStatus.SUBMITTED);
                        if (!alreadyCompleted) {
                            Map<String, Object> item = new HashMap<>();
                            item.put("id", "ready_exam_" + exam.getId());
                            item.put("category", "READY_EXAM");
                            item.put("title", "Exam Ready: " + exam.getExamName());
                            item.put("description", "Subject: " + (exam.getSubject() != null ? exam.getSubject() : "General") + " • Duration: " + exam.getDurationMinutes() + " mins • Code: " + exam.getExamCode());
                            item.put("badge", "Ready to Start");
                            item.put("badgeColor", "success");
                            item.put("actionText", "Start Exam");
                            item.put("actionLink", "/exam");
                            tasksList.add(item);
                        }
                    }
                } else if (enrollment.getStatus() == EnrollmentStatus.PENDING) {
                    Exam exam = enrollment.getExam();
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", "pending_enrollment_" + enrollment.getId());
                    item.put("category", "PENDING_ENROLLMENT");
                    item.put("title", "Enrollment Pending: " + (exam != null ? exam.getExamName() : "Exam"));
                    item.put("description", "Your enrollment request is awaiting teacher authorization.");
                    item.put("badge", "Pending Approval");
                    item.put("badgeColor", "warning");
                    item.put("actionText", "Check Status");
                    item.put("actionLink", "/exam");
                    tasksList.add(item);
                }
            }

            // 2. Recent results
            List<ExamAttempt> attempts = examAttemptRepository.findByStudentId(user.getId());
            attempts.stream()
                    .filter(a -> a.getStatus() == AttemptStatus.COMPLETED || a.getStatus() == AttemptStatus.SUBMITTED || a.getStatus() == AttemptStatus.AUTO_SUBMITTED || a.getStatus() == AttemptStatus.DISQUALIFIED)
                    .sorted((a1, a2) -> {
                        if (a1.getSubmittedAt() == null || a2.getSubmittedAt() == null) return 0;
                        return a2.getSubmittedAt().compareTo(a1.getSubmittedAt());
                    })
                    .limit(3)
                    .forEach(a -> {
                        Exam exam = a.getExam();
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", "result_" + a.getId());
                        item.put("category", "RECENT_RESULT");
                        item.put("title", "Exam Result: " + (exam != null ? exam.getExamName() : "Exam"));
                        item.put("description", "Score: " + a.getScore() + " (" + (a.getPercentage() != null ? a.getPercentage() : 0.0) + "%) • " + (Boolean.TRUE.equals(a.getPassed()) ? "PASSED" : "FAILED"));
                        item.put("badge", Boolean.TRUE.equals(a.getPassed()) ? "Passed" : "Failed");
                        item.put("badgeColor", Boolean.TRUE.equals(a.getPassed()) ? "success" : "error");
                        item.put("actionText", "View Results");
                        item.put("actionLink", "/result");
                        tasksList.add(item);
                    });

        } else {
            // Teacher Tasks
            // 1. Pending student approvals
            List<ExamEnrollment> pendingEnrollments = examEnrollmentRepository.findByExamTeacherIdAndStatus(user.getId(), EnrollmentStatus.PENDING);
            if (!pendingEnrollments.isEmpty()) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", "teacher_pending_approvals");
                item.put("category", "PENDING_APPROVALS");
                item.put("title", pendingEnrollments.size() + " Pending Student Approval" + (pendingEnrollments.size() > 1 ? "s" : ""));
                item.put("description", "Students are waiting for exam enrollment authorization. Review and approve their requests.");
                item.put("badge", "Action Required");
                item.put("badgeColor", "error");
                item.put("actionText", "Manage Approvals");
                item.put("actionLink", "/user-approvals");
                tasksList.add(item);
            }

            // 2. Active or upcoming exams created by this teacher
            List<Exam> teacherExams = examRepository.findByTeacherId(user.getId());
            for (Exam ex : teacherExams) {
                if ("PUBLISHED".equalsIgnoreCase(ex.getStatus()) || "ACTIVE".equalsIgnoreCase(ex.getStatus())) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", "teacher_exam_" + ex.getId());
                    item.put("category", "ONGOING_EXAM");
                    item.put("title", "Active Exam: " + ex.getExamName());
                    item.put("description", "Code: " + ex.getExamCode() + " • Duration: " + ex.getDurationMinutes() + " mins • Live proctoring monitoring available.");
                    item.put("badge", "Ongoing");
                    item.put("badgeColor", "primary");
                    item.put("actionText", "Live Monitor");
                    item.put("actionLink", "/live-monitoring");
                    tasksList.add(item);
                }
            }

            // 3. Exams with flagged violations
            for (Exam ex : teacherExams) {
                List<CheatingLogEntry> logs = cheatingLogEntryRepository.findByExamId(String.valueOf(ex.getId()));
                long flagCount = logs.stream().filter(l -> !"SAFE".equalsIgnoreCase(l.getVerdict())).count();
                if (flagCount > 0) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", "flagged_exam_" + ex.getId());
                    item.put("category", "FLAGGED_VIOLATIONS");
                    item.put("title", "Review Violations: " + ex.getExamName());
                    item.put("description", flagCount + " student attempt" + (flagCount > 1 ? "s" : "") + " flagged with proctoring violations requiring review.");
                    item.put("badge", flagCount + " Flagged");
                    item.put("badgeColor", "warning");
                    item.put("actionText", "Review Logs");
                    item.put("actionLink", "/exam-log");
                    tasksList.add(item);
                }
            }
        }

        tasksResp.put("success", true);
        tasksResp.put("tasks", tasksList);
        tasksResp.put("totalTasks", tasksList.size());
        return ResponseEntity.ok(tasksResp);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> legacyLogout() {
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
    }

    @GetMapping("/pending")
    public ResponseEntity<java.util.List<Map<String, Object>>> getPendingUsers(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (!"ROLE_TEACHER".equals(userDetails.getRole()) && !"ROLE_ADMIN".equals(userDetails.getRole())) {
            return ResponseEntity.status(403).build();
        }
        java.util.List<User> pendingUsers = userRepository.findAll().stream()
                .filter(u -> "PENDING".equalsIgnoreCase(u.getStatus()))
                .toList();
        java.util.List<Map<String, Object>> res = new java.util.ArrayList<>();
        for (User u : pendingUsers) {
            Map<String, Object> map = new HashMap<>();
            map.put("_id", u.getId().toString());
            map.put("id", u.getId().toString());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole() != null ? u.getRole().name().replace("ROLE_", "").toLowerCase() : "student");
            map.put("status", u.getStatus());
            map.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
            res.add(map);
        }
        return ResponseEntity.ok(res);
    }

    @PutMapping("/approve/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (!"ROLE_TEACHER".equals(userDetails.getRole()) && !"ROLE_ADMIN".equals(userDetails.getRole())) {
            return ResponseEntity.status(403).build();
        }
        User u = userRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.notFound().build();
        }
        u.setStatus("ACTIVE");
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("success", true, "message", "User approved successfully"));
    }

    @DeleteMapping("/reject/{id}")
    public ResponseEntity<?> rejectUser(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (!"ROLE_TEACHER".equals(userDetails.getRole()) && !"ROLE_ADMIN".equals(userDetails.getRole())) {
            return ResponseEntity.status(403).build();
        }
        User u = userRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.notFound().build();
        }
        u.setStatus("REJECTED");
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("success", true, "message", "User rejected"));
    }
}
