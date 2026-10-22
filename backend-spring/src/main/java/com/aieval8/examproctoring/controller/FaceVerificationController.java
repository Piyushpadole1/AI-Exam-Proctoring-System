package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.repository.UserRepository;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.FaceVerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FaceVerificationController {

    private final FaceVerificationService faceVerificationService;
    private final UserRepository userRepository;

    public FaceVerificationController(FaceVerificationService faceVerificationService, UserRepository userRepository) {
        this.faceVerificationService = faceVerificationService;
        this.userRepository = userRepository;
    }

    /**
     * Authoritative Pre-Exam Identity Verification:
     * Compares multiple live frames against the registered profile using strict threshold & liveness,
     * and securely records verification to gate session start and questions access.
     */
    @PostMapping("/proctoring/pre-exam-verify")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> preExamVerify(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User student = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        String examId = (String) payload.get("examId");
        if (examId == null || examId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "examId is required."));
        }

        @SuppressWarnings("unchecked")
        List<List<Double>> liveEmbeddings = (List<List<Double>>) payload.get("liveEmbeddings");
        String evidenceScreenshot = (String) payload.get("evidenceScreenshot");
        Boolean livenessPassed = payload.get("livenessPassed") != null
                ? Boolean.valueOf(payload.get("livenessPassed").toString())
                : true;

        Map<String, Object> result = faceVerificationService.preExamVerify(
                student, examId, liveEmbeddings, evidenceScreenshot, livenessPassed
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Live verification check: compares live webcam embedding with registered face profile.
     */
    @PostMapping("/proctoring/verify-face")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> verifyLiveFace(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User student = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        @SuppressWarnings("unchecked")
        List<Double> liveEmbedding = (List<Double>) payload.get("liveEmbedding");

        Map<String, Object> result = faceVerificationService.verifyLiveFace(student, liveEmbedding);
        return ResponseEntity.ok(result);
    }

    /**
     * Teacher & Student secure photo viewer: returns 3 reference registration photos.
     * Only authorized teachers or the student themselves can access.
     */
    @GetMapping("/proctoring/face-profile/{studentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getFaceProfile(
            @PathVariable Long studentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> profile = faceVerificationService.getFaceProfileForAuthorizedViewer(
                studentId, userDetails.getId(), userDetails.getRole()
        );
        return ResponseEntity.ok(profile);
    }

    /**
     * Register or update face profile for the logged in student.
     */
    @PostMapping("/users/face-profile")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> registerFaceProfile(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User student = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        Boolean consent = (Boolean) payload.get("faceConsent");
        @SuppressWarnings("unchecked")
        List<String> images = (List<String>) payload.get("faceImages");
        @SuppressWarnings("unchecked")
        List<List<Double>> embeddings = (List<List<Double>>) payload.get("faceEmbeddings");
        @SuppressWarnings("unchecked")
        List<Double> averageEmbedding = (List<Double>) payload.get("averageEmbedding");

        faceVerificationService.registerFaceProfile(student, consent, images, embeddings, averageEmbedding);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Face profile registered successfully for exam verification."
        ));
    }

    /**
     * Status check for logged in student: is face registered?
     */
    @GetMapping("/users/face-profile/status")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getFaceProfileStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User student = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        return ResponseEntity.ok(Map.of(
                "isFaceRegistered", student.isFaceRegistered(),
                "studentId", student.getId(),
                "email", student.getEmail()
        ));
    }
}
