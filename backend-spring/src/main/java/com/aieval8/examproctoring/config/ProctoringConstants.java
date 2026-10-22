package com.aieval8.examproctoring.config;

public final class ProctoringConstants {

    private ProctoringConstants() {}

    // Base Integrity Score
    public static final double STARTING_INTEGRITY_SCORE = 100.0;

    // Deductions per violation
    public static final int DEDUCTION_CELL_PHONE = 50;
    public static final int DEDUCTION_LAPTOP = 50;
    public static final int DEDUCTION_MULTIPLE_FACES = 30;
    public static final int DEDUCTION_FACE_MISMATCH = 30;
    public static final int DEDUCTION_NO_FACE = 20;

    // Face identity verification rules
    public static final int MAX_CONSECUTIVE_FACE_MISMATCHES = 3;
    public static final long FACE_VERIFICATION_INTERVAL_MS = 12000L;
    public static final double FACE_VERIFICATION_DISTANCE_THRESHOLD = 0.40;

    // Head movement, Eye gaze & Prolonged Looking Away: 10 free warnings, 5 points each from 11th onward
    public static final int HEAD_GAZE_FREE_WARNINGS = 10;
    public static final int HEAD_GAZE_PENALTY_POINTS = 5;

    // Fullscreen rules: 1st time warning only, 2nd time immediate termination
    public static final int MAX_FULLSCREEN_EXITS_ALLOWED = 1;

    // Audio violations: Warning only, 0 points deducted
    public static final int DEDUCTION_EXTERNAL_VOICE = 0;
    public static final int DEDUCTION_BACKGROUND_NOISE = 0;

    // Sustained duration thresholds (in milliseconds)
    public static final long SUSTAINED_HEAD_GAZE_MS = 1200L;
    public static final long SUSTAINED_DOWNWARD_GAZE_MS = 0L; // Downward gaze has 0 penalty / never sustained violation
    public static final long SUSTAINED_NO_FACE_MS = 1000L;
    public static final long SUSTAINED_MULTIPLE_FACES_MS = 500L;
    public static final long SUSTAINED_OBJECT_MS = 0L; // Instant detection on confident frame (1-2 frames max)
    public static final long SUSTAINED_AUDIO_MS = 1000L;

    // Cooldown intervals (in milliseconds)
    public static final long COOLDOWN_HEAD_GAZE_MS = 6000L;
    public static final long COOLDOWN_OBJECT_MS = 8000L;
    public static final long COOLDOWN_FACE_MS = 8000L;
    public static final long COOLDOWN_FULLSCREEN_MS = 3000L;
    public static final long COOLDOWN_AUDIO_MS = 10000L;
}
