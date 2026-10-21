package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.config.ProctoringConstants;
import com.aieval8.examproctoring.entity.ProctoringEvent;
import com.aieval8.examproctoring.entity.ViolationSeverity;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ScoringEngineService {

    private static final Map<String, ViolationSeverity> SEVERITIES = Map.ofEntries(
            Map.entry("TAB_SWITCH", ViolationSeverity.HIGH),
            Map.entry("WINDOW_BLUR", ViolationSeverity.MEDIUM),
            Map.entry("FULLSCREEN_EXIT", ViolationSeverity.CRITICAL),
            Map.entry("NO_FACE_DETECTED", ViolationSeverity.HIGH),
            Map.entry("NO_FACE", ViolationSeverity.HIGH),
            Map.entry("MULTIPLE_FACES", ViolationSeverity.CRITICAL),
            Map.entry("CELL_PHONE_DETECTED", ViolationSeverity.CRITICAL),
            Map.entry("CELL_PHONE", ViolationSeverity.CRITICAL),
            Map.entry("FACE_MISMATCH", ViolationSeverity.CRITICAL),
            Map.entry("UNAUTHORIZED_PERSON", ViolationSeverity.CRITICAL),
            Map.entry("LAPTOP_DETECTED", ViolationSeverity.CRITICAL),
            Map.entry("LAPTOP", ViolationSeverity.CRITICAL),
            Map.entry("BOOK_DETECTED", ViolationSeverity.HIGH),
            Map.entry("PROHIBITED_OBJECT", ViolationSeverity.HIGH),
            Map.entry("HEAD_TURNED", ViolationSeverity.MEDIUM),
            Map.entry("HEAD_MOVEMENT", ViolationSeverity.MEDIUM),
            Map.entry("EYE_GAZE_AWAY", ViolationSeverity.MEDIUM),
            Map.entry("EYE_GAZE", ViolationSeverity.MEDIUM),
            Map.entry("GAZE_DEVIATION", ViolationSeverity.MEDIUM),
            Map.entry("PROLONGED_LOOKING_AWAY", ViolationSeverity.MEDIUM),
            Map.entry("EXTERNAL_VOICE", ViolationSeverity.LOW),
            Map.entry("VOICE_DETECTED", ViolationSeverity.LOW),
            Map.entry("BACKGROUND_NOISE", ViolationSeverity.LOW),
            Map.entry("AUDIO_NOISE", ViolationSeverity.LOW),
            Map.entry("SPEECH_DETECTED", ViolationSeverity.LOW),
            Map.entry("COPY_PASTE", ViolationSeverity.MEDIUM),
            Map.entry("CLIPBOARD_COPY_PASTE", ViolationSeverity.MEDIUM),
            Map.entry("RIGHT_CLICK", ViolationSeverity.LOW),
            Map.entry("KEYBOARD_SHORTCUT", ViolationSeverity.MEDIUM)
    );

    public boolean isHeadOrGaze(String eventType) {
        if (eventType == null) return false;
        String u = eventType.toUpperCase();
        // Downward gaze has 0 penalty and is never counted as an anomaly
        if (u.contains("DOWNWARD")) return false;
        return u.contains("HEAD") || u.contains("GAZE") || u.contains("LOOKING_AWAY");
    }

    public boolean isFullscreenOrBlur(String eventType) {
        if (eventType == null) return false;
        String u = eventType.toUpperCase();
        return u.contains("FULLSCREEN") || u.contains("TAB_SWITCH") || u.contains("WINDOW_BLUR");
    }

    public boolean isAudio(String eventType) {
        if (eventType == null) return false;
        String u = eventType.toUpperCase();
        return u.contains("VOICE") || u.contains("AUDIO") || u.contains("SPEECH") || u.contains("NOISE");
    }

    /**
     * Computes the point deduction for a specific event based on historical violations.
     *
     * @param eventType the type of violation
     * @param warningNumber for head/gaze: 1-indexed warning count
     * @param fullscreenExitCount prior fullscreen exit count
     * @return points to deduct from integrity score (0 to 50)
     */
    public int computeDeduction(String eventType, int warningNumber, int fullscreenExitCount) {
        if (eventType == null) return 0;
        String u = eventType.toUpperCase();

        if (u.contains("DOWNWARD")) {
            // Strictly 0 deduction for looking downward
            return 0;
        } else if (u.contains("CELL") || u.contains("PHONE") || u.contains("LAPTOP")) {
            return ProctoringConstants.DEDUCTION_CELL_PHONE; // 50 points
        } else if (u.contains("MISMATCH") || u.contains("UNAUTHORIZED")) {
            return ProctoringConstants.DEDUCTION_FACE_MISMATCH; // 30 points
        } else if (u.contains("MULTIPLE")) {
            return ProctoringConstants.DEDUCTION_MULTIPLE_FACES; // 30 points
        } else if (u.contains("NO_FACE") || u.contains("NOT_VISIBLE")) {
            return ProctoringConstants.DEDUCTION_NO_FACE; // 20 points
        } else if (isHeadOrGaze(eventType)) {
            // First 10 warnings are free (warning only, 0 deduction). From 11th onward, -5 points each.
            if (warningNumber <= ProctoringConstants.HEAD_GAZE_FREE_WARNINGS) {
                return 0;
            } else {
                return ProctoringConstants.HEAD_GAZE_PENALTY_POINTS; // 5 points
            }
        } else if (isFullscreenOrBlur(eventType)) {
            // First time: warning only. Second time: terminates immediately.
            return 0;
        } else if (isAudio(eventType)) {
            // Audio events (EXTERNAL_VOICE, BACKGROUND_NOISE, etc.) are warning-only (0 points deducted)
            return ProctoringConstants.DEDUCTION_EXTERNAL_VOICE; // 0 points
        } else {
            // Other minor violations (shortcuts, copy-paste)
            return 5;
        }
    }

    public ViolationSeverity getSeverity(String eventType) {
        return SEVERITIES.getOrDefault(eventType != null ? eventType.toUpperCase() : "", ViolationSeverity.LOW);
    }

    public String classifyIntegrityScore(double integrityScore) {
        if (integrityScore >= 70.0) return "SAFE";
        if (integrityScore >= 30.0) return "WARNING";
        return "MALPRACTICE";
    }

    public boolean shouldTerminate(double integrityScore, int fullscreenExits) {
        return integrityScore <= 0.0 || fullscreenExits >= 2;
    }
}
