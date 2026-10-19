# Database Schema & JPA Entity Mapping Audit Inventory

Comprehensive inventory of all MySQL tables, columns, data types, nullability, default values, primary keys, foreign keys, indexes, and their corresponding Spring Boot JPA Entities.

## Table: `clients`
**JPA Entity Mapping**: `Client.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `name` | `VARCHAR(150)` | NO | `None` |   | `name` |
| `code` | `VARCHAR(50)` | NO | `None` |   | `code` |
| `address` | `VARCHAR(255)` | YES | `None` |   | `address` |
| `contact_information` | `VARCHAR(255)` | YES | `None` |   | `contact_information` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_clients_code (code)`

---

## Table: `users`
**JPA Entity Mapping**: `User.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `name` | `VARCHAR(100)` | NO | `None` |   | `name` |
| `email` | `VARCHAR(150)` | NO | `None` |   | `email` |
| `password` | `VARCHAR(255)` | NO | `None` |   | `password` |
| `phone` | `VARCHAR(30)` | YES | `None` |   | `phone` |
| `student_id_number` | `VARCHAR(50)` | YES | `None` |   | `student_id_number` |
| `role` | `ENUM(` | YES | `None` |   | `role` |
| `status` | `VARCHAR(20)` | NO | `'ACTIVE'` |   | `status` |
| `client_id` | `BIGINT` | YES | `None` |   | `client_id` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |
| `updated_at` | `DATETIME(6)` | YES | `None` |   | `updated_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_users_email (email)`
- `KEY idx_users_role (role)`
- `KEY idx_users_client_id (client_id)`
- `CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL`

---

## Table: `exams`
**JPA Entity Mapping**: `Exam.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_code` | `VARCHAR(64)` | NO | `None` |   | `exam_code` |
| `exam_name` | `VARCHAR(200)` | NO | `None` |   | `exam_name` |
| `exam_password_hash` | `VARCHAR(255)` | NO | `None` |   | `exam_password_hash` |
| `subject` | `VARCHAR(100)` | YES | `None` |   | `subject` |
| `description` | `TEXT` | YES | `None` |   | `description` |
| `instructions` | `TEXT` | YES | `None` |   | `instructions` |
| `duration_minutes` | `INT` | NO | `30` |   | `duration_minutes` |
| `total_questions` | `INT` | NO | `0` |   | `total_questions` |
| `total_marks` | `DOUBLE` | NO | `100.0` |   | `total_marks` |
| `passing_marks` | `DOUBLE` | NO | `40.0` |   | `passing_marks` |
| `has_coding_round` | `BIT(1)` | NO | `0` |   | `has_coding_round` |
| `coding_marks` | `DOUBLE` | YES | `0.0` |   | `coding_marks` |
| `enrollment_policy` | `ENUM(` | YES | `None` |   | `enrollment_policy` |
| `status` | `VARCHAR(20)` | NO | `'PUBLISHED'` |   | `status` |
| `teacher_id` | `BIGINT` | NO | `None` |   | `teacher_id` |
| `client_id` | `BIGINT` | NO | `None` |   | `client_id` |
| `exam_date` | `DATETIME(6)` | YES | `None` |   | `exam_date` |
| `start_time` | `DATETIME(6)` | YES | `None` |   | `start_time` |
| `end_time` | `DATETIME(6)` | YES | `None` |   | `end_time` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |
| `updated_at` | `DATETIME(6)` | YES | `None` |   | `updated_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_exams_exam_code (exam_code)`
- `KEY idx_exams_teacher_id (teacher_id)`
- `KEY idx_exams_client_id (client_id)`
- `KEY idx_exams_status (status)`
- `CONSTRAINT fk_exams_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE`
- `CONSTRAINT fk_exams_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE`

---

## Table: `questions`
**JPA Entity Mapping**: `Question.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_id` | `BIGINT` | NO | `None` |   | `exam_id` |
| `question_text` | `TEXT` | NO | `None` |   | `question_text` |
| `options_json` | `TEXT` | NO | `None` |   | `options_json` |
| `correct_option_index` | `INT` | NO | `None` |   | `correct_option_index` |
| `marks` | `DOUBLE` | NO | `1.0` |   | `marks` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_questions_exam_id (exam_id)`
- `CONSTRAINT fk_questions_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE`

---

## Table: `coding_questions`
**JPA Entity Mapping**: `CodingQuestion.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_id` | `VARCHAR(255)` | NO | `None` |   | `exam_id` |
| `title` | `VARCHAR(255)` | YES | `None` |   | `title` |
| `question` | `VARCHAR(500)` | NO | `None` |   | `question` |
| `description` | `LONGTEXT` | YES | `None` |   | `description` |
| `difficulty` | `VARCHAR(20)` | YES | `'Medium'` |   | `difficulty` |
| `marks` | `DOUBLE` | NO | `20.0` |   | `marks` |
| `allowed_languages` | `VARCHAR(255)` | YES | `'javascript` |   | `allowed_languages` |
| `time_limit_ms` | `INT` | YES | `2000` |   | `time_limit_ms` |
| `memory_limit_mb` | `INT` | YES | `256` |   | `memory_limit_mb` |
| `sample_test_cases_json` | `LONGTEXT` | YES | `None` |   | `sample_test_cases_json` |
| `hidden_test_cases_json` | `LONGTEXT` | YES | `None` |   | `hidden_test_cases_json` |
| `starter_code_json` | `TEXT` | YES | `None` |   | `starter_code_json` |
| `examples_json` | `TEXT` | YES | `None` |   | `examples_json` |
| `language` | `VARCHAR(255)` | YES | `'javascript'` |   | `language` |
| `submitted_code` | `LONGTEXT` | YES | `None` |   | `submitted_code` |
| `execution_time` | `BIGINT` | YES | `0` |   | `execution_time` |
| `status` | `VARCHAR(255)` | YES | `'pending'` |   | `status` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |

**Constraints & Indexes:**
- `constraints TEXT NULL`
- `PRIMARY KEY (id)`
- `KEY idx_coding_questions_exam_id (exam_id)`

---

## Table: `exam_enrollments`
**JPA Entity Mapping**: `ExamEnrollment.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_id` | `BIGINT` | NO | `None` |   | `exam_id` |
| `student_id` | `BIGINT` | NO | `None` |   | `student_id` |
| `enrolled_by` | `BIGINT` | YES | `None` |   | `enrolled_by` |
| `status` | `ENUM(` | YES | `None` |   | `status` |
| `attempts_used` | `INT` | NO | `0` |   | `attempts_used` |
| `attempt_limit` | `INT` | NO | `1` |   | `attempt_limit` |
| `enrolled_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `enrolled_at` |
| `access_verified_at` | `DATETIME(6)` | YES | `None` |   | `access_verified_at` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |
| `updated_at` | `DATETIME(6)` | YES | `None` |   | `updated_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_enrollments_exam_student (exam_id, student_id)`
- `KEY idx_enrollments_student_id (student_id)`
- `KEY idx_enrollments_enrolled_by (enrolled_by)`
- `KEY idx_enrollments_status (status)`
- `CONSTRAINT fk_enrollments_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE`
- `CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE`
- `CONSTRAINT fk_enrollments_enrolled_by FOREIGN KEY (enrolled_by) REFERENCES users (id) ON DELETE SET NULL`

---

## Table: `exam_attempts`
**JPA Entity Mapping**: `ExamAttempt.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_id` | `BIGINT` | NO | `None` |   | `exam_id` |
| `student_id` | `BIGINT` | NO | `None` |   | `student_id` |
| `enrollment_id` | `BIGINT` | YES | `None` |   | `enrollment_id` |
| `status` | `ENUM(` | YES | `None` |   | `status` |
| `started_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `started_at` |
| `server_deadline` | `DATETIME(6)` | NO | `None` |   | `server_deadline` |
| `submitted_at` | `DATETIME(6)` | YES | `None` |   | `submitted_at` |
| `score` | `DOUBLE` | YES | `0.0` |   | `score` |
| `percentage` | `DOUBLE` | YES | `0.0` |   | `percentage` |
| `passed` | `BIT(1)` | YES | `0` |   | `passed` |
| `integrity_score` | `DOUBLE` | NO | `100.0` |   | `integrity_score` |
| `termination_reason` | `VARCHAR(255)` | YES | `None` |   | `termination_reason` |
| `saved_answers` | `LONGTEXT` | YES | `None` |   | `saved_answers` |
| `device_info` | `TEXT` | YES | `None` |   | `device_info` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |
| `updated_at` | `DATETIME(6)` | YES | `None` |   | `updated_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_attempts_exam_id (exam_id)`
- `KEY idx_attempts_student_id (student_id)`
- `KEY idx_attempts_enrollment_id (enrollment_id)`
- `KEY idx_attempts_status (status)`
- `CONSTRAINT fk_attempts_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE`
- `CONSTRAINT fk_attempts_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE`
- `CONSTRAINT fk_attempts_enrollment FOREIGN KEY (enrollment_id) REFERENCES exam_enrollments (id) ON DELETE SET NULL`

---

## Table: `proctoring_sessions`
**JPA Entity Mapping**: `ProctoringSession.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `attempt_id` | `BIGINT` | NO | `None` |   | `attempt_id` |
| `started_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `started_at` |
| `ended_at` | `DATETIME(6)` | YES | `None` |   | `ended_at` |
| `event_score` | `DOUBLE` | NO | `0.0` |   | `event_score` |
| `ai_score` | `DOUBLE` | NO | `0.0` |   | `ai_score` |
| `hybrid_score` | `DOUBLE` | NO | `0.0` |   | `hybrid_score` |
| `integrity_score` | `DOUBLE` | NO | `100.0` |   | `integrity_score` |
| `total_violations` | `INT` | NO | `0` |   | `total_violations` |
| `verdict` | `VARCHAR(20)` | NO | `'SAFE'` |   | `verdict` |
| `violation_summary_json` | `TEXT` | YES | `None` |   | `violation_summary_json` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_sessions_attempt_id (attempt_id)`
- `CONSTRAINT fk_sessions_attempt FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE`

---

## Table: `proctoring_events`
**JPA Entity Mapping**: `ProctoringEvent.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `session_id` | `BIGINT` | NO | `None` |   | `session_id` |
| `event_type` | `VARCHAR(50)` | NO | `None` |   | `event_type` |
| `severity` | `ENUM(` | YES | `None` |   | `severity` |
| `confidence` | `DOUBLE` | NO | `1.0` |   | `confidence` |
| `penalty_points` | `INT` | NO | `0` |   | `penalty_points` |
| `points_deducted` | `INT` | NO | `0` |   | `points_deducted` |
| `integrity_score_after` | `DOUBLE` | NO | `100.0` |   | `integrity_score_after` |
| `warning_number` | `INT` | YES | `None` |   | `warning_number` |
| `description` | `VARCHAR(255)` | YES | `None` |   | `description` |
| `evidence_url` | `LONGTEXT` | YES | `None` |   | `evidence_url` |
| `metadata_json` | `TEXT` | YES | `None` |   | `metadata_json` |
| `timestamp` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `timestamp` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_events_session_id (session_id)`
- `KEY idx_events_event_type (event_type)`
- `CONSTRAINT fk_events_session FOREIGN KEY (session_id) REFERENCES proctoring_sessions (id) ON DELETE CASCADE`

---

## Table: `cheating_logs`
**JPA Entity Mapping**: `CheatingLogEntry.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `exam_id` | `VARCHAR(255)` | NO | `None` |   | `exam_id` |
| `username` | `VARCHAR(255)` | YES | `None` |   | `username` |
| `email` | `VARCHAR(255)` | YES | `None` |   | `email` |
| `cell_phone_count` | `INT` | YES | `0` |   | `cell_phone_count` |
| `no_face_count` | `INT` | YES | `0` |   | `no_face_count` |
| `multiple_face_count` | `INT` | YES | `0` |   | `multiple_face_count` |
| `prohibited_object_count` | `INT` | YES | `0` |   | `prohibited_object_count` |
| `screenshots_json` | `LONGTEXT` | YES | `None` |   | `screenshots_json` |
| `fairness_score` | `DOUBLE` | YES | `100.0` |   | `fairness_score` |
| `verdict` | `VARCHAR(255)` | YES | `'SAFE'` |   | `verdict` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_cheating_exam_email (exam_id, email)`

---

## Table: `notifications`
**JPA Entity Mapping**: `Notification.java`

| Column Name | SQL Data Type | Nullable | Default Value | Key / Constraint / Index | JPA Field Mapping |
|---|---|---|---|---|---|
| `id` | `BIGINT` | NO | `AUTO_INCREMENT` | PK (Primary Key) | `id` |
| `recipient_id` | `BIGINT` | NO | `None` |   | `recipient_id` |
| `type` | `VARCHAR(50)` | NO | `None` |   | `type` |
| `title` | `VARCHAR(200)` | NO | `None` |   | `title` |
| `message` | `TEXT` | NO | `None` |   | `message` |
| `related_exam_id` | `VARCHAR(64)` | YES | `None` |   | `related_exam_id` |
| `related_request_id` | `BIGINT` | YES | `None` |   | `related_request_id` |
| `link` | `VARCHAR(255)` | YES | `None` |   | `link` |
| `is_read` | `BIT(1)` | NO | `b'0'` |   | `is_read` |
| `created_at` | `DATETIME(6)` | NO | `CURRENT_TIMESTAMP(6)` |   | `created_at` |

**Constraints & Indexes:**
- `PRIMARY KEY (id)`
- `KEY idx_notifications_recipient (recipient_id, is_read, created_at)`
- `CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE`

---
