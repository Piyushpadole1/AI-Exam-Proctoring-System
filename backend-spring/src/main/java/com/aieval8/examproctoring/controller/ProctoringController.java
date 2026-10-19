package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.ViolationEventRequest;
import com.aieval8.examproctoring.dto.response.ViolationResponse;
import com.aieval8.examproctoring.entity.ProctoringEvent;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.ProctoringService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.aieval8.examproctoring.service.ProctoringStreamService;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.Map;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;
    private final ProctoringStreamService streamService;

    public ProctoringController(ProctoringService proctoringService, ProctoringStreamService streamService) {
        this.proctoringService = proctoringService;
        this.streamService = streamService;
    }

    @PostMapping({"/events", "/event"})
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ViolationResponse> logViolation(
            @Valid @RequestBody ViolationEventRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        String lockKey = ("session_lock_" + request.getSessionId()).intern();
        synchronized (lockKey) {
            for (int attempt = 0; attempt < 3; attempt++) {
                try {
                    ViolationResponse response = proctoringService.logViolation(request, studentDetails);
                    return ResponseEntity.ok(response);
                } catch (org.springframework.dao.ConcurrencyFailureException ex) {
                    if (attempt == 2) throw ex;
                    try { Thread.sleep(25L * (attempt + 1)); } catch (InterruptedException ignored) {}
                }
            }
            ViolationResponse response = proctoringService.logViolation(request, studentDetails);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/evidence")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ViolationResponse> logEvidence(
            @RequestBody ViolationEventRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        String lockKey = ("session_lock_" + request.getSessionId()).intern();
        synchronized (lockKey) {
            ViolationResponse response = proctoringService.attachEvidence(
                    request.getViolationId(),
                    request.getSessionId(),
                    request.getEvidenceUrl(),
                    studentDetails
            );
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/sessions/{attemptId}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getSessionStatus(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> status = proctoringService.getSessionStatus(attemptId, userDetails);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/sessions/{attemptId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ProctoringEvent>> getSessionViolations(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ProctoringEvent> events = proctoringService.getSessionEvents(attemptId, userDetails);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/stream")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public SseEmitter streamProctoringEvents(
            @RequestParam(required = false) String examCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (examCode != null && !examCode.isBlank()) {
            return streamService.subscribeExam(examCode);
        }
        return streamService.subscribeTeacher(userDetails.getId());
    }
}
