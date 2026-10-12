package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.request.JoinExamRequest;
import com.aieval8.examproctoring.dto.response.EnrollmentResponse;
import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.exception.ExamAccessException;
import com.aieval8.examproctoring.exception.ResourceNotFoundException;
import com.aieval8.examproctoring.repository.*;
import com.aieval8.examproctoring.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EnrollmentService {

    private final ExamEnrollmentRepository enrollmentRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringEventRepository eventRepository;

    public EnrollmentService(ExamEnrollmentRepository enrollmentRepository,
                             ExamRepository examRepository,
                             UserRepository userRepository,
                             PasswordEncoder passwordEncoder,
                             ExamAttemptRepository attemptRepository,
                             ProctoringSessionRepository sessionRepository,
                             ProctoringEventRepository eventRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.attemptRepository = attemptRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
    }

    private CustomUserDetails resolvePrincipal(CustomUserDetails principal) {
        if (principal != null && principal.getId() != null) {
            return principal;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    @Transactional
    public EnrollmentResponse joinExamWithCredentials(JoinExamRequest request, CustomUserDetails studentDetails) {
        CustomUserDetails resolved = resolvePrincipal(studentDetails);
        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required. Please log in.");
        }

        String examCode = request.getExamCode().trim().toUpperCase();
        Exam exam = examRepository.findByExamCode(examCode)
                .or(() -> {
                    try {
                        return examRepository.findById(Long.parseLong(examCode));
                    } catch (Exception e) {
                        return Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with code: " + examCode));

        User student = userRepository.findById(resolved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student account not found"));

        // Multi-client isolation check
        if (student.getClient() != null && exam.getClient() != null
                && !Objects.equals(student.getClient().getId(), exam.getClient().getId())) {
            throw new ExamAccessException("Access Denied: This exam belongs to a different institution.");
        }

        // GATE: Student must already be explicitly authorized/enrolled by the teacher
        ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())
                .orElseThrow(() -> new ExamAccessException("Access Denied: You are not enrolled in this exam. Only students authorized by the teacher may participate."));

        if (enrollment.getStatus() == EnrollmentStatus.BLOCKED) {
            throw new ExamAccessException("You are blocked from participating in this exam.");
        }
        if (enrollment.getStatus() != EnrollmentStatus.ENROLLED) {
            throw new ExamAccessException("Access Denied: Your enrollment status is " + enrollment.getStatus() + ". Contact your teacher.");
        }

        // Exam availability check
        if ("ARCHIVED".equalsIgnoreCase(exam.getStatus()) || "DRAFT".equalsIgnoreCase(exam.getStatus())) {
            throw new ExamAccessException("Exam is currently not active or available.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (exam.getStartTime() != null && now.isBefore(exam.getStartTime())) {
            throw new ExamAccessException("Exam has not started yet. Starts at: " + exam.getStartTime());
        }
        if (exam.getEndTime() != null && now.isAfter(exam.getEndTime())) {
            throw new ExamAccessException("Exam has ended. Ended at: " + exam.getEndTime());
        }

        // Password verification
        if (exam.getExamPasswordHash() != null && !exam.getExamPasswordHash().isEmpty()) {
            if (!passwordEncoder.matches(request.getExamPassword().trim(), exam.getExamPasswordHash())) {
                throw new ExamAccessException("Invalid exam password. Access denied.");
            }
        }

        enrollment.setAccessVerifiedAt(LocalDateTime.now());
        enrollment = enrollmentRepository.save(enrollment);

        return new EnrollmentResponse(enrollment);
    }

    @Transactional
    public List<EnrollmentResponse> enrollStudentsManual(Long examId, List<Long> studentIds, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolvePrincipal(teacherDetails);

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        User teacher = (resolved != null && resolved.getId() != null)
                ? userRepository.findById(resolved.getId()).orElse(exam.getTeacher())
                : exam.getTeacher();

        List<EnrollmentResponse> results = new ArrayList<>();

        for (Long studentId : studentIds) {
            User student = userRepository.findById(studentId).orElse(null);
            if (student == null || student.getRole() != Role.ROLE_STUDENT) {
                continue;
            }

            // Verify same client if applicable
            if (teacher != null && teacher.getClient() != null && student.getClient() != null
                    && !Objects.equals(teacher.getClient().getId(), student.getClient().getId())) {
                continue;
            }

            ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())
                    .orElseGet(() -> {
                        ExamEnrollment newEnrollment = new ExamEnrollment();
                        newEnrollment.setExam(exam);
                        newEnrollment.setStudent(student);
                        return newEnrollment;
                    });

            enrollment.setStatus(EnrollmentStatus.ENROLLED);
            if (teacher != null) {
                enrollment.setEnrolledBy(teacher);
            }
            enrollment.setAccessVerifiedAt(LocalDateTime.now());
            enrollment = enrollmentRepository.save(enrollment);

            results.add(new EnrollmentResponse(enrollment));
        }

        return results;
    }

    @Transactional
    public EnrollmentResponse enrollStudentByEmail(Long examId, String email, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolvePrincipal(teacherDetails);

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        User teacher = (resolved != null && resolved.getId() != null)
                ? userRepository.findById(resolved.getId()).orElse(exam.getTeacher())
                : exam.getTeacher();

        User student = userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with email: " + email));

        if (student.getRole() != Role.ROLE_STUDENT) {
            throw new IllegalArgumentException("Target user is not registered as a student.");
        }

        if (teacher != null && teacher.getClient() != null && student.getClient() != null
                && !Objects.equals(teacher.getClient().getId(), student.getClient().getId())) {
            throw new ExamAccessException("Student belongs to a different institution.");
        }

        ExamEnrollment enrollment = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), student.getId())
                .orElseGet(() -> {
                    ExamEnrollment newEnrollment = new ExamEnrollment();
                    newEnrollment.setExam(exam);
                    newEnrollment.setStudent(student);
                    return newEnrollment;
                });

        enrollment.setStatus(EnrollmentStatus.ENROLLED);
        if (teacher != null) {
            enrollment.setEnrolledBy(teacher);
        }
        enrollment = enrollmentRepository.save(enrollment);

        return new EnrollmentResponse(enrollment);
    }

    @Transactional
    public void unenrollStudent(Long examId, Long studentId, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolvePrincipal(teacherDetails);

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        Optional<ExamEnrollment> enOpt = enrollmentRepository.findByExamIdAndStudentId(exam.getId(), studentId);
        if (enOpt.isPresent()) {
            ExamEnrollment enrollment = enOpt.get();
            // Delete dependent attempts and sessions to prevent FK constraint failure
            List<ExamAttempt> attempts = attemptRepository.findByEnrollmentId(enrollment.getId());
            for (ExamAttempt att : attempts) {
                Optional<ProctoringSession> sess = sessionRepository.findByAttemptId(att.getId());
                if (sess.isPresent()) {
                    eventRepository.deleteBySessionId(sess.get().getId());
                    sessionRepository.delete(sess.get());
                }
                attemptRepository.delete(att);
            }
            enrollmentRepository.delete(enrollment);
        }
    }

    public List<EnrollmentResponse> getExamEnrolledStudents(Long examId, CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolvePrincipal(teacherDetails);

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (resolved == null || resolved.getId() == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if ("ROLE_TEACHER".equals(resolved.getRole())) {
            if (exam.getTeacher() == null || !exam.getTeacher().getId().equals(resolved.getId())) {
                throw new AccessDeniedException("Access denied: You do not own this exam.");
            }
        }

        return enrollmentRepository.findByExamId(exam.getId()).stream()
                .map(EnrollmentResponse::new)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAvailableStudentsForTeacher(CustomUserDetails teacherDetails) {
        CustomUserDetails resolved = resolvePrincipal(teacherDetails);
        User teacher = (resolved != null && resolved.getId() != null)
                ? userRepository.findById(resolved.getId()).orElse(null)
                : null;

        List<User> students = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_STUDENT)
                .filter(u -> teacher == null || teacher.getClient() == null || u.getClient() == null ||
                        Objects.equals(teacher.getClient().getId(), u.getClient().getId()))
                .toList();

        List<Map<String, Object>> list = new ArrayList<>();
        for (User s : students) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("_id", s.getId().toString());
            map.put("name", s.getName());
            map.put("email", s.getEmail());
            map.put("phone", s.getPhone());
            map.put("studentIdNumber", s.getStudentIdNumber());
            map.put("institution", s.getClient() != null ? s.getClient().getName() : "General");
            list.add(map);
        }
        return list;
    }

    public List<EnrollmentResponse> getStudentEnrollments(CustomUserDetails studentDetails) {
        CustomUserDetails resolved = resolvePrincipal(studentDetails);
        if (resolved == null || resolved.getId() == null) {
            return Collections.emptyList();
        }
        return enrollmentRepository.findByStudentIdAndStatus(resolved.getId(), EnrollmentStatus.ENROLLED).stream()
                .map(EnrollmentResponse::new)
                .collect(Collectors.toList());
    }
}
