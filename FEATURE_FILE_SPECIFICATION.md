# AI Exam Proctoring System — Feature & File Specification Guide

This document provides a comprehensive technical specification of the system architecture, detailing every feature, the AI/ML models and libraries used, and the exact files (frontend and backend) responsible for each feature.

---

## 1. AI Architecture Overview

### Is Spring AI Used?
> **No, Spring AI is NOT used in this project.**

- **Backend Role (Spring Boot 3.4.3)**: 
  The backend acts as an enterprise-grade orchestration and state engine. It manages REST APIs, WebSocket real-time telemetry streaming, MySQL persistence, JWT authentication, session state transitions, evidence storage, and mathematical scoring calculations.
- **AI/ML Runtime (Edge AI / Client-Side in Browser)**: 
  All computer vision, facial landmark tracking, object detection, and deep biometric identity verification run **100% on the client side (in the browser)** using hardware-accelerated **TensorFlow.js (WebGL/WASM)** and **MediaPipe**. This ensures sub-50ms inference latency, zero server GPU bottlenecks, and strict privacy preservation (biometric frames do not stream unencrypted across the network).

---

## 2. AI Models & Libraries Inventory

| AI / ML Capability | Library / Framework | Model Architecture | Execution Engine | Purpose & Detection Target |
| :--- | :--- | :--- | :--- | :--- |
| **3D Facial Mesh & Pose** | `@tensorflow-models/face-landmarks-detection` & `@mediapipe/face_mesh` | MediaPipe FaceMesh (468/478 3D landmarks + iris mesh) | WebGL / WebAssembly (SIMD) | Head Yaw (turn left/right), Head Pitch (downward desk glance vs upward ceiling tilt via 2D geometry & 3D $Z$-depth), Eye Gaze (via fixed canthi). |
| **Ultralight Face Detection** | `@tensorflow-models/face-detection` & `@mediapipe/face_detection` | BlazeFace (Short & Full Range) | WebGL / WASM | Real-time multi-face presence (>1 person) and candidate absence (0 persons) detection. |
| **Object Detection** | `@tensorflow-models/coco-ssd` (v2.2.3) | MobileNet V2 COCO-SSD | WebGL / TFJS | High-speed detection (10 FPS on 320x240 canvas) of cell phones, laptops, and unauthorized hardware. |
| **Biometric Face Verification** | `@vladmandic/face-api` (v1.7.15) | 1. SSD MobileNet V1<br>2. FaceLandmark68Net<br>3. FaceRecognitionNet (ResNet-34) | WebGL / TFJS | Extracts 128-dimensional deep face descriptor vectors ($L_2$-normalized). Compares identity using Euclidean distance ($\text{threshold} \le 0.58$). |
| **Acoustic Audio Proctoring** | Native HTML5 Web Audio API | Fast Fourier Transform (FFT) Analyzer (512 frequency bins) | Web Audio DSP Thread | Detects human speech (300Hz–3400Hz voice band filtering) and ambient acoustic noise. |
| **Code Execution Engine** | Custom Spring Service & Monaco Editor | Sandboxed Subprocess ProcessBuilder | Java Runtime Environment | Executes Java, Python, C++, and C test-case code with timeouts and memory limits. |

---

## 3. Feature-by-Feature File Mapping

### Feature 1: Biometric Face Identity Verification (Registration, Gate & Live Check)
*Enforces that only the registered student can access and complete the exam.*
- **Registration**: Student uploads/captures 3 clear face photos; system extracts 128-D descriptors, validates consistency ($d < 0.58$), and persists the averaged profile vector in MySQL.
- **Pre-Exam Gate**: Compares webcam feed against the stored profile before unlocking the test.
- **Continuous Check**: Silently re-verifies identity every 12 seconds during the exam.

