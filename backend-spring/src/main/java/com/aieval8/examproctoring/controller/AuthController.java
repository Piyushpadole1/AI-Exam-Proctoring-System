package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.dto.request.LoginRequest;
import com.aieval8.examproctoring.dto.request.StudentRegisterRequest;
import com.aieval8.examproctoring.dto.request.TeacherRegisterRequest;
import com.aieval8.examproctoring.dto.response.AuthResponse;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/teacher")
    public ResponseEntity<AuthResponse> registerTeacher(@Valid @RequestBody TeacherRegisterRequest request) {
        AuthResponse response = authService.registerTeacher(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/register/student")
    public ResponseEntity<AuthResponse> registerStudent(@Valid @RequestBody StudentRegisterRequest request) {
        AuthResponse response = authService.registerStudent(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserDto> getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new AuthResponse.UserDto(
                userDetails.getId(), userDetails.getName(), userDetails.getUsername(),
                userDetails.getRole(), userDetails.getClientId(), null
        ));
    }
}
