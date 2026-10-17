package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.dto.request.LoginRequest;
import com.aieval8.examproctoring.dto.request.StudentRegisterRequest;
import com.aieval8.examproctoring.dto.request.TeacherRegisterRequest;
import com.aieval8.examproctoring.dto.response.AuthResponse;
import com.aieval8.examproctoring.entity.Client;
import com.aieval8.examproctoring.entity.Role;
import com.aieval8.examproctoring.entity.User;
import com.aieval8.examproctoring.repository.ClientRepository;
import com.aieval8.examproctoring.repository.UserRepository;
import com.aieval8.examproctoring.security.CustomUserDetails;
import com.aieval8.examproctoring.security.JwtTokenProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, ClientRepository clientRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse registerTeacher(TeacherRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + request.getEmail());
        }

        Client client = resolveClient(request.getClientCode());

        User teacher = new User();
        teacher.setName(request.getName());
        teacher.setEmail(request.getEmail().trim().toLowerCase());
        teacher.setPassword(passwordEncoder.encode(request.getPassword()));
        teacher.setPhone(request.getPhone());
        teacher.setRole(Role.ROLE_TEACHER);
        teacher.setStatus("ACTIVE");
        teacher.setClient(client);

        teacher = userRepository.save(teacher);

        CustomUserDetails userDetails = new CustomUserDetails(teacher);
        String token = tokenProvider.generateToken(userDetails);

        return new AuthResponse(token, new AuthResponse.UserDto(
                teacher.getId(), teacher.getName(), teacher.getEmail(),
                teacher.getRole().name(), client != null ? client.getId() : null,
                client != null ? client.getName() : null
        ));
    }

    @Transactional
    public AuthResponse registerStudent(StudentRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + request.getEmail());
        }

        Client client = resolveClient(request.getClientCode());

        User student = new User();
        student.setName(request.getName());
        student.setEmail(request.getEmail().trim().toLowerCase());
        student.setPassword(passwordEncoder.encode(request.getPassword()));
        student.setPhone(request.getPhone());
        student.setRole(Role.ROLE_STUDENT);
        student.setStatus("ACTIVE");
        student.setClient(client);
        student.setStudentIdNumber(request.getStudentIdNumber());

        student = userRepository.save(student);

        CustomUserDetails userDetails = new CustomUserDetails(student);
        String token = tokenProvider.generateToken(userDetails);

        return new AuthResponse(token, new AuthResponse.UserDto(
                student.getId(), student.getName(), student.getEmail(),
                student.getRole().name(), client != null ? client.getId() : null,
                client != null ? client.getName() : null
        ));
    }

    @Transactional
    public AuthResponse registerAdmin(TeacherRegisterRequest request) {
        throw new IllegalArgumentException("Admin registration is disabled. Only Teacher and Student accounts are permitted.");
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        CustomUserDetails userDetails = new CustomUserDetails(user);
        String token = tokenProvider.generateToken(userDetails);

        Client client = user.getClient();
        return new AuthResponse(token, new AuthResponse.UserDto(
                user.getId(), user.getName(), user.getEmail(),
                user.getRole().name(), client != null ? client.getId() : null,
                client != null ? client.getName() : null
        ));
    }

    private Client resolveClient(String clientCode) {
        if (clientCode != null && !clientCode.trim().isEmpty()) {
            return clientRepository.findByCode(clientCode.trim().toUpperCase())
                    .orElseGet(() -> clientRepository.save(new Client(clientCode.trim() + " Institution", clientCode.trim().toUpperCase())));
        }
        // Default Client if none specified
        return clientRepository.findByCode("DEFAULT")
                .orElseGet(() -> clientRepository.save(new Client("Default Institution", "DEFAULT")));
    }
}
