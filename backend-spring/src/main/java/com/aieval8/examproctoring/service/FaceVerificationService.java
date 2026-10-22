package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.config.ProctoringConstants;
import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.exception.ExamAccessException;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationService.class);

    private final UserFaceProfileRepository faceProfileRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final PreExamVerificationRepository preExamVerificationRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public FaceVerificationService(UserFaceProfileRepository faceProfileRepository,
                                   UserRepository userRepository,
                                   ExamRepository examRepository,
                                   ExamEnrollmentRepository enrollmentRepository,
                                   PreExamVerificationRepository preExamVerificationRepository,
                                   NotificationService notificationService,
                                   ObjectMapper objectMapper) {
        this.faceProfileRepository = faceProfileRepository;
        this.userRepository = userRepository;
        this.examRepository = examRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.preExamVerificationRepository = preExamVerificationRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    /**
     * Registers 3 validated face images and embeddings for a student.
     */
    @Transactional
    public UserFaceProfile registerFaceProfile(User student, Boolean consent,
                                                List<String> images,
                                                List<List<Double>> embeddings,
                                                List<Double> averageEmbedding) {
        if (!Boolean.TRUE.equals(consent)) {
            throw new IllegalArgumentException("Consent is required: You must agree to your face data being used for exam verification.");
        }
        if (images == null || images.size() != 3) {
            throw new IllegalArgumentException("Exactly 3 face photos are required for biometric registration.");
        }
        for (int i = 0; i < images.size(); i++) {
            if (images.get(i) == null || images.get(i).isBlank()) {
                throw new IllegalArgumentException("Photo #" + (i + 1) + " cannot be empty.");
            }
        }
        if (embeddings == null || embeddings.size() != 3) {
            throw new IllegalArgumentException("Biometric embeddings could not be extracted for all 3 photos.");
        }

        // Validate that all 3 photos match the same person (strict threshold)
        double threshold = ProctoringConstants.FACE_VERIFICATION_DISTANCE_THRESHOLD; // 0.40
        double d12 = calculateDistance(embeddings.get(0), embeddings.get(1));
        double d13 = calculateDistance(embeddings.get(0), embeddings.get(2));
        double d23 = calculateDistance(embeddings.get(1), embeddings.get(2));

        log.info("Registering face for user {}: d12={}, d13={}, d23={}, threshold={}",
                student.getEmail(), d12, d13, d23, threshold);

        if (d12 > threshold || d13 > threshold || d23 > threshold) {
            throw new IllegalArgumentException("Face mismatch: All 3 photos must be of the same person. One or more photos differ significantly.");
        }

        // Compute average embedding if not provided or to ensure fidelity
        List<Double> avg = averageEmbedding;
        if (avg == null || avg.size() != embeddings.get(0).size()) {
            avg = computeAverageEmbedding(embeddings);
        }

        try {
            String embeddingsJson = objectMapper.writeValueAsString(embeddings);
            String avgJson = objectMapper.writeValueAsString(avg);

            UserFaceProfile profile = faceProfileRepository.findByUser(student)
                    .orElse(new UserFaceProfile());

            profile.setUser(student);
            profile.setConsentAgreed(true);
            profile.setEmbeddingModel("face-api-resnet128");
            profile.setEmbeddingsJson(embeddingsJson);
            profile.setAverageEmbeddingJson(avgJson);
            profile.setImage1Data(images.get(0));
            profile.setImage2Data(images.get(1));
            profile.setImage3Data(images.get(2));

            profile = faceProfileRepository.save(profile);

            student.setFaceRegistered(true);
            userRepository.save(student);

            return profile;
        } catch (Exception e) {
            log.error("Failed to serialize face profile for user {}: {}", student.getEmail(), e.getMessage());
            throw new RuntimeException("Error storing face biometric profile: " + e.getMessage(), e);
        }
    }

    /**
     * Authoritative Pre-Exam Identity Verification:
     * Compares 3-5 live frames against all 3 registered photos using strict threshold and liveness check.
     * Persists verification result to pre_exam_verifications.
     * Locks exam after 3 failed attempts and notifies teacher with evidence.
     */
    @Transactional
    public Map<String, Object> preExamVerify(User student, String examCodeOrId,
                                            List<List<Double>> liveEmbeddings,
                                            String evidenceScreenshot,
                                            Boolean livenessPassed) {
        if (student == null) {
            throw new IllegalArgumentException("Authenticated student is required.");
        }

        Exam exam = examRepository.findByExamCode(examCodeOrId.trim().toUpperCase())
                .or(() -> examRepository.findByExamCode(examCodeOrId.trim()))
                .or(() -> {
                    try {
                        return examRepository.findById(Long.parseLong(examCodeOrId.trim()));
                    } catch (Exception e) {
                        return Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examCodeOrId));

        ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())
                .orElseThrow(() -> new ExamAccessException("Access Denied: You are not enrolled in this exam."));

        if (enrollment.getStatus() == EnrollmentStatus.BLOCKED) {
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", true);
            res.put("locked", true);
            res.put("attemptsLeft", 0);
            res.put("message", "Access to this exam is locked for your account due to previous verification failures. Please contact your instructor.");
            return res;
        }

        Optional<UserFaceProfile> profileOpt = faceProfileRepository.findByUser(student);
        if (profileOpt.isEmpty()) {
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", false);
            res.put("locked", false);
            res.put("error", "NO_FACE_PROFILE");
            res.put("message", "No registered biometric face profile found for your account. Please complete face registration first.");
            return res;
        }

        UserFaceProfile profile = profileOpt.get();
        List<List<Double>> registeredEmbeddings;
        try {
            registeredEmbeddings = objectMapper.readValue(
                    profile.getEmbeddingsJson(), new TypeReference<List<List<Double>>>() {});
        } catch (Exception e) {
            log.error("Failed to parse registered embeddings for student {}: {}", student.getEmail(), e.getMessage());
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", false);
            res.put("message", "Error reading biometric profile: " + e.getMessage());
            return res;
        }

        if (registeredEmbeddings == null || registeredEmbeddings.isEmpty()) {
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", false);
            res.put("message", "Biometric face profile contains no registered templates.");
            return res;
        }

        log.info("[PreExamFaceGate] Student: {}, Exam: {}, Registered templates count: {}, Live frames count: {}",
                student.getEmail(), exam.getExamCode(), registeredEmbeddings.size(),
                liveEmbeddings != null ? liveEmbeddings.size() : 0);

        if (liveEmbeddings == null || liveEmbeddings.size() < 2) {
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", true);
            res.put("locked", false);
            res.put("message", "Insufficient live frames captured for verification. Please keep face steady.");
            return res;
        }

        double threshold = ProctoringConstants.FACE_VERIFICATION_DISTANCE_THRESHOLD; // 0.40
        int matchingFrames = 0;
        double minDistanceOverall = 1.0;
        List<Double> frameMinDistances = new ArrayList<>();

        for (List<Double> liveFrame : liveEmbeddings) {
            if (liveFrame == null || liveFrame.size() != 128) {
                continue;
            }
            double bestForFrame = 1.0;
            for (List<Double> reg : registeredEmbeddings) {
                double d = calculateDistance(liveFrame, reg);
                if (d < bestForFrame) {
                    bestForFrame = d;
                }
            }
            frameMinDistances.add(Math.round(bestForFrame * 1000.0) / 1000.0);
            if (bestForFrame < minDistanceOverall) {
                minDistanceOverall = bestForFrame;
            }
            if (bestForFrame < threshold) {
                matchingFrames++;
            }
        }

        int requiredMatches = Math.max(2, (int) Math.ceil(frameMinDistances.size() * 0.6));
        boolean majorityMatched = matchingFrames >= requiredMatches;
        boolean distancePassed = minDistanceOverall < threshold;
        boolean livePassed = Boolean.TRUE.equals(livenessPassed);
        boolean isVerified = majorityMatched && distancePassed && livePassed;

        double confidence = Math.max(0.0, Math.min(1.0, 1.0 - (minDistanceOverall / threshold) * 0.5));
        double confidencePct = Math.round(confidence * 100.0);

        log.info("[PreExamFaceGate] Distances: {}, MinDist: {}, Threshold: {}, Matched: {}/{}, Liveness: {}, Result: {}",
                frameMinDistances, String.format("%.3f", minDistanceOverall), threshold,
                matchingFrames, frameMinDistances.size(), livePassed, isVerified ? "VERIFIED (PASS)" : "REJECTED (FAIL)");

        // Count recent failed attempts for this exam in last 2 hours
        LocalDateTime recentWindow = LocalDateTime.now().minusHours(2);
        long recentFails = preExamVerificationRepository.countByStudentIdAndExamIdAndVerifiedFalseAndCreatedAtAfter(
                student.getId(), exam.getId(), recentWindow);
        int attemptNumber = (int) recentFails + 1;

        if (!isVerified) {
            String failReason;
            if (!livePassed) {
                failReason = "Liveness check failed: Static photo or no live movement detected. Please blink naturally.";
            } else if (!distancePassed || !majorityMatched) {
                failReason = String.format("Identity mismatch: Face biometrics do not match registered student (Distance: %.3f >= %.2f)",
                        minDistanceOverall, threshold);
            } else {
                failReason = "Identity verification criteria not satisfied.";
            }

            boolean shouldLock = attemptNumber >= 3;
            if (shouldLock) {
                enrollment.setStatus(EnrollmentStatus.BLOCKED);
                enrollmentRepository.save(enrollment);

                if (exam.getTeacher() != null) {
                    notificationService.createNotification(
                            exam.getTeacher(),
                            "SECURITY_ALERT",
                            "Exam Access Blocked: Biometric Mismatch",
                            "Student " + student.getName() + " (" + student.getEmail() + ") failed face verification 3 times for exam '" + exam.getExamName() + "'. Access has been locked.",
                            exam.getExamCode(),
                            null,
                            "/teacher/exams"
                    );
                }
            }

            PreExamVerification pev = new PreExamVerification(
                    student, exam, false, livePassed, minDistanceOverall, threshold, confidencePct,
                    attemptNumber, failReason, evidenceScreenshot, null, LocalDateTime.now().plusHours(1)
            );
            preExamVerificationRepository.save(pev);

            int attemptsLeft = Math.max(0, 3 - attemptNumber);
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", true);
            res.put("locked", shouldLock);
            res.put("attemptsLeft", attemptsLeft);
            res.put("attemptNumber", attemptNumber);
            res.put("distance", Math.round(minDistanceOverall * 1000.0) / 1000.0);
            res.put("threshold", threshold);
            res.put("frameDistances", frameMinDistances);
            res.put("reason", failReason);
            res.put("message", shouldLock
                    ? "Identity verification failed 3 times. Access to this exam is locked. Your instructor has been notified."
                    : failReason + String.format(". (%d attempt%s remaining)", attemptsLeft, attemptsLeft == 1 ? "" : "s"));
            return res;
        }

        // Verification Passed
        String token = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

        PreExamVerification pev = new PreExamVerification(
                student, exam, true, true, minDistanceOverall, threshold, confidencePct,
                attemptNumber, null, evidenceScreenshot, token, expiresAt
        );
        preExamVerificationRepository.save(pev);

        Map<String, Object> res = new HashMap<>();
        res.put("verified", true);
        res.put("registered", true);
        res.put("locked", false);
        res.put("verificationToken", token);
        res.put("distance", Math.round(minDistanceOverall * 1000.0) / 1000.0);
        res.put("threshold", threshold);
        res.put("confidence", confidencePct);
        res.put("message", "Identity verified successfully! Confidence: " + (int) confidencePct + "%. Initializing exam...");
        return res;
    }

    /**
     * Verifies live face embedding against registered face profile.
     * Compares live vector against all 3 registered photos using strict threshold.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> verifyLiveFace(User student, List<Double> liveEmbedding) {
        if (liveEmbedding == null || liveEmbedding.isEmpty()) {
            throw new IllegalArgumentException("Live face embedding is required.");
        }

        Optional<UserFaceProfile> profileOpt = faceProfileRepository.findByUser(student);
        if (profileOpt.isEmpty()) {
            Map<String, Object> res = new HashMap<>();
            res.put("verified", false);
            res.put("registered", false);
            res.put("error", "NO_FACE_PROFILE");
            res.put("message", "No face profile registered for this student. Please register your face first.");
            return res;
        }

        UserFaceProfile profile = profileOpt.get();
        List<List<Double>> registeredEmbeddings = null;
        try {
            registeredEmbeddings = objectMapper.readValue(
                    profile.getEmbeddingsJson(), new TypeReference<List<List<Double>>>() {});
        } catch (Exception ignored) {}

        double threshold = ProctoringConstants.FACE_VERIFICATION_DISTANCE_THRESHOLD; // 0.40
        double bestDistance = 1.0;

        if (registeredEmbeddings != null && !registeredEmbeddings.isEmpty()) {
            for (List<Double> reg : registeredEmbeddings) {
                double d = calculateDistance(liveEmbedding, reg);
                if (d < bestDistance) {
                    bestDistance = d;
                }
            }
        } else {
            // Fallback to average embedding
            try {
                List<Double> storedAvg = objectMapper.readValue(
                        profile.getAverageEmbeddingJson(), new TypeReference<List<Double>>() {});
                bestDistance = calculateDistance(liveEmbedding, storedAvg);
            } catch (Exception e) {
                throw new RuntimeException("Could not read stored biometric descriptor: " + e.getMessage(), e);
            }
        }

        boolean matches = bestDistance < threshold;
        double confidence = Math.max(0.0, Math.min(1.0, 1.0 - (bestDistance / threshold) * 0.5));

        Map<String, Object> result = new HashMap<>();
        result.put("verified", matches);
        result.put("registered", true);
        result.put("distance", Math.round(bestDistance * 1000.0) / 1000.0);
        result.put("threshold", threshold);
        result.put("confidence", Math.round(confidence * 100.0) / 100.0);
        if (!matches) {
            result.put("reason", "Face does not match registered student profile (distance: " +
                    String.format("%.3f", bestDistance) + " >= threshold " + threshold + ")");
        }

        return result;
    }

    /**
     * Securely retrieves registered face photos for the student themselves OR an authorized teacher.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getFaceProfileForAuthorizedViewer(Long studentId, Long currentUserId, String currentUserRole) {
        boolean isSelf = studentId != null && studentId.equals(currentUserId);
        boolean isTeacher = currentUserRole != null && (currentUserRole.contains("TEACHER") || currentUserRole.contains("ADMIN"));

        if (!isSelf && !isTeacher) {
            throw new SecurityException("Access denied: You are not authorized to view this biometric data.");
        }

        // If teacher, ensure teacher has this student enrolled in at least one exam
        if (!isSelf && isTeacher) {
            boolean hasEnrolledExam = enrollmentRepository.existsByStudentIdAndExamTeacherId(studentId, currentUserId);
            if (!hasEnrolledExam && !currentUserRole.contains("ADMIN")) {
                throw new SecurityException("Access denied: Student is not enrolled in any of your exams.");
            }
        }

        Optional<UserFaceProfile> profileOpt = faceProfileRepository.findByUserId(studentId);
        if (profileOpt.isEmpty()) {
            return Map.of("registered", false, "message", "No face profile found for student.");
        }

        UserFaceProfile p = profileOpt.get();
        Map<String, Object> map = new HashMap<>();
        map.put("registered", true);
        map.put("studentId", studentId);
        map.put("registeredAt", p.getCreatedAt());
        map.put("embeddingModel", p.getEmbeddingModel());
        map.put("images", List.of(p.getImage1Data(), p.getImage2Data(), p.getImage3Data()));
        try {
            List<Double> storedAvg = objectMapper.readValue(p.getAverageEmbeddingJson(), new TypeReference<List<Double>>() {});
            map.put("averageEmbedding", storedAvg);
        } catch (Exception ignored) {}
        try {
            List<List<Double>> storedEmbeddings = objectMapper.readValue(p.getEmbeddingsJson(), new TypeReference<List<List<Double>>>() {});
            map.put("faceEmbeddings", storedEmbeddings);
        } catch (Exception ignored) {}

        return map;
    }

    public double calculateDistance(List<Double> v1, List<Double> v2) {
        if (v1 == null || v2 == null || v1.size() != v2.size()) {
            return 1.0;
        }
        double sum = 0.0;
        for (int i = 0; i < v1.size(); i++) {
            double diff = v1.get(i) - v2.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    private List<Double> computeAverageEmbedding(List<List<Double>> embeddings) {
        int dim = embeddings.get(0).size();
        List<Double> avg = new ArrayList<>(dim);
        for (int i = 0; i < dim; i++) {
            double sum = 0.0;
            for (List<Double> v : embeddings) {
                sum += v.get(i);
            }
            avg.add(sum / embeddings.size());
        }
        // Normalize vector to unit length
        double norm = 0.0;
        for (double val : avg) {
            norm += val * val;
        }
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (int i = 0; i < dim; i++) {
                avg.set(i, avg.get(i) / norm);
            }
        }
        return avg;
    }
}
