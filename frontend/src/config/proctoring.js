// ─── Frontend Proctoring Configuration ──────────────────────────────────────
// Configurable constants for Head Movement, Eye Gaze, Audio, and 100-Point Integrity Rules.

const PROCTORING_CONFIG = {
  // Detection Frame Rate: 5 to 7 checks per second (150ms interval for near-instant detection)
  CHECK_INTERVAL_MS: 150,

  // Initial Calibration Duration: 2 seconds of looking straight at the screen
  CALIBRATION_DURATION_MS: 2000,

  // Sustained Detection Durations (ms) - condition must persist before firing
  SUSTAINED_DURATIONS: {
    HEAD_MOVEMENT: 1500,   // Head turn/tilt > 1.5 seconds
    HEAD_TURNED: 1500,
    EYE_GAZE: 1500,        // Eyes looking away > 1.5 seconds
    EYE_GAZE_AWAY: 1500,
    NO_FACE: 2000,         // No person in frame > 2.0 seconds
    NO_FACE_DETECTED: 2000,
    MULTIPLE_FACES: 2000,  // Multiple faces > 2.0 seconds
    CELL_PHONE: 1800,      // Mobile phone visible > 1.8 seconds
    CELL_PHONE_DETECTED: 1800,
    LAPTOP: 1800,          // Secondary laptop visible > 1.8 seconds
    LAPTOP_DETECTED: 1800,
    EXTERNAL_VOICE: 1000,  // Sustained speech / external voice > 1 second
    BACKGROUND_NOISE: 2000,
    SPEECH_DETECTED: 1000,
  },

  // Event Cooldowns (ms) - minimum delay before logging another event of the same type
  COOLDOWNS: {
    HEAD_MOVEMENT: 5000,
    HEAD_TURNED: 5000,
    EYE_GAZE: 5000,
    EYE_GAZE_AWAY: 5000,
    GAZE_DEVIATION: 5000,
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
    // Yaw (Head turn left/right): deviation from calibrated baseline
    HEAD_YAW_DEVIATION: 0.15,

    // Pitch (Head tilt up/down): vertical deviation from calibrated baseline
    HEAD_PITCH_DEVIATION: 0.14,

    // Eye Gaze: horizontal iris position deviation from calibrated baseline
    EYE_GAZE_HORIZONTAL_DEVIATION: 0.18,

    // Eye Gaze: vertical iris deviation from calibrated baseline
    EYE_GAZE_VERTICAL_DEVIATION: 0.20,

    // Absolute fallback limits (if calibration is pending)
    EYE_GAZE_MIN_RATIO: 0.26,
    EYE_GAZE_MAX_RATIO: 0.74,
    EYE_GAZE_VERTICAL_TOLERANCE: 0.28,
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
      MULTIPLE_FACES: 30,
      NO_PERSON: 20,
      NO_FACE: 20,
      NO_FACE_DETECTED: 20,

      // Head movement or eye gaze:
      // First 10 warnings are free (warning only, no deduction)
      HEAD_GAZE_FREE_WARNINGS: 10,
      // From the 11th onward: 5 points each
      HEAD_GAZE_PENALTY_POINTS: 5,

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
PROCTORING_CONFIG.cooldowns = PROCTORING_CONFIG.COOLDOWNS;
PROCTORING_CONFIG.sustainedDurations = PROCTORING_CONFIG.SUSTAINED_DURATIONS;
PROCTORING_CONFIG.thresholds = PROCTORING_CONFIG.THRESHOLDS;
PROCTORING_CONFIG.audio = PROCTORING_CONFIG.AUDIO;
PROCTORING_CONFIG.audio.EXTERNAL_VOICE = PROCTORING_CONFIG.AUDIO.EXTERNAL_VOICE;
PROCTORING_CONFIG.audio.BACKGROUND_NOISE = PROCTORING_CONFIG.AUDIO.BACKGROUND_NOISE;

export default PROCTORING_CONFIG;
