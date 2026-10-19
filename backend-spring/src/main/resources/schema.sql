-- =====================================================================
-- AI EXAM PROCTORING SYSTEM - COMPREHENSIVE PRODUCTION SCHEMA
-- Database: ai_eval8_db
-- Normalized MySQL 8.0+ Schema with Complete Foreign Keys and Indexes
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS proctoring_events;
DROP TABLE IF EXISTS proctoring_sessions;
DROP TABLE IF EXISTS exam_attempts;
DROP TABLE IF EXISTS exam_enrollments;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS coding_questions;
DROP TABLE IF EXISTS cheating_logs;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS clients;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Table: clients
-- Multi-tenant institutional domain separation
-- ---------------------------------------------------------------------
CREATE TABLE clients (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address VARCHAR(255) NULL,
    contact_information VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_clients_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Table: users
-- User accounts with role-based access control (TEACHER, STUDENT only)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    student_id_number VARCHAR(50) NULL,
    role ENUM('ROLE_ADMIN', 'ROLE_TEACHER', 'ROLE_STUDENT') NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    client_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_client_id (client_id),
    CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Table: exams
-- Exam definitions, timers, marks, capacity and policy configurations
-- ---------------------------------------------------------------------
CREATE TABLE exams (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_code VARCHAR(64) NOT NULL,
    exam_name VARCHAR(200) NOT NULL,
    exam_password_hash VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NULL,
    description TEXT NULL,
    instructions TEXT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    total_questions INT NOT NULL DEFAULT 0,
    total_marks DOUBLE NOT NULL DEFAULT 100.0,
    passing_marks DOUBLE NOT NULL DEFAULT 40.0,
    has_coding_round BIT(1) NOT NULL DEFAULT 0,
    coding_marks DOUBLE NULL DEFAULT 0.0,
    enrollment_policy ENUM('CODE_BASED_ENROLLMENT', 'INVITATION_ONLY', 'MANUAL_ENROLLMENT') NOT NULL DEFAULT 'CODE_BASED_ENROLLMENT',
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    teacher_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    exam_date DATETIME(6) NULL,
    start_time DATETIME(6) NULL,
    end_time DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_exams_exam_code (exam_code),
    KEY idx_exams_teacher_id (teacher_id),
    KEY idx_exams_client_id (client_id),
    KEY idx_exams_status (status),
    CONSTRAINT fk_exams_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_exams_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Table: questions
-- MCQ questions with JSON options array, correct option index, and marks
-- ---------------------------------------------------------------------
CREATE TABLE questions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_option_index INT NOT NULL,
    marks DOUBLE NOT NULL DEFAULT 1.0,
    PRIMARY KEY (id),
    KEY idx_questions_exam_id (exam_id),
    CONSTRAINT fk_questions_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Table: coding_questions
-- Coding round questions, test suites, starter code, and constraints
-- ---------------------------------------------------------------------
CREATE TABLE coding_questions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NULL,
    question VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    difficulty VARCHAR(20) NULL DEFAULT 'Medium',
    marks DOUBLE NOT NULL DEFAULT 20.0,
    allowed_languages VARCHAR(255) NULL DEFAULT 'javascript,python,java,c,cpp',
    constraints TEXT NULL,
    time_limit_ms INT NULL DEFAULT 2000,
    memory_limit_mb INT NULL DEFAULT 256,
    sample_test_cases_json LONGTEXT NULL,
    hidden_test_cases_json LONGTEXT NULL,
    starter_code_json TEXT NULL,
    examples_json TEXT NULL,
    language VARCHAR(255) NULL DEFAULT 'javascript',
    submitted_code LONGTEXT NULL,
    execution_time BIGINT NULL DEFAULT 0,
    status VARCHAR(255) NULL DEFAULT 'pending',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_coding_questions_exam_id (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Table: exam_enrollments
-- Exam enrollment states (PENDING, ENROLLED, REJECTED, BLOCKED, COMPLETED)
-- ---------------------------------------------------------------------
CREATE TABLE exam_enrollments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_by BIGINT NULL,
    status ENUM('PENDING', 'ENROLLED', 'REJECTED', 'BLOCKED', 'COMPLETED') NOT NULL DEFAULT 'ENROLLED',
    attempts_used INT NOT NULL DEFAULT 0,
    attempt_limit INT NOT NULL DEFAULT 1,
    enrolled_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    access_verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_enrollments_exam_student (exam_id, student_id),
    KEY idx_enrollments_student_id (student_id),
    KEY idx_enrollments_enrolled_by (enrolled_by),
    KEY idx_enrollments_status (status),
    CONSTRAINT fk_enrollments_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_enrolled_by FOREIGN KEY (enrolled_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Table: exam_attempts
-- Exam attempts with saved answers, score calculations and pass/fail flags
-- ---------------------------------------------------------------------
CREATE TABLE exam_attempts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrollment_id BIGINT NULL,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'AUTO_SUBMITTED', 'DISQUALIFIED') NOT NULL DEFAULT 'IN_PROGRESS',
    started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    server_deadline DATETIME(6) NOT NULL,
    submitted_at DATETIME(6) NULL,
    score DOUBLE NULL DEFAULT 0.0,
    percentage DOUBLE NULL DEFAULT 0.0,
    passed BIT(1) NULL DEFAULT 0,
    integrity_score DOUBLE NOT NULL DEFAULT 100.0,
    termination_reason VARCHAR(255) NULL,
    saved_answers LONGTEXT NULL,
    device_info TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_attempts_exam_id (exam_id),
    KEY idx_attempts_student_id (student_id),
    KEY idx_attempts_enrollment_id (enrollment_id),
    KEY idx_attempts_status (status),
    CONSTRAINT fk_attempts_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_enrollment FOREIGN KEY (enrollment_id) REFERENCES exam_enrollments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Table: proctoring_sessions
-- Proctoring sessions linking attempt to real-time hybrid integrity metrics
-- ---------------------------------------------------------------------
CREATE TABLE proctoring_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    attempt_id BIGINT NOT NULL,
    started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ended_at DATETIME(6) NULL,
    event_score DOUBLE NOT NULL DEFAULT 0.0,
    ai_score DOUBLE NOT NULL DEFAULT 0.0,
    hybrid_score DOUBLE NOT NULL DEFAULT 0.0,
    integrity_score DOUBLE NOT NULL DEFAULT 100.0,
    total_violations INT NOT NULL DEFAULT 0,
    verdict VARCHAR(20) NOT NULL DEFAULT 'SAFE',
    violation_summary_json TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_sessions_attempt_id (attempt_id),
    CONSTRAINT fk_sessions_attempt FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Table: proctoring_events
-- Discrete violation logs with evidence base64 URLs, penalty points and severity
-- ---------------------------------------------------------------------
CREATE TABLE proctoring_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    confidence DOUBLE NOT NULL DEFAULT 1.0,
    penalty_points INT NOT NULL DEFAULT 0,
    points_deducted INT NOT NULL DEFAULT 0,
    integrity_score_after DOUBLE NOT NULL DEFAULT 100.0,
    warning_number INT NULL,
    description VARCHAR(255) NULL,
    evidence_url LONGTEXT NULL,
    metadata_json TEXT NULL,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_events_session_id (session_id),
    KEY idx_events_event_type (event_type),
    CONSTRAINT fk_events_session FOREIGN KEY (session_id) REFERENCES proctoring_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Table: cheating_logs
-- Aggregated violation counters per student & exam for dashboard analytics
-- ---------------------------------------------------------------------
CREATE TABLE cheating_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    exam_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    cell_phone_count INT NULL DEFAULT 0,
    no_face_count INT NULL DEFAULT 0,
    multiple_face_count INT NULL DEFAULT 0,
    prohibited_object_count INT NULL DEFAULT 0,
    screenshots_json LONGTEXT NULL,
    fairness_score DOUBLE NULL DEFAULT 100.0,
    verdict VARCHAR(255) NULL DEFAULT 'SAFE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_cheating_exam_email (exam_id, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. Table: notifications
-- Real-time notifications for teachers and students
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    recipient_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_exam_id VARCHAR(64) NULL,
    related_request_id BIGINT NULL,
    link VARCHAR(255) NULL,
    is_read BIT(1) NOT NULL DEFAULT b'0',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_notifications_recipient (recipient_id, is_read, created_at),
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
