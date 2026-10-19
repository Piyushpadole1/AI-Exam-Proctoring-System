# Real-Time Channels & Streaming Inventory

Audit analysis of all Server-Sent Events (SSE), event emitters, RTK Query short-polling streams, local hardware detection loops, and client-server scoping.

---

## 1. Server-Sent Events (SSE) Channels

| Channel / Route | Direction | Publisher / Trigger | Subscriber | Payload Shape | Scoping & Privacy |
|---|---|---|---|---|---|
| `/api/notifications/stream` | Server -> Client | `NotificationService.createNotification()` (Enrollment requests, Teacher approvals, Exam results, Proctoring alerts) | `Header.js` (EventSource listener) | JSON `NotificationResponse`: `{ id, type, title, message, relatedExamId, relatedRequestId, link, isRead, createdAt }` | Strictly scoped by `userId` (authenticated user JWT). Each user receives only notifications addressed to them. |

---

## 2. Real-Time Short Polling Streams (RTK Query & Axios)

| Route / Stream | Polling Interval | Calling Component | Consumer View | Response Payload Shape | Security Scoping |
|---|---|---|---|---|---|
| `/api/admin/active-sessions` | 3,000 ms (3 seconds) | `LiveMonitoringPage.jsx` | Teacher Live Monitoring Panel | Array of `{ _id, studentId: { name, email }, examName, examCode, status, timeLeftSeconds, totalViolations, fairnessScore, integrityScore, classification, verdict, latestViolation }` | Scoped to teacher: only sessions for exams owned by the authenticated teacher are returned. |
| `/api/admin/logs?examId={id}` | 3,000 ms (3 seconds) | `ExamLogPage.jsx` | Teacher Proctoring Logs & Evidence Stream | Array of `{ id, timestamp, eventType, severity, penaltyPoints, description, evidenceUrl, confidence, studentName, studentEmail, examCode, examName }` | Scoped to teacher: only events belonging to teacher's exams are returned. |
| `/api/cheating-logs/{examId}` | 3,000 ms (3 seconds) | `CheatingTable.jsx` | Teacher Cheating Summary Table | Array of `{ _id, examId, username, email, noFaceCount, multipleFaceCount, cellPhoneCount, prohibitedObjectCount, totalViolations, fairnessScore, integrityScore, screenshots }` | Scoped to teacher: verified via teacher exam ownership check. |
| `/api/notifications/unread-count` | 10,000 ms (10 seconds) | `Header.js` | Bell Icon Badge in App Bar | `{ unreadCount: <number> }` | Scoped to authenticated user ID. |

---

## 3. Local Real-Time Edge Processing Loops (Browser Client)

| Detector Loop | Check Interval | Component | Model / Engine | Emitted Event Type | Cooldown & Throttle |
|---|---|---|---|---|---|
| Video Object Detection | 250 ms (4 checks/sec) | `WebCam.jsx` | TensorFlow.js COCO-SSD | `CELL_PHONE_DETECTED`, `LAPTOP_DETECTED` | 2000ms sustained persistence, 8000ms cooldown |
| Video Face & Pose Detection | 250 ms (4 checks/sec) | `WebCam.jsx` | MediaPipe Face Mesh (468 landmarks + iris) | `NO_FACE_DETECTED` (>2.5s), `MULTIPLE_FACES` (>2.0s), `HEAD_MOVEMENT` (>2.0s yaw/pitch), `EYE_GAZE` (>2.0s gaze deviation) | 6000ms-8000ms cooldown per type |
| Web Audio API Monitor | 1,000 ms (1 check/sec) | `AudioMonitor.jsx` | Web Audio AnalyserNode (RMS calculation) | `EXTERNAL_VOICE` (RMS >= 0.30), `BACKGROUND_NOISE` (RMS >= 0.15) | 1000ms sustained duration, 10000ms cooldown |
| Browser Focus & Fullscreen Monitor | Event-driven (`blur`, `visibilitychange`, `fullscreenchange`, `copy`, `paste`) | `BrowserMonitor.jsx` | DOM Events | `FULLSCREEN_EXIT`, `TAB_SWITCH`, `WINDOW_BLUR`, `COPY_PASTE` | 3000ms cooldown |

---

## 4. Teardown & Lifecycle Verification

1. **Camera Tracks**: `WebCam.jsx` registers track stop handlers on unmount and when exam ends: `stream.getTracks().forEach(t => t.stop())`.
2. **Audio Context**: `AudioMonitor.jsx` cleanly closes `AudioContext` and stops microphone stream tracks on unmount: `audioContext.close()`.
3. **Intervals**: All polling timers and detection intervals store timer IDs in `useRef` and execute `clearInterval(ref.current)` in cleanup returns.
4. **SSE Connections**: `EventSource` in `Header.js` closes via `es.close()` when user logs out or switches accounts.
