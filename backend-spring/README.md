# AI Exam Proctoring System — Spring Boot Backend

Enterprise Multi-Client AI Exam Proctoring and Monitoring Platform built with **Java 21**, **Spring Boot 3.4**, **Spring Security 6 (JWT)**, **Hibernate / Spring Data JPA**, and **MySQL 8.0**.

---

## Architecture & Data Isolation

```
Admin (System / Institution Management)
  └── Clients / Institutions
        ├── Teachers (Direct Registration)
        │     └── Exams (exam_code, exam_password_hash, enrollment_policy)
        │           └── ExamEnrollments (Student ↔ Exam)
        │                 └── ExamAttempts
        │                       └── ProctoringSessions & Violation Logs
        │
        └── Students (Direct Registration — no exam access by default)
```

### Core Business Rules Enforced
1. **Direct Registration**: Teachers and students register directly and receive active credentials without requiring manual admin approval.
2. **Exam-Wise Access Control**: Registration $\neq$ Exam Access. A student must have a valid `ExamEnrollment` for a specific exam before they can take it.
3. **Exam Credentials**: Each exam defines its own `exam_code` and BCrypt-hashed `exam_password`, plus an enrollment policy (`CODE_BASED_ENROLLMENT`, `MANUAL_ENROLLMENT`).
4. **Backend-Derived Identity**: The backend derives caller identity, role, and client ID directly from JWT claims (`CustomUserDetails`). Frontend-supplied IDs (`teacherId`, `studentId`) are never trusted.
5. **Teacher Data Isolation**: Teacher A cannot view, modify, or list Teacher B's exams, enrolled students, attempt records, or proctoring reports.
6. **Multi-Client Isolation**: Data across institutions/clients is segregated at the database query level.
7. **AI Proctoring Engine**: Integrated with React browser, webcam (COCO-SSD), and audio monitors to calculate hybrid penalty scores and enforce automated disqualification thresholds.

---

## Database Configuration

* **Database Name**: `ai_eval8_db`
* **Host**: `localhost:3306` (MySQL 8.0)
* **Tables**:
  - `clients`
  - `users`
  - `exams`
  - `questions`
  - `exam_enrollments`
  - `exam_attempts`
  - `proctoring_sessions`
  - `proctoring_events`

---

## API Endpoints

### 1. Authentication (`/api/auth`)
* `POST /api/auth/register/teacher` — Register teacher directly (returns JWT)
* `POST /api/auth/register/student` — Register student directly (returns JWT)
* `POST /api/auth/login` — Authenticate and receive JWT
* `GET /api/auth/me` — Retrieve current authenticated user profile

### 2. Teacher Panel (`/api/teacher`) — Requires `ROLE_TEACHER`
* `POST /api/teacher/exams` — Create a new exam with credentials and enrollment policy
* `GET /api/teacher/exams` — List only exams owned by the authenticated teacher
* `GET /api/teacher/exams/{examId}` — Get details of teacher's exam (isolated)
* `DELETE /api/teacher/exams/{examId}` — Delete teacher's exam
* `POST /api/teacher/exams/{examId}/students` — Manually enroll students into exam
* `GET /api/teacher/exams/{examId}/students` — List students enrolled in this exam

### 3. Student Panel (`/api/student`) — Requires `ROLE_STUDENT`
* `POST /api/student/exams/join` — Join exam using exam code & password
* `GET /api/student/exams` — List only exams where student is enrolled
* `POST /api/student/exams/{examCode}/start` — Start/resume attempt (enrollment verified)
* `PUT /api/student/attempts/{attemptId}/autosave` — Autosave answers during exam
* `POST /api/student/attempts/{attemptId}/submit` — Submit exam and calculate results

### 4. AI Proctoring Telemetry (`/api/proctoring`)
* `POST /api/proctoring/events` — Log violation (`TAB_SWITCH`, `CELL_PHONE_DETECTED`, `MULTIPLE_FACES`, etc.)
* `GET /api/proctoring/sessions/{attemptId}` — View session violations and reports

---

## How to Run

### Option 1: Via npm (Root directory)
```powershell
# Run Spring Boot backend on port 5000:
npm run server:spring

# Run both Spring Boot backend and React frontend concurrently:
npm run dev:spring
```

### Option 2: Via Windows Batch Script
Double-click or run:
```powershell
.\run-spring.bat
```

### Option 3: Via Maven
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.12.1"
& "D:\Mega Project 4th Year\tools\apache-maven-3.9.9\bin\mvn.cmd" -f "backend-spring\pom.xml" spring-boot:run
```
