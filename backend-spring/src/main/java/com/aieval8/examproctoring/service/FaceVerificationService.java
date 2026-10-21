package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.config.ProctoringConstants;
import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.entity.UserFaceProfile;
import com.aieval8.examproctoring.repository.ExamEnrollmentRepository;
import com.aieval8.examproctoring.repository.ExamRepository;
import com.aieval8.examproctoring.repository.UserFaceProfileRepository;
import com.aieval8.examproctoring.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationService.class);

    private final UserFaceProfileRepository faceProfileRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository enrollmentRepository;
    private final ObjectMapper objectMapper;

    public FaceVerificationService(UserFaceProfileRepository faceProfileRepository,
                                   UserRepository userRepository,
                                   ExamRepository examRepository,
                                   ExamEnrollmentRepository enrollmentRepository,
                                   ObjectMapper objectMapper) {
        this.faceProfileRepository = faceProfileRepository;
        this.userRepository = userRepository;
        this.examRepository = examRepository;
        this.enrollmentRepository = enrollmentRepository;
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

        // Validate that all 3 photos match the same person (distance < 0.58)
        double threshold = ProctoringConstants.FACE_VERIFICATION_DISTANCE_THRESHOLD;
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
     * Verifies live face embedding against registered face profile.
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
        List<Double> storedAvg;
        try {
            storedAvg = objectMapper.readValue(profile.getAverageEmbeddingJson(), new TypeReference<List<Double>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Could not read stored biometric descriptor: " + e.getMessage(), e);
        }

        double distance = calculateDistance(liveEmbedding, storedAvg);
        double threshold = ProctoringConstants.FACE_VERIFICATION_DISTANCE_THRESHOLD;
        boolean matches = distance < threshold;
        double confidence = Math.max(0.0, Math.min(1.0, 1.0 - (distance / threshold) * 0.5));

        Map<String, Object> result = new HashMap<>();
        result.put("verified", matches);
        result.put("registered", true);
        result.put("distance", Math.round(distance * 1000.0) / 1000.0);
        result.put("threshold", threshold);
        result.put("confidence", Math.round(confidence * 100.0) / 100.0);
        if (!matches) {
            result.put("reason", "Face does not match registered student profile (distance: " +
                    String.format("%.3f", distance) + " >= threshold " + threshold + ")");
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
            List<Double> storedAvg = objectMapper.readValue(p.getAverageEmbeddingJson(), new com.fasterxml.jackson.core.type.TypeReference<List<Double>>() {});
            map.put("averageEmbedding", storedAvg);
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
