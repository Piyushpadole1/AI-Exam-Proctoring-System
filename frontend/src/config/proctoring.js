// ─── Frontend Proctoring Configuration ──────────────────────────────────────
// Configurable constants for Head Movement, Eye Gaze, Audio, and 100-Point Integrity Rules.

const PROCTORING_CONFIG = {
  // Detection Frame Rate: 8-10 checks per second (~100-120ms interval for immediate detection)
  CHECK_INTERVAL_MS: 120,
  OBJECT_CHECK_INTERVAL_MS: 100, // Fast 10 checks per second for mobile phone / secondary laptop

  // Initial Calibration Duration: 2 seconds of looking straight at the screen
  CALIBRATION_DURATION_MS: 2000,

  // Downward gaze policy: Allowed for desk, keyboard, notes, writing. Zero warning, zero penalty.
  ALLOW_DOWNWARD_GAZE: true,

  // Biometric Face Identity Verification Configuration
  FACE_VERIFICATION: {
    ENABLED: true,
    INTERVAL_MS: 12000,                  // Continuous re-check every 12 seconds
    MATCH_THRESHOLD: 0.40,              // Strict Euclidean distance threshold (distance < 0.40 is match, >= 0.40 is mismatch)
    MAX_CONSECUTIVE_MISMATCHES: 3,       // 3 mismatches in a row terminates exam
    PRE_EXAM_MAX_RETRY_ATTEMPTS: 3,     // Allowed live verification retries before exam start
    POINTS_DEDUCTED_PER_MISMATCH: 30,   // Point deduction per face mismatch
    COOLDOWN_MS: 12000,
  },

  // Sustained Detection Durations (ms) - condition confirmation before firing look-away/anomalies
  SUSTAINED_DURATIONS: {
    HEAD_MOVEMENT: 1200,           // Head turn/tilt confirmed in ~1.2 seconds
    HEAD_TURNED: 1200,
    EYE_GAZE: 1200,                // Eyes looking away confirmed in ~1.2 seconds
    EYE_GAZE_AWAY: 1200,
    PROLONGED_LOOKING_AWAY: 1200,  // Continuous looking away confirmed in ~1.2 seconds
    DOWNWARD_GAZE_MAX: 0,          // Downward gaze never flags a violation (fully allowed)
    FACE_MISMATCH: 500,            // Face identity mismatch confirmed in ~500ms
    NO_FACE: 1000,                 // No person in frame confirmed in 1.0s
    NO_FACE_DETECTED: 1000,
    MULTIPLE_FACES: 500,           // Multiple faces confirmed in ~500ms
    CELL_PHONE: 0,                 // Instant detection on confident frame (1 frame if >=0.50, 2 frames if >=0.38)
    CELL_PHONE_DETECTED: 0,
    LAPTOP: 0,                     // Instant detection on confident frame
    LAPTOP_DETECTED: 0,
    EXTERNAL_VOICE: 500,           // Sustained speech confirmed in ~500ms
    BACKGROUND_NOISE: 800,
    SPEECH_DETECTED: 500,
  },

  // Event Cooldowns (ms) - minimum delay before logging another event of the same type
  COOLDOWNS: {
    HEAD_MOVEMENT: 5000,
    HEAD_TURNED: 5000,
    EYE_GAZE: 5000,
    EYE_GAZE_AWAY: 5000,
    GAZE_DEVIATION: 5000,
    PROLONGED_LOOKING_AWAY: 5000,
    DOWNWARD_GAZE: 5000,
    FACE_MISMATCH: 12000,
    CELL_PHONE: 6000,
    CELL_PHONE_DETECTED: 6000,
    LAPTOP: 6000,
    LAPTOP_DETECTED: 6000,
    NO_FACE: 6000,
    NO_FACE_DETECTED: 6000,
    MULTIPLE_FACES: 6000,
    FULLSCREEN_EXIT: 3000,
    TAB_SWITCH: 3000,
    WINDOW_BLUR: 3000,
    EXTERNAL_VOICE: 8000,
    BACKGROUND_NOISE: 8000,
    AUDIO_NOISE: 8000,
    SPEECH_DETECTED: 8000,
    COPY_PASTE: 5000,
    CLIPBOARD_COPY_PASTE: 5000,
    KEYBOARD_SHORTCUT: 5000,
  },

  // Configurable Calibrated Head & Gaze Angle / Ratio Thresholds (relative to baseline)
  THRESHOLDS: {
    // Yaw (Head turn left/right): horizontal angle deviation from calibrated baseline
    HEAD_YAW_DEVIATION: 0.18,

    // Pitch (Head tilt up/down): vertical angle deviation from calibrated baseline
    HEAD_PITCH_DEVIATION: 0.14,

    // Eye Gaze: horizontal iris position deviation from calibrated baseline
    EYE_GAZE_HORIZONTAL_DEVIATION: 0.16,

    // Eye Gaze: vertical iris deviation from calibrated baseline (looking down at desk/phone)
    EYE_GAZE_VERTICAL_DEVIATION: 0.16,

    // Tolerance added to yaw when student is looking down (writing/typing at desk)
    DOWNWARD_YAW_TOLERANCE: 0.05,

    // Absolute fallback limits (if calibration is pending)
    EYE_GAZE_MIN_RATIO: 0.28,
    EYE_GAZE_MAX_RATIO: 0.72,
    EYE_GAZE_VERTICAL_TOLERANCE: 0.25,
  },

  // 100-Point Integrity Scoring System
  INTEGRITY_SYSTEM: {
    STARTING_SCORE: 100,

    DEDUCTIONS: {
      MOBILE_PHONE: 50,
      CELL_PHONE: 50,
      CELL_PHONE_DETECTED: 50,
      LAPTOP: 50,
      LAPTOP_DETECTED: 50,
      FACE_MISMATCH: 30,
      UNAUTHORIZED_PERSON: 30,
      MULTIPLE_FACES: 30,
      NO_PERSON: 20,
      NO_FACE: 20,
      NO_FACE_DETECTED: 20,

      // Head movement, eye gaze, or prolonged looking-away (left, right, or up):
      // First 10 warnings are free (warning only, no deduction)
      HEAD_GAZE_FREE_WARNINGS: 10,
      // From the 11th onward: 5 points each
      HEAD_GAZE_PENALTY_POINTS: 5,

      // Downward glance (keyboard, desk, writing): 0 points deducted, no warning
      DOWNWARD_GAZE: 0,

      // Audio violations: warning only (0 points deducted)
      EXTERNAL_VOICE: 0,
      BACKGROUND_NOISE: 0,
      AUDIO_NOISE: 0,
      SPEECH_DETECTED: 0,
    },

    FULLSCREEN: {
      FIRST_WARNING: true,
      MAX_EXITS_ALLOWED: 1, // 2nd exit terminates exam immediately
    },
  },

  // Audio proctoring thresholds & configurations
  AUDIO: {
    NOISE_THRESHOLD: 0.15,
    SPEECH_THRESHOLD: 0.30,
    ANALYSIS_INTERVAL: 1000,
    SUSTAINED_DURATION: 1000,
    COOLDOWN: 10000,
    POINTS: 0, // Warning-only (0 points deducted)
    EXTERNAL_VOICE: {
      THRESHOLD: 0.30,
      SUSTAINED_MS: 1000,
      COOLDOWN_MS: 10000,
      POINTS: 0,
    },
    BACKGROUND_NOISE: {
      THRESHOLD: 0.15,
      SUSTAINED_MS: 2000,
      COOLDOWN_MS: 10000,
      POINTS: 0,
    },
  },
};

// Backward-compatible lowercase aliases to ensure no property access ever fails
PROCTORING_CONFIG.faceVerification = PROCTORING_CONFIG.FACE_VERIFICATION;
PROCTORING_CONFIG.downwardGazeMaxDurationMs = PROCTORING_CONFIG.DOWNWARD_GAZE_MAX_DURATION_MS;
PROCTORING_CONFIG.cooldowns = PROCTORING_CONFIG.COOLDOWNS;
PROCTORING_CONFIG.sustainedDurations = PROCTORING_CONFIG.SUSTAINED_DURATIONS;
PROCTORING_CONFIG.thresholds = PROCTORING_CONFIG.THRESHOLDS;
PROCTORING_CONFIG.audio = PROCTORING_CONFIG.AUDIO;
PROCTORING_CONFIG.audio.EXTERNAL_VOICE = PROCTORING_CONFIG.AUDIO.EXTERNAL_VOICE;
PROCTORING_CONFIG.audio.BACKGROUND_NOISE = PROCTORING_CONFIG.AUDIO.BACKGROUND_NOISE;

export default PROCTORING_CONFIG;
