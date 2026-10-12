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

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;

    public ProctoringController(ProctoringService proctoringService) {
        this.proctoringService = proctoringService;
    }

    @PostMapping("/events")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ViolationResponse> logViolation(
            @Valid @RequestBody ViolationEventRequest request,
            @AuthenticationPrincipal CustomUserDetails studentDetails) {
        ViolationResponse response = proctoringService.logViolation(request, studentDetails);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sessions/{attemptId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ProctoringEvent>> getSessionViolations(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ProctoringEvent> events = proctoringService.getSessionEvents(attemptId, userDetails);
        return ResponseEntity.ok(events);
    }
}
