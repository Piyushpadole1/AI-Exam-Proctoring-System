package com.aieval8.examproctoring.service;

import com.aieval8.examproctoring.entity.ProctoringEvent;
import com.aieval8.examproctoring.entity.ViolationSeverity;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ScoringEngineService {

    private static final Map<String, Integer> PENALTIES = Map.ofEntries(
            Map.entry("TAB_SWITCH", 10),
            Map.entry("WINDOW_BLUR", 5),
            Map.entry("FULLSCREEN_EXIT", 100),
            Map.entry("NO_FACE_DETECTED", 10),
            Map.entry("MULTIPLE_FACES", 25),
            Map.entry("CELL_PHONE_DETECTED", 25),
            Map.entry("BOOK_DETECTED", 15),
            Map.entry("LAPTOP_DETECTED", 15),
            Map.entry("PROHIBITED_OBJECT", 15),
            Map.entry("GAZE_DEVIATION", 10),
            Map.entry("BACKGROUND_NOISE", 5),
            Map.entry("SPEECH_DETECTED", 10),
            Map.entry("COPY_PASTE", 10),
            Map.entry("RIGHT_CLICK", 5),
            Map.entry("KEYBOARD_SHORTCUT", 10)
    );

    private static final Map<String, ViolationSeverity> SEVERITIES = Map.ofEntries(
            Map.entry("TAB_SWITCH", ViolationSeverity.MEDIUM),
            Map.entry("WINDOW_BLUR", ViolationSeverity.LOW),
            Map.entry("FULLSCREEN_EXIT", ViolationSeverity.HIGH),
            Map.entry("NO_FACE_DETECTED", ViolationSeverity.MEDIUM),
            Map.entry("MULTIPLE_FACES", ViolationSeverity.HIGH),
            Map.entry("CELL_PHONE_DETECTED", ViolationSeverity.HIGH),
            Map.entry("BOOK_DETECTED", ViolationSeverity.MEDIUM),
            Map.entry("LAPTOP_DETECTED", ViolationSeverity.MEDIUM),
            Map.entry("PROHIBITED_OBJECT", ViolationSeverity.MEDIUM),
            Map.entry("GAZE_DEVIATION", ViolationSeverity.LOW),
            Map.entry("BACKGROUND_NOISE", ViolationSeverity.LOW),
            Map.entry("SPEECH_DETECTED", ViolationSeverity.MEDIUM),
            Map.entry("COPY_PASTE", ViolationSeverity.MEDIUM),
            Map.entry("RIGHT_CLICK", ViolationSeverity.LOW),
            Map.entry("KEYBOARD_SHORTCUT", ViolationSeverity.MEDIUM)
    );

    public int getPenaltyPoints(String eventType) {
        return PENALTIES.getOrDefault(eventType, 5);
    }

    public ViolationSeverity getSeverity(String eventType) {
        return SEVERITIES.getOrDefault(eventType, ViolationSeverity.LOW);
    }

    public double calculateEventScore(List<ProctoringEvent> violations) {
        if (violations == null || violations.isEmpty()) return 0.0;
        int totalPenalty = 0;
        for (ProctoringEvent v : violations) {
            totalPenalty += v.getPenaltyPoints() != null ? v.getPenaltyPoints() : 0;
        }
        return Math.min(100.0, Math.max(0.0, totalPenalty));
    }

    public double calculateAIBehaviorScore(List<ProctoringEvent> violations) {
        if (violations == null || violations.isEmpty()) return 0.0;

        // Feature 1: Frequency
        double frequencyScore = Math.min(100.0, violations.size() * 15.0);

        // Feature 2: Severity distribution
        int low = 0, med = 0, high = 0, crit = 0;
        for (ProctoringEvent v : violations) {
            if (v.getSeverity() == ViolationSeverity.LOW) low++;
            else if (v.getSeverity() == ViolationSeverity.MEDIUM) med++;
            else if (v.getSeverity() == ViolationSeverity.HIGH) high++;
            else if (v.getSeverity() == ViolationSeverity.CRITICAL) crit++;
        }
        double severityScore = Math.min(100.0, low * 5.0 + med * 15.0 + high * 30.0 + crit * 50.0);

        // Feature 3: Confidence
        double avgConf = violations.stream()
                .mapToDouble(v -> v.getConfidence() != null ? v.getConfidence() : 0.5)
                .average().orElse(0.5);
        double confidenceScore = avgConf * 100.0;

        // Feature 4: Event diversity
        long uniqueTypes = violations.stream().map(ProctoringEvent::getEventType).distinct().count();
        double diversityScore = Math.min(100.0, (uniqueTypes / 5.0) * 100.0);

        // Feature 5: Repetition
        Map<String, Integer> counts = new HashMap<>();
        for (ProctoringEvent v : violations) {
            counts.put(v.getEventType(), counts.getOrDefault(v.getEventType(), 0) + 1);
        }
        int maxRepeat = counts.values().stream().max(Integer::compareTo).orElse(1);
        double repetitionScore = Math.min(100.0, (maxRepeat / 3.0) * 100.0);

        double composite = frequencyScore * 0.25
                + severityScore * 0.30
                + confidenceScore * 0.15
                + diversityScore * 0.15
                + repetitionScore * 0.15;

        return Math.min(100.0, Math.max(0.0, Math.round(composite)));
    }

    public double calculateHybridScore(double eventScore, double aiScore) {
        double hybrid = eventScore * 0.6 + aiScore * 0.4;
        return Math.min(100.0, Math.max(0.0, Math.round(hybrid)));
    }

    public String classify(double hybridScore) {
        if (hybridScore <= 29.0) return "SAFE";
        if (hybridScore <= 69.0) return "WARNING";
        return "MALPRACTICE";
    }

    public boolean shouldTerminate(double hybridScore) {
        return hybridScore >= 70.0;
    }
}