| Component | Files Used |
| :--- | :--- |
| **AI Utility (Embeddings)** | [`frontend/src/utils/faceRecognition.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/utils/faceRecognition.js) |
| **Registration UI** | [`frontend/src/views/authentication/auth/StudentFaceCapture.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/auth/StudentFaceCapture.jsx)<br>[`frontend/src/views/authentication/Register.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/Register.js)<br>[`frontend/src/views/authentication/auth/AuthRegister.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/auth/AuthRegister.js) |
| **Pre-Exam Face Gate UI** | [`frontend/src/views/student/Components/PreExamFaceGate.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/PreExamFaceGate.jsx)<br>[`frontend/src/views/student/ExamPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/ExamPage.jsx) |
| **Continuous Exam Verification** | [`frontend/src/views/student/Components/WebCam.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/WebCam.jsx) (Lines 366–417) |
| **Backend Controller & Service** | [`backend-spring/.../controller/FaceVerificationController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/FaceVerificationController.java)<br>[`backend-spring/.../service/FaceVerificationService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/FaceVerificationService.java) |
| **Entity & Repository** | [`backend-spring/.../entity/UserFaceProfile.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/UserFaceProfile.java)<br>[`backend-spring/.../repository/UserFaceProfileRepository.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/repository/UserFaceProfileRepository.java) |
| **Weights & Models** | `frontend/public/models/ssd_mobilenetv1_model*`<br>`frontend/public/models/face_landmark_68_model*`<br>`frontend/public/models/face_recognition_model*` |

---

### Feature 2: Head Movement & Eye Gaze Vision Proctoring
*Tracks student attentiveness, distinguishes allowed downward typing/writing from suspicious looking away, and penalizes left, right, and upward deviations.*
- **Downward Glance Exemption**: Zero warning, zero siren, zero deduction when looking down at desk, keyboard, or notebook.
- **Directional Detection**: Accurately flags and announces `Looking left`, `Looking right`, or `Looking up`.
- **10 Free Warnings**: First 10 look-away warnings are free; 11th onward incurs $-5$ points.

| Component | Files Used |
| :--- | :--- |
| **Vision & Pose Pipeline** | [`frontend/src/views/student/Components/WebCam.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/WebCam.jsx) (Lines 560–980) |
| **Configuration & Thresholds** | [`frontend/src/config/proctoring.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/config/proctoring.js) |
| **Manager & Deduction Tracker** | [`frontend/src/views/student/Components/ProctoringManager.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/ProctoringManager.jsx) |
| **MediaPipe Assets** | `frontend/public/mediapipe/face_mesh/*`<br>`frontend/public/mediapipe/face_detection/*` |

---

### Feature 3: Unauthorized Object Detection (Cell Phone & Secondary Laptop)
*Detects mobile phones and secondary laptops in camera view with low latency.*
- **High-Speed Loop**: 10 FPS detection running on an offscreen 320x240 canvas.
- **Confidence Triggering**: Instant flag on high-confidence frames ($\ge 0.50$); confirmed in $\le 2$ frames for angled/partially obscured phones.

| Component | Files Used |
| :--- | :--- |
| **Inference Engine** | [`frontend/src/views/student/Components/WebCam.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/WebCam.jsx) (Lines 167–250) |
| **Thresholds & Cooldowns** | [`frontend/src/config/proctoring.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/config/proctoring.js) |
| **Siren & Deduction Logic** | [`frontend/src/views/student/Components/ProctoringManager.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/ProctoringManager.jsx) |

---

### Feature 4: Acoustic & Audio Proctoring
*Monitors the microphone for human conversations, whispering, and suspicious background noise.*
- **Frequency Filtering**: Bandpass filtering focusing on human vocal resonance (300 Hz – 3400 Hz).
- **Warning-Only Policy**: Flags notifications without deducting points ($0$ points deducted).

| Component | Files Used |
| :--- | :--- |
| **Audio Monitor Component** | [`frontend/src/views/student/Components/AudioMonitor.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/AudioMonitor.jsx) |
| **Audio Threshold Config** | [`frontend/src/config/proctoring.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/config/proctoring.js) (Lines 138–159) |
| **Event Routing** | [`frontend/src/views/student/Components/ProctoringManager.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/ProctoringManager.jsx) |

---

