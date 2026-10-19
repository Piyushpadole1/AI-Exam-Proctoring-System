# Backend Endpoints Inventory

Comprehensive audit inventory of all Spring Boot REST endpoints in `backend-spring`.

| HTTP Method | Endpoint Path | Role / Authorization | Controller Method | Payload / Parameters | Return Type | Status Codes |
|---|---|---|---|---|---|---|
| `POST` | `/api/admin/logout` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.logout()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `ANY` | `/api/sessions/{attemptId}/autosave` | Authenticated User (JWT) | `LegacyExamSessionController.autoSave()` | Body: `Map<String, Object>` | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `ANY` | `/api/users/exam/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.deleteLegacyExam()` | None | PathVar: `examId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/coding/question/{id}` | Authenticated User (JWT) | `LegacyExamSessionController.deleteCodingQuestion()` | None | PathVar: `id` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/teacher/exams/{examId}/students/{studentId}` | ROLE_STUDENT | `TeacherController.unenrollStudent()` | None | PathVar: `examId,studentId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/teacher/exams/{examId}` | Authenticated User (JWT) | `TeacherController.deleteExam()` | None | PathVar: `examId` | `Void` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/users/exam/questions/{questionId}` | Authenticated User (JWT) | `LegacyExamSessionController.deleteQuestion()` | None | PathVar: `questionId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/users/exam/{examCode}/unenroll-student/{studentId}` | ROLE_STUDENT | `LegacyExamSessionController.unenrollStudentFromExam()` | None | PathVar: `examCode,studentId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/users/reject/{id}` | Authenticated User (JWT) | `LegacyCompatibilityController.rejectUser()` | None | PathVar: `id` | `?` | 200, 400, 401, 403, 500 |
| `GET` | `/active-attempt/{examCode}` | Authenticated User (JWT) | `StudentController.getActiveAttempt()` | None | PathVar: `examCode` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/active-sessions` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getActiveSessions()` | None | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/analytics` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getAnalytics()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/dashboard` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getDashboardStats()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/logs` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getAdminLogs()` | None | Query: `` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/proctoring-report/{sessionId}` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getProctoringReport()` | None | PathVar: `sessionId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/admin/report/{sessionId}` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getProctoringReport()` | None | PathVar: `sessionId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/cheating-logs/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getCheatingLogs()` | None | PathVar: `examId` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/cheatingLogs/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getCheatingLogs()` | None | PathVar: `examId` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/coding/questions/exam/{examId}` | Public | `LegacyExamSessionController.getCodingQuestionByExam()` | None | PathVar: `examId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/coding/questions` | Public | `LegacyExamSessionController.getAllCodingQuestions()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/notifications/stream` | Authenticated User (JWT) | `NotificationController.streamNotifications()` | None | `SseEmitter` | 200, 400, 401, 403, 500 |
| `GET` | `/api/notifications/unread-count` | Authenticated User (JWT) | `NotificationController.getUnreadCount()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/proctoring/report/{sessionId}` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.getProctoringReport()` | None | PathVar: `sessionId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/proctoring/sessions/{attemptId}` | Authenticated User (JWT) | `ProctoringController.getSessionViolations()` | None | PathVar: `attemptId` | `List<ProctoringEvent` | 200, 400, 401, 403, 500 |
| `GET` | `/api/results/attempt/{attemptId}` | Authenticated User (JWT) | `LegacyExamSessionController.getDetailedResultReport()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/results/{attemptId}/detailed-report` | Authenticated User (JWT) | `LegacyExamSessionController.getDetailedResultReport()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/sessions/{attemptId}` | Authenticated User (JWT) | `LegacyExamSessionController.getLegacySession()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/teacher/exams/{examId}/students` | ROLE_STUDENT | `TeacherController.getEnrolledStudents()` | None | PathVar: `examId` | `List<EnrollmentResponse` | 200, 400, 401, 403, 500 |
| `GET` | `/api/teacher/exams/{examId}` | Authenticated User (JWT) | `TeacherController.getExamById()` | None | PathVar: `examId` | `ExamResponse` | 200, 400, 401, 403, 500 |
| `GET` | `/api/teacher/exams` | Authenticated User (JWT) | `TeacherController.getMyExams()` | None | `List<ExamResponse` | 200, 400, 401, 403, 500 |
| `GET` | `/api/teacher/students` | ROLE_STUDENT | `TeacherController.getAvailableStudents()` | None | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/cheating-logs/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getCheatingLogs()` | None | PathVar: `examId` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/cheatingLogs/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getCheatingLogs()` | None | PathVar: `examId` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/all/enrollment-requests` | Public | `LegacyExamSessionController.getEnrollmentRequests()` | None | PathVar: `` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/pending-requests` | Public | `LegacyExamSessionController.getEnrollmentRequests()` | None | PathVar: `` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/questions/{examCode}` | Authenticated User (JWT) | `LegacyExamSessionController.getQuestionsByExam()` | None | PathVar: `examCode` | `?` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/{examCode}/enrolled-students` | ROLE_STUDENT | `LegacyExamSessionController.getEnrolledStudentsForExam()` | None | PathVar: `examCode` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/{examCode}/enrollment-requests` | Public | `LegacyExamSessionController.getEnrollmentRequests()` | None | PathVar: `` | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getLegacyExamById()` | None | PathVar: `examId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/exam` | Authenticated User (JWT) | `LegacyExamSessionController.getLegacyExams()` | None | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/profile` | Authenticated User (JWT) | `LegacyCompatibilityController.getProfile()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/all` | Authenticated User (JWT) | `LegacyExamSessionController.getAllResults()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/attempt/{attemptId}` | Authenticated User (JWT) | `LegacyExamSessionController.getDetailedResultReport()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/exam/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.getResultsByExam()` | None | PathVar: `examId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/my-results` | Authenticated User (JWT) | `LegacyExamSessionController.getUserResults()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/user` | Authenticated User (JWT) | `LegacyExamSessionController.getUserResults()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/{attemptId}/detailed-report` | Authenticated User (JWT) | `LegacyExamSessionController.getDetailedResultReport()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/results/{attemptId}` | Authenticated User (JWT) | `LegacyExamSessionController.getDetailedResultReport()` | None | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/student/dashboard` | ROLE_STUDENT | `LegacyExamSessionController.getLegacyStudentDashboard()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/students` | ROLE_STUDENT | `LegacyExamSessionController.getAvailableStudentsList()` | None | `List<Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/dashboard` | ROLE_STUDENT | `StudentController.getStudentDashboard()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `GET` | `/exams` | Authenticated User (JWT) | `StudentController.getMyExams()` | None | `List<EnrollmentResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/auth/login` | Public | `AuthController.login()` | Body: `LoginRequest` | `AuthResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/auth/logout` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.logout()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/auth/register/admin` | ROLE_TEACHER / ROLE_ADMIN | `AuthController.registerAdmin()` | Body: `TeacherRegisterRequest` | `?` | 200, 400, 401, 403, 500 |
| `POST` | `/api/auth/register/student` | ROLE_STUDENT | `AuthController.registerStudent()` | Body: `StudentRegisterRequest` | `AuthResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/auth/register/teacher` | ROLE_TEACHER | `AuthController.registerTeacher()` | Body: `TeacherRegisterRequest` | `AuthResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/cheating-logs` | Public | `LegacyExamSessionController.saveCheatingLog()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/cheatingLogs` | Public | `LegacyExamSessionController.saveCheatingLog()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/coding/execute-raw` | Public | `CodeExecutionController.runCodeStructured()` | Body: `JSON` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/coding/question` | Authenticated User (JWT) | `LegacyExamSessionController.createCodingQuestion()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/coding/questions` | Authenticated User (JWT) | `LegacyExamSessionController.createCodingQuestion()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/coding/run` | Authenticated User (JWT) | `LegacyExamSessionController.evaluateCodingAnswer()` | Body: `Map<String, Object> body,             HttpServletRequest` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/coding/submit` | Authenticated User (JWT) | `LegacyExamSessionController.evaluateCodingAnswer()` | Body: `Map<String, Object> body,             HttpServletRequest` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/compile` | Public | `CodeExecutionController.runCodeStructured()` | Body: `JSON` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/proctoring/event` | Authenticated User (JWT) | `ProctoringController.logViolation()` | Body: `ViolationEventRequest` | `ViolationResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/proctoring/events` | Authenticated User (JWT) | `ProctoringController.logViolation()` | Body: `ViolationEventRequest` | `ViolationResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/proctoring/evidence` | Authenticated User (JWT) | `ProctoringController.logEvidence()` | Body: `ViolationEventRequest` | `ViolationResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/results` | Authenticated User (JWT) | `LegacyExamSessionController.saveLegacyResult()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/sessions/start` | Authenticated User (JWT) | `LegacyExamSessionController.startLegacySession()` | Body: `Map<String, Object> body,             HttpServletRequest` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/sessions/verify-access` | Authenticated User (JWT) | `LegacyExamSessionController.verifyExamAccess()` | Body: `Map<String, String>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/sessions/{attemptId}/submit` | Authenticated User (JWT) | `LegacyExamSessionController.submitLegacySession()` | Body: `Map<String, Object>` | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/sessions/{attemptId}/terminate` | Public | `LegacyExamSessionController.terminateLegacySession()` | Body: `JSON` | PathVar: `attemptId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/teacher/exams/{examId}/enroll-email` | ROLE_STUDENT | `TeacherController.enrollStudentByEmail()` | Body: `Map<String, String>` | PathVar: `examId` | `EnrollmentResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/teacher/exams/{examId}/students` | ROLE_STUDENT | `TeacherController.enrollStudents()` | Body: `EnrollStudentsRequest` | PathVar: `examId` | `List<EnrollmentResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/teacher/exams` | ROLE_TEACHER | `TeacherController.createExam()` | Body: `CreateExamRequest` | `ExamResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/auth` | Public | `LegacyCompatibilityController.legacyLogin()` | Body: `Map<String, String>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/cheating-logs` | Public | `LegacyExamSessionController.saveCheatingLog()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/cheatingLogs` | Public | `LegacyExamSessionController.saveCheatingLog()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/enroll-student` | ROLE_STUDENT | `LegacyExamSessionController.enrollStudentInExam()` | None | PathVar: `` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/questions` | Authenticated User (JWT) | `LegacyExamSessionController.createQuestion()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/{examCode}/approve-student/{studentId}` | ROLE_STUDENT | `LegacyExamSessionController.approveStudent()` | None | PathVar: `examCode,studentId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/{examCode}/enroll-student` | ROLE_STUDENT | `LegacyExamSessionController.enrollStudentInExam()` | None | PathVar: `` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/{examCode}/enrollment/{studentId}/approve` | ROLE_STUDENT | `LegacyExamSessionController.approveStudent()` | None | PathVar: `examCode,studentId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/{examCode}/reject-student/{studentId}` | ROLE_STUDENT | `LegacyExamSessionController.rejectStudent()` | None | PathVar: `examCode,studentId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam/{examCode}/request-enrollment` | Authenticated User (JWT) | `LegacyExamSessionController.requestEnrollment()` | None | PathVar: `examCode` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/exam` | Authenticated User (JWT) | `LegacyExamSessionController.createLegacyExam()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/logout` | Public | `LegacyCompatibilityController.legacyLogout()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/logout` | ROLE_TEACHER / ROLE_ADMIN | `AdminController.logout()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/results` | Authenticated User (JWT) | `LegacyExamSessionController.saveLegacyResult()` | Body: `Map<String, Object>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/api/users/send-otp` | Public | `LegacyCompatibilityController.legacySendOtp()` | Body: `Map<String, String>` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `POST` | `/attempts/{attemptId}/submit` | Authenticated User (JWT) | `StudentController.submitExam()` | Body: `SaveAnswersRequest` | PathVar: `attemptId` | `AttemptResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/exams/join` | Authenticated User (JWT) | `StudentController.joinExam()` | Body: `JoinExamRequest` | `EnrollmentResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/exams/{examCode}/start` | Public | `StudentController.startExam()` | Body: `JSON` | PathVar: `examCode` | `AttemptResponse` | 200, 400, 401, 403, 500 |
| `POST` | `/run-c` | Public | `CodeExecutionController.runC()` | Body: `JSON` | `String` | 200, 400, 401, 403, 500 |
| `POST` | `/run-cpp` | Public | `CodeExecutionController.runCpp()` | Body: `JSON` | `String` | 200, 400, 401, 403, 500 |
| `POST` | `/run-java` | Public | `CodeExecutionController.runJava()` | Body: `JSON` | `String` | 200, 400, 401, 403, 500 |
| `POST` | `/run-javascript` | Public | `CodeExecutionController.runJavaScript()` | Body: `JSON` | `String` | 200, 400, 401, 403, 500 |
| `POST` | `/run-python` | Public | `CodeExecutionController.runPython()` | Body: `JSON` | `String` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/coding/question/{id}` | Authenticated User (JWT) | `LegacyExamSessionController.updateCodingQuestion()` | Body: `Map<String, Object>` | PathVar: `id` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/notifications/mark-all-read` | Authenticated User (JWT) | `NotificationController.markAllAsRead()` | None | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/notifications/{id}/read` | Authenticated User (JWT) | `NotificationController.markAsRead()` | None | PathVar: `id` | `NotificationResponse` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/teacher/exams/{examId}` | Authenticated User (JWT) | `TeacherController.updateExam()` | Body: `CreateExamRequest` | PathVar: `examId` | `ExamResponse` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/users/approve/{id}` | Authenticated User (JWT) | `LegacyCompatibilityController.approveUser()` | None | PathVar: `id` | `?` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/users/exam/questions/{questionId}` | Authenticated User (JWT) | `LegacyExamSessionController.updateQuestion()` | Body: `Map<String, Object>` | PathVar: `questionId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/users/exam/{examId}` | Authenticated User (JWT) | `LegacyExamSessionController.updateLegacyExam()` | Body: `Map<String, Object>` | PathVar: `examId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/users/profile` | Authenticated User (JWT) | `LegacyCompatibilityController.updateProfile()` | Body: `Map<String, Object>` | `?` | 200, 400, 401, 403, 500 |
| `PUT` | `/api/users/results/{resultId}/toggle-visibility` | Public | `LegacyExamSessionController.toggleResultVisibility()` | None | PathVar: `resultId` | `Map<String, Object` | 200, 400, 401, 403, 500 |
| `PUT` | `/attempts/{attemptId}/autosave` | Authenticated User (JWT) | `StudentController.autosaveAnswers()` | Body: `SaveAnswersRequest` | PathVar: `attemptId` | `Void` | 200, 400, 401, 403, 500 |