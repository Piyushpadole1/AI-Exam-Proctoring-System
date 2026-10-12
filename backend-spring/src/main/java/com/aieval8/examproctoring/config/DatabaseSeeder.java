package com.aieval8.examproctoring.config;

import com.aieval8.examproctoring.entity.*;
import com.aieval8.examproctoring.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository,
                          ClientRepository clientRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Ensure Default Client
        Client client = clientRepository.findAll().stream().findFirst().orElseGet(() -> {
            Client c = new Client("Engineering Institute", "ENG_TECH");
            return clientRepository.save(c);
        });

        // 2. Ensure Administrator Account
        userRepository.findByEmail("admin@demo.edu").orElseGet(() -> {
            User a = new User("System Administrator", "admin@demo.edu", passwordEncoder.encode("admin123"),
                    Role.ROLE_ADMIN, client);
            a.setPhone("9999999999");
            return userRepository.save(a);
        });

        // 3. Ensure Primary Teacher Account
        userRepository.findByEmail("teacher1@demo.edu").orElseGet(() -> {
            User t = new User("Professor Alan", "teacher1@demo.edu", passwordEncoder.encode("password123"),
                    Role.ROLE_TEACHER, client);
            t.setPhone("9876543210");
            return userRepository.save(t);
        });

        // 4. Ensure Secondary Teacher Account (for multi-teacher isolation verification)
        userRepository.findByEmail("teacher2@demo.edu").orElseGet(() -> {
            User t = new User("Professor Sarah", "teacher2@demo.edu", passwordEncoder.encode("password123"),
                    Role.ROLE_TEACHER, client);
            t.setPhone("9876543222");
            return userRepository.save(t);
        });

        // 5. Ensure Demo Student Account
        userRepository.findByEmail("student1@demo.edu").orElseGet(() -> {
            User s = new User("Alice Student", "student1@demo.edu", passwordEncoder.encode("password123"),
                    Role.ROLE_STUDENT, client);
            s.setPhone("9876543211");
            s.setStudentIdNumber("STU-2026-001");
            return userRepository.save(s);
        });

        // 6. Ensure Unenrolled Student Account
        userRepository.findByEmail("student2@demo.edu").orElseGet(() -> {
            User s = new User("Bob Unenrolled", "student2@demo.edu", passwordEncoder.encode("password123"),
                    Role.ROLE_STUDENT, client);
            s.setPhone("9876543233");
            s.setStudentIdNumber("STU-2026-002");
            return userRepository.save(s);
        });
        
        // No hardcoded exams are seeded. All exams are dynamically created by teachers and stored in MySQL.
    }
}
