# Configuration and Environment Variables Inventory

Audit analysis of all backend and frontend configuration keys, environment variables, secret storage, gitignore coverage, and security assessment.

---

## 1. Backend Environment Variables (`backend-spring`)

| Variable Name | Default / Fallback Value | Defined In | Used In | In `.env.example` | Gitignored | Security & Hardcoding Status |
|---|---|---|---|---|---|---|
| `SERVER_PORT` | `5000` | `application.properties`, `.env` | Embedded Tomcat HTTP Port | Yes | Yes (`.env`, `application.properties`) | Safe. Configurable port. |
| `DB_HOST` | `localhost` | `application.properties`, `.env` | MySQL JDBC URL host | Yes | Yes | Safe. |
| `DB_PORT` | `3306` | `application.properties`, `.env` | MySQL JDBC URL port | Yes | Yes | Safe. |
| `DB_NAME` | `ai_eval8_db` | `application.properties`, `.env` | MySQL JDBC Database name | Yes | Yes | Safe. Dedicated application schema. |
| `DB_USER` | `root` | `application.properties`, `.env` | MySQL DataSource Username | Yes | Yes | Safe via `.env`. Local dev defaults provided. |
| `DB_PASSWORD` | `root` | `application.properties`, `.env` | MySQL DataSource Password | Yes | Yes | Default provided for local development; override in production `.env`. |
| `JWT_SECRET` | `9a7c3b2e8d1f4a5c6b7e8d9a0b1c...` | `application.properties`, `.env` | `JwtTokenProvider.java` (HMAC-SHA256 signature) | Yes | Yes | Valid 256-bit hexadecimal key. Should be replaced in production environments. |
| `JWT_EXPIRATION_MS` | `86400000` (24h) | `application.properties` | `JwtTokenProvider.java` | Yes | Yes | Safe. Standard 24-hour token lifetime. |
| `spring.servlet.multipart.max-file-size` | `50MB` | `application.properties` | Spring Web Multipart Resolver | N/A | Yes | Safe. Allows proctoring base64/evidence upload payloads up to 50MB. |

---

## 2. Frontend Configuration & Constants (`frontend`)

| Config Object / Constant | Value / Definition | Defined In | Used In | Purpose & Scope |
|---|---|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:5000` (proxy: `package.json`) | `.env.example`, `package.json` | `axiosInstance.js`, `apiSlice.js` | Directs API queries to backend. Proxy configured to `http://localhost:5000`. |
| `PROCTORING_CONFIG.CHECK_INTERVAL_MS` | `250` (4 frames/sec) | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Frame check rate for MediaPipe / COCO-SSD inference. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.HEAD_MOVEMENT` | `2000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Head yaw/pitch turn must persist > 2.0s before violation event. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.EYE_GAZE` | `2000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Iris looking away from screen > 2.0s before violation event. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.NO_FACE` | `2500` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | No person detected in frame > 2.5s. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.MULTIPLE_FACES` | `2000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Multiple faces detected in frame > 2.0s. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.CELL_PHONE` | `2000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Mobile phone detected > 2.0s. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.LAPTOP` | `2000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Secondary laptop detected > 2.0s. |
| `PROCTORING_CONFIG.SUSTAINED_DURATIONS.EXTERNAL_VOICE` | `1000` ms | `frontend/src/config/proctoring.js` | `AudioMonitor.jsx` | Sustained audio above speech threshold > 1.0s. |
| `PROCTORING_CONFIG.COOLDOWNS.HEAD_MOVEMENT` | `6000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate head turn events. |
| `PROCTORING_CONFIG.COOLDOWNS.EYE_GAZE` | `6000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate eye gaze events. |
| `PROCTORING_CONFIG.COOLDOWNS.CELL_PHONE` | `8000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate cell phone events. |
| `PROCTORING_CONFIG.COOLDOWNS.LAPTOP` | `8000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate laptop events. |
| `PROCTORING_CONFIG.COOLDOWNS.NO_FACE` | `8000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate no face events. |
| `PROCTORING_CONFIG.COOLDOWNS.MULTIPLE_FACES` | `8000` ms | `frontend/src/config/proctoring.js` | `WebCam.jsx` | Throttle duplicate multi face events. |
| `PROCTORING_CONFIG.COOLDOWNS.EXTERNAL_VOICE` | `10000` ms | `frontend/src/config/proctoring.js` | `AudioMonitor.jsx` | Throttle duplicate external voice events. |
| `PROCTORING_CONFIG.COOLDOWNS.FULLSCREEN_EXIT` | `3000` ms | `frontend/src/config/proctoring.js` | `BrowserMonitor.jsx` | Throttle duplicate fullscreen exit events. |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MOBILE_PHONE` | `50` points | `frontend/src/config/proctoring.js` | `ProctoringManager.jsx`, `Coder.jsx` | Point deduction for cell phone / laptop detection. |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MULTIPLE_FACES` | `30` points | `frontend/src/config/proctoring.js` | `ProctoringManager.jsx`, `Coder.jsx` | Point deduction for multiple faces detected. |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.NO_PERSON` | `20` points | `frontend/src/config/proctoring.js` | `ProctoringManager.jsx`, `Coder.jsx` | Point deduction for no person visible in frame. |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_FREE_WARNINGS` | `10` warnings | `frontend/src/config/proctoring.js` | `ProctoringManager.jsx`, `Coder.jsx` | First 10 head/gaze alerts are free warnings (0 deduction). |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_PENALTY_POINTS` | `5` points | `frontend/src/config/proctoring.js` | `ProctoringManager.jsx`, `Coder.jsx` | Deducted starting from 11th head/eye warning. |
| `PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.EXTERNAL_VOICE` | `0` points | `frontend/src/config/proctoring.js` | `AudioMonitor.jsx`, `ProctoringManager.jsx` | Warning-only violation (0 point deduction). |
| `PROCTORING_CONFIG.AUDIO.NOISE_THRESHOLD` | `0.15` RMS | `frontend/src/config/proctoring.js` | `AudioMonitor.jsx` | Background noise detection floor. |
| `PROCTORING_CONFIG.AUDIO.SPEECH_THRESHOLD` | `0.30` RMS | `frontend/src/config/proctoring.js` | `AudioMonitor.jsx` | Speech / external voice detection threshold. |

---

## 3. Gitignore and Secrets Audit

1. **`.env` Exclusion**: `.env` is properly listed in the root `.gitignore` file and is never committed to git.
2. **`.env.example` Presence**: Created in project root containing sanitized placeholder configuration.
3. **Application Properties**: `application.properties` uses Spring property placeholders (`${VAR:default}`) with sensible defaults so that local development works immediately, while production environments can override all database credentials and JWT keys securely via environment variables.
4. **No Third-Party Cloud API Secrets Required**: The proctoring system runs completely locally on client-side Web Audio API, TensorFlow.js / COCO-SSD, MediaPipe Face Mesh, and Java compilation runtime. No third-party commercial cloud APIs (AWS, OpenAI, etc.) with billing tokens are embedded or required.