### Feature 5: Browser Environment & Anti-Cheating Lockdown
*Prevents exam evasion via tab switching, window blurring, fullscreen exits, or copy-pasting.*
- **Fullscreen Lock**: 1st exit shows warning modal; 2nd exit terminates the exam session.
- **Clipboard & Key Blocking**: Disables developer shortcuts, inspect element, right-click, and copy-paste.

| Component | Files Used |
| :--- | :--- |
| **Browser Monitor** | [`frontend/src/views/student/Components/BrowserMonitor.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/BrowserMonitor.jsx) |
| **Fullscreen Modal Prompt** | [`frontend/src/views/student/Components/ProctoringManager.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/ProctoringManager.jsx) (Lines 329–348) |
| **Layout Wrapper** | [`frontend/src/layouts/full/ExamLayout.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/layouts/full/ExamLayout.jsx) |

---

### Feature 6: 100-Point Integrity Engine & Real-Time Scoring
*Dynamic deduction model calculating live score and risk classification (`SAFE`, `WARNING`, `MALPRACTICE`).*
- Mobile Phone / Laptop: $-50$ pts
- Face Mismatch / Unauthorized Person: $-30$ pts
- Absence / No Face in View: $-20$ pts
- Head Turn / Eye Gaze (Left/Right/Up): 10 free warnings, then $-5$ pts each
- Score $\le 0$: Immediate automatic termination.

| Component | Files Used |
| :--- | :--- |
| **Frontend Score State & Siren** | [`frontend/src/views/student/Components/ProctoringManager.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/ProctoringManager.jsx)<br>[`frontend/src/utils/siren.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/utils/siren.js) |
| **Backend Scoring Engine** | [`backend-spring/.../service/ScoringEngineService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/ScoringEngineService.java) |
| **Constants & Policy Specs** | [`backend-spring/.../config/ProctoringConstants.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/config/ProctoringConstants.java)<br>[`frontend/src/config/proctoring.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/config/proctoring.js) |
| **Session & Violation Entities** | [`backend-spring/.../entity/ProctoringSession.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/ProctoringSession.java)<br>[`backend-spring/.../entity/ProctoringEvent.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/ProctoringEvent.java)<br>[`backend-spring/.../entity/CheatingLogEntry.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/CheatingLogEntry.java) |

---

### Feature 7: Real-Time WebSocket Telemetry & Live Teacher Monitoring
*Low-latency live stream of candidate video snapshots, active violations, and live score to teacher dashboard.*

| Component | Files Used |
| :--- | :--- |
| **Backend WebSocket Handler** | [`backend-spring/.../websocket/ProctoringWebSocketHandler.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/websocket/ProctoringWebSocketHandler.java) |
| **WebSocket Config** | [`backend-spring/.../config/WebSocketConfig.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/config/WebSocketConfig.java) |
| **Stream Service** | [`backend-spring/.../service/ProctoringStreamService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/ProctoringStreamService.java) |
| **Teacher Live Monitoring UI** | [`frontend/src/views/teacher/LiveMonitoringPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/LiveMonitoringPage.jsx)<br>[`frontend/src/views/teacher/ExamLogPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/ExamLogPage.jsx)<br>[`frontend/src/views/teacher/components/CheatingTable.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/components/CheatingTable.jsx) |

---

### Feature 8: Student Exam Taking & Online Coding IDE
*Integrated test engine supporting Multiple Choice Questions (MCQ) and interactive coding problems with real-time compilation.*

| Component | Files Used |
| :--- | :--- |
| **Test Page & Controller** | [`frontend/src/views/student/TestPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/TestPage.jsx)<br>[`frontend/src/views/student/ExamDetails.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/ExamDetails.jsx) |
| **MCQ Question UI** | [`frontend/src/views/student/Components/MultipleChoiceQuestion.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/MultipleChoiceQuestion.jsx)<br>[`frontend/src/views/student/Components/NumberOfQuestions.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Components/NumberOfQuestions.jsx) |
| **Coding IDE (Monaco Editor)** | [`frontend/src/views/student/Coder.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/Coder.jsx)<br>[`frontend/src/views/student/CodeDetails.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/CodeDetails.jsx) |
| **Backend Code Execution Engine**| [`backend-spring/.../controller/CodeExecutionController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/CodeExecutionController.java)<br>[`backend-spring/.../service/CodeExecutionService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/CodeExecutionService.java) |
| **Exam Attempt Services** | [`backend-spring/.../service/ExamAttemptService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/ExamAttemptService.java)<br>[`backend-spring/.../controller/LegacyExamSessionController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/LegacyExamSessionController.java) |
| **Exam Result & Report Page** | [`frontend/src/views/student/ResultPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/ResultPage.jsx)<br>[`frontend/src/views/student/ProctoringReport.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/student/ProctoringReport.jsx) |

---

### Feature 9: Teacher & Admin Exam Authoring & Management
*Full portal for teachers and admins to create exams, define enrollment policies, manage question banks, and view integrity analytics.*

| Component | Files Used |
| :--- | :--- |
| **Admin & Teacher Dashboards** | [`frontend/src/views/teacher/AdminDashboard.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/AdminDashboard.jsx)<br>[`frontend/src/views/teacher/TeacherExamsPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/TeacherExamsPage.jsx)<br>[`frontend/src/views/teacher/AnalyticsPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/AnalyticsPage.jsx)<br>[`frontend/src/views/teacher/UserApprovalsPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/UserApprovalsPage.jsx) |
| **Exam & Question Creation Forms** | [`frontend/src/views/teacher/CreateExamPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/CreateExamPage.jsx)<br>[`frontend/src/views/teacher/AddQuestions.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/AddQuestions.jsx)<br>[`frontend/src/views/teacher/components/ExamForm.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/components/ExamForm.jsx)<br>[`frontend/src/views/teacher/components/AddQuestionForm.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/components/AddQuestionForm.jsx)<br>[`frontend/src/views/teacher/components/CodingQuestionForm.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/teacher/components/CodingQuestionForm.jsx) |
| **Backend Controllers & Services** | [`backend-spring/.../controller/TeacherController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/TeacherController.java)<br>[`backend-spring/.../controller/AdminController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/AdminController.java)<br>[`backend-spring/.../service/ExamService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/ExamService.java)<br>[`backend-spring/.../service/EnrollmentService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/EnrollmentService.java) |
| **Question Entities & Repositories** | [`backend-spring/.../entity/Exam.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/Exam.java)<br>[`backend-spring/.../entity/Question.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/Question.java)<br>[`backend-spring/.../entity/CodingQuestion.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/CodingQuestion.java) |

---

### Feature 10: Authentication, Authorization & User Profile Management
*Handles JWT authentication, strong password validation checklist, distinct profile routes, and real photo avatar loading.*
- **Password Policy**: At least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol (@#$%!).
- **Dedicated Profile Pages**: `My Profile` (read-only view), `My Account` (editable info & photo upload), and `My Tasks`.

| Component | Files Used |
| :--- | :--- |
| **Login & Register Views** | [`frontend/src/views/authentication/Login.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/Login.js)<br>[`frontend/src/views/authentication/auth/AuthLogin.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/auth/AuthLogin.js)<br>[`frontend/src/views/authentication/Register.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/Register.js)<br>[`frontend/src/views/authentication/auth/AuthRegister.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/auth/AuthRegister.js) |
| **Password Checklist Component** | [`frontend/src/components/forms/PasswordRequirementsChecklist.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/components/forms/PasswordRequirementsChecklist.jsx) |
| **Profile, Account & Tasks Pages** | [`frontend/src/views/user/UserProfilePage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/user/UserProfilePage.jsx)<br>[`frontend/src/views/authentication/UserAccount.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/authentication/UserAccount.jsx)<br>[`frontend/src/views/user/UserTasksPage.jsx`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/views/user/UserTasksPage.jsx) |
| **Header Profile Dropdown & Avatar** | [`frontend/src/layouts/full/header/Profile.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/layouts/full/header/Profile.js)<br>[`frontend/src/layouts/full/header/Header.js`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/frontend/src/layouts/full/header/Header.js) |
| **Backend Auth & Security** | [`backend-spring/.../controller/AuthController.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/controller/AuthController.java)<br>[`backend-spring/.../service/AuthService.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/service/AuthService.java)<br>[`backend-spring/.../config/SecurityConfig.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/config/SecurityConfig.java)<br>[`backend-spring/.../security/JwtTokenProvider.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/security/JwtTokenProvider.java)<br>[`backend-spring/.../security/JwtAuthenticationFilter.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/security/JwtAuthenticationFilter.java)<br>[`backend-spring/.../util/PasswordValidator.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/util/PasswordValidator.java) |
| **User Entity & Repository** | [`backend-spring/.../entity/User.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/entity/User.java)<br>[`backend-spring/.../repository/UserRepository.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/repository/UserRepository.java) |

---

### Feature 11: Relational Database Persistence & Schema
*MySQL database schema, JPA entities, and database configuration.*

| Component | Files Used |
| :--- | :--- |
| **SQL Schema Definition** | [`backend-spring/src/main/resources/schema.sql`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/resources/schema.sql) |
| **Spring Configuration** | [`backend-spring/src/main/resources/application.properties`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/resources/application.properties) |
| **Initial Seeder / Demo Guard** | [`backend-spring/.../config/DatabaseSeeder.java`](file:///D:/Mega%20Project%204th%20Year/AI-Exam-Proctoring-System/backend-spring/src/main/java/com/aieval8/examproctoring/config/DatabaseSeeder.java) |
| **JPA Entities (14)** | `User`, `UserFaceProfile`, `Role`, `Exam`, `Question`, `CodingQuestion`, `ExamAttempt`, `ExamEnrollment`, `ProctoringSession`, `ProctoringEvent`, `CheatingLogEntry`, `Notification`, `Client`, `ViolationSeverity` |
| **JPA Repositories (12)** | `UserRepository`, `UserFaceProfileRepository`, `ExamRepository`, `QuestionRepository`, `CodingQuestionRepository`, `ExamAttemptRepository`, `ExamEnrollmentRepository`, `ProctoringSessionRepository`, `ProctoringEventRepository`, `CheatingLogEntryRepository`, `NotificationRepository`, `ClientRepository` |

---

## 4. Summary Matrix: Where Does Each AI Feature Run?

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (EDGE AI)                             |
|                                                                                         |
|  [ WebCam Video Stream ]                                                                |
|         │                                                                               |
|         ├──► MediaPipe FaceMesh (478 Landmarks)  ──► Head Yaw, Pitch & Gaze Tracking   |
|         │                                                                               |
|         ├──► MediaPipe BlazeFace Detector         ──► Multi-Face & Absence Detection     |
|         │                                                                               |
|         ├──► MobileNet V2 COCO-SSD (10 FPS)       ──► Cell Phone & Laptop Detection     |
|         │                                                                               |
|         └──► face-api.js ResNet-34 Embeddings     ──► Biometric Identity Verification   |
|                                                                                         |
|  [ Microphone Stream ]                                                                  |
|         └──► Web Audio API FFT Spectrum Analyser  ──► Voice & Ambient Noise Detection   |
+-----------------------------------------------------------------------------------------+
                                           │
                        WebSocket / REST JSON Telemetry (<5ms)
                                           ▼
+-----------------------------------------------------------------------------------------+
|                                BACKEND SERVER (SPRING BOOT 3.4.3)                       |
|                                                                                         |
|  * NO Spring AI (No Cloud LLM/Remote Vision API Dependencies)                           |
|  * Real-Time Telemetry Relay via WebSocket (ProctoringWebSocketHandler)                 |
|  * Dynamic Integrity Scoring Engine (ScoringEngineService)                              |
|  * Sandboxed Multi-Language Code Compilation & Execution (CodeExecutionService)        |
|  * Spring Security + JWT Authentication Filter                                          |
|  * MySQL 8.0 Persistence via Spring Data JPA                                            |
+-----------------------------------------------------------------------------------------+
```
