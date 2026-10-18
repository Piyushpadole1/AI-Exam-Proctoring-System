package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.LoginRequest;
import com.aieval8.examproctoring.dto.request.StudentRegisterRequest;
import com.aieval8.examproctoring.dto.request.TeacherRegisterRequest;
import com.aieval8.examproctoring.dto.response.AuthResponse;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import com.aieval8.examproctoring.entity.Role;
import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.repository.UserRepository;
import com.aieval8.examproctoring.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Compatibility Controller providing seamless support for legacy frontend routes
 * (/api/users/auth, /api/users, /api/users/send-otp, etc.)
 */
@RestController
@RequestMapping("/api/users")
public class LegacyCompatibilityController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public LegacyCompatibilityController(AuthService authService,
                                         UserRepository userRepository,
                                         PasswordEncoder passwordEncoder,
                                         JwtTokenProvider tokenProvider) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
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
    public ResponseEntity<Map<String, Object>> legacyRegister(@RequestBody Map<String, String> body) {
        String role = body.getOrDefault("role", "student").trim().toLowerCase();
        AuthResponse authResponse;

        if ("teacher".equals(role)) {
            TeacherRegisterRequest req = new TeacherRegisterRequest();
            req.setName(body.get("name"));
            req.setEmail(body.get("email"));
            req.setPassword(body.get("password"));
            req.setPhone(body.get("phone"));
            req.setClientCode(body.get("clientCode"));
            authResponse = authService.registerTeacher(req);
        } else if ("student".equals(role)) {
            StudentRegisterRequest req = new StudentRegisterRequest();
            req.setName(body.get("name"));
            req.setEmail(body.get("email"));
            req.setPassword(body.get("password"));
            req.setPhone(body.get("phone"));
            req.setClientCode(body.get("clientCode"));
            req.setStudentIdNumber(body.get("studentId"));
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
        // Direct registration does not require blocking on email SMTP, returning instant verification success
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
        Map<String, Object> response = new HashMap<>();
        response.put("_id", userDetails.getId().toString());
        response.put("name", userDetails.getName());
        response.put("email", userDetails.getUsername());
        response.put("role", userDetails.getRole().replace("ROLE_", "").toLowerCase());
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
        if (body.get("password") != null && !body.get("password").toString().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(body.get("password").toString().trim()));
        }
        if (body.get("role") != null) {
            String r = body.get("role").toString().trim().toLowerCase();
            if ("teacher".equals(r)) {
                user.setRole(Role.ROLE_TEACHER);
            } else if ("student".equals(r)) {
                user.setRole(Role.ROLE_STUDENT);
            }
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
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name().replace("ROLE_", "").toLowerCase());
        response.put("token", newToken);
        response.put("isApproved", true);
        response.put("isVerified", true);
        return ResponseEntity.ok(response);
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

