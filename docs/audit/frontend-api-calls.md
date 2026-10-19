# Frontend API Calls Inventory

Comprehensive inventory of all frontend API calls (RTK Query endpoints & axiosInstance calls), their calling components, payloads, response handling, and targeted backend endpoints.

| Calling Component / File | HTTP Method | Target URL / Path | Payload / Query | Response Handling | Backend Target Endpoint |
|---|---|---|---|---|---|
| `layouts\full\header\Header.js` | `GET` | `/api/notifications/unread-count` | `None` | Local Component State / Toast | `/api/notifications/unread-count` |
| `layouts\full\header\Header.js` | `GET` | `/api/notifications?limit=10` | `None` | Local Component State / Toast | `/api/notifications?limit=10` |
| `layouts\full\header\Header.js` | `PUT` | `/api/notifications/${notif.id}/read` | `None` | Local Component State / Toast | `/api/notifications/${notif.id}/read` |
| `layouts\full\header\Header.js` | `PUT` | `/api/notifications/mark-all-read` | `None` | Local Component State / Toast | `/api/notifications/mark-all-read` |
| `views\student\CodeDetails.jsx` | `GET` | `/api/users/exam` | `{ withCredentials: true }` | Local Component State / Toast | `/api/users/exam` |
| `views\student\Coder.jsx` | `GET` | `/api/coding/questions/exam/${examId}` | `None` | Local Component State / Toast | `/api/coding/questions/exam/${examId}` |
| `views\student\Coder.jsx` | `GET` | `/api/students/active-attempt/${examId}` | `None` | Local Component State / Toast | `/api/students/active-attempt/${examId}` |
| `views\student\Coder.jsx` | `GET` | `/api/users/exam/${examId}` | `None` | Local Component State / Toast | `/api/users/exam/${examId}` |
| `views\student\Coder.jsx` | `POST` | `/api/coding/run` | `payload` | Local Component State / Toast | `/api/coding/run` |
| `views\student\Coder.jsx` | `POST` | `/api/coding/submit` | `payload` | Local Component State / Toast | `/api/coding/submit` |
| `views\student\Coder.jsx` | `POST` | `/api/coding/submit` | `{ code: currentCode` | Local Component State / Toast | `/api/coding/submit` |
| `views\student\Coder.jsx` | `POST` | `/api/coding/submit` | `{ examId` | Local Component State / Toast | `/api/coding/submit` |
| `views\student\Coder.jsx` | `POST` | `/api/proctoring/events` | `{ sessionId: sessionId || examId` | Local Component State / Toast | `/api/proctoring/events` |
| `views\student\Components\MultipleChoiceQuestion.jsx` | `GET` | `/api/users/exam/${examId}` | `None` | Local Component State / Toast | `/api/users/exam/${examId}` |
| `views\student\Components\MultipleChoiceQuestion.jsx` | `PUT` | `/api/sessions/${sessionId}/autosave` | `{ answers: updated }` | Local Component State / Toast | `/api/sessions/${sessionId}/autosave` |
| `views\student\Components\ProctoringManager.jsx` | `POST` | `/api/proctoring/events` | `payload` | Local Component State / Toast | `/api/proctoring/events` |
| `views\student\ExamDetails.jsx` | `POST` | `/api/sessions/verify-access` | `{ examId` | Local Component State / Toast | `/api/sessions/verify-access` |
| `views\student\ExamDetails.jsx` | `POST` | `/api/users/exam/${examId}/request-enrollment` | `{}` | Local Component State / Toast | `/api/users/exam/${examId}/request-enrollment` |
| `views\student\ResultPage.jsx` | `GET` | `/api/users/exam` | `None` | Local Component State / Toast | `/api/users/exam` |
| `views\student\ResultPage.jsx` | `GET` | `/api/users/results/${attemptId}/detailed-report` | `None` | Local Component State / Toast | `/api/users/results/${attemptId}/detailed-report` |
| `views\student\ResultPage.jsx` | `GET` | `/api/users/results/all` | `None` | Local Component State / Toast | `/api/users/results/all` |
| `views\student\ResultPage.jsx` | `GET` | `/api/users/results/exam/${examId}` | `None` | Local Component State / Toast | `/api/users/results/exam/${examId}` |
| `views\student\ResultPage.jsx` | `GET` | `/api/users/results/user` | `None` | Local Component State / Toast | `/api/users/results/user` |
| `views\student\ResultPage.jsx` | `PUT` | `/api/users/results/${resultId}/toggle-visibility` | `None` | Local Component State / Toast | `/api/users/results/${resultId}/toggle-visibility` |
| `views\student\StudentDashboard.jsx` | `GET` | `/api/student/dashboard` | `{ withCredentials: true }` | Local Component State / Toast | `/api/student/dashboard` |
| `views\student\StudentDashboard.jsx` | `GET` | `/api/users/student/dashboard` | `{ withCredentials: true }` | Local Component State / Toast | `/api/users/student/dashboard` |
| `views\student\TestPage.jsx` | `POST` | `/api/users/results` | `{ examId` | Local Component State / Toast | `/api/users/results` |
| `views\teacher\CreateExamPage.jsx` | `POST` | `/api/coding/question` | `codingQuestionData` | Local Component State / Toast | `/api/coding/question` |
| `views\teacher\TeacherExamsPage.jsx` | `DELETE` | `/api/users/exam/${examId}` | `None` | Local Component State / Toast | `/api/users/exam/${examId}` |
| `views\teacher\TeacherExamsPage.jsx` | `DELETE` | `/api/users/exam/questions/${questionId}` | `None` | Local Component State / Toast | `/api/users/exam/questions/${questionId}` |
| `views\teacher\TeacherExamsPage.jsx` | `GET` | `/api/coding/questions/exam/${idToQuery}` | `None` | Local Component State / Toast | `/api/coding/questions/exam/${idToQuery}` |
| `views\teacher\TeacherExamsPage.jsx` | `GET` | `/api/users/exam/questions/${examIdentifier}` | `None` | Local Component State / Toast | `/api/users/exam/questions/${examIdentifier}` |
| `views\teacher\TeacherExamsPage.jsx` | `GET` | `/api/users/exam` | `None` | Local Component State / Toast | `/api/users/exam` |
| `views\teacher\TeacherExamsPage.jsx` | `POST` | `/api/coding/question` | `{ examId: editExamData.id` | Local Component State / Toast | `/api/coding/question` |
| `views\teacher\TeacherExamsPage.jsx` | `POST` | `/api/users/exam/questions` | `{ examId: examIdentifier` | Local Component State / Toast | `/api/users/exam/questions` |
| `views\teacher\TeacherExamsPage.jsx` | `PUT` | `/api/users/exam/${editExamData.id}` | `payload` | Local Component State / Toast | `/api/users/exam/${editExamData.id}` |
| `views\teacher\TeacherExamsPage.jsx` | `PUT` | `/api/users/exam/questions/${qId}` | `{ question: questionFormData.question` | Local Component State / Toast | `/api/users/exam/questions/${qId}` |
| `views\teacher\UserApprovalsPage.jsx` | `DELETE` | `/api/users/exam/${selectedExamId}/unenroll-student/${studentId}` | `None` | Local Component State / Toast | `/api/users/exam/${selectedExamId}/unenroll-student/${studentId}` |
| `views\teacher\UserApprovalsPage.jsx` | `GET` | `/api/users/exam/${examCode}/enrolled-students` | `None` | Local Component State / Toast | `/api/users/exam/${examCode}/enrolled-students` |
| `views\teacher\UserApprovalsPage.jsx` | `GET` | `/api/users/students` | `None` | Local Component State / Toast | `/api/users/students` |
| `views\teacher\UserApprovalsPage.jsx` | `POST` | `/api/users/exam/${examCode}/approve-student/${studentId}` | `None` | Local Component State / Toast | `/api/users/exam/${examCode}/approve-student/${studentId}` |
| `views\teacher\UserApprovalsPage.jsx` | `POST` | `/api/users/exam/${examCode}/reject-student/${studentId}` | `None` | Local Component State / Toast | `/api/users/exam/${examCode}/reject-student/${studentId}` |
| `views\teacher\UserApprovalsPage.jsx` | `POST` | `/api/users/exam/${selectedExamId}/enroll-student` | `{ email: emailToEnroll.trim(` | Local Component State / Toast | `/api/users/exam/${selectedExamId}/enroll-student` |
| `views\teacher\UserApprovalsPage.jsx` | `POST` | `/api/users/exam/${selectedExamId}/enroll-student` | `{ studentId: student.id || student._id` | Local Component State / Toast | `/api/users/exam/${selectedExamId}/enroll-student` |
| `views\teacher\components\AddQuestionForm.jsx` | `DELETE` | `/api/users/exam/questions/${questionId}` | `{ withCredentials: true` | Local Component State / Toast | `/api/users/exam/questions/${questionId}` |
| `views\teacher\components\AddQuestionForm.jsx` | `GET` | `/api/users/exam/questions/${selectedExamId}` | `{ withCredentials: true` | Local Component State / Toast | `/api/users/exam/questions/${selectedExamId}` |