/**
 * AudioMonitor — Uses Web Audio API to detect background noise
 * and speech during an exam.
 *
 * Non-visual component (no UI). Runs local audio analysis only —
 * no audio is uploaded or streamed.
 *
 * Features:
 * - Safe optional chaining on all configuration keys
 * - Warning-only violation handling (0 points deducted)
 * - Cooldown throttling to prevent duplicate alerts
 * - Full resource cleanup (tracks stopped, AudioContext closed, interval cleared)
 */
import { useEffect, useRef, useCallback } from 'react';
import PROCTORING_CONFIG from '../../../config/proctoring';

export default function AudioMonitor({ onViolation, isActive }) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const lastEventTime = useRef({});
  const errorLoggedRef = useRef(false);

  const throttle = useCallback((eventType) => {
    try {
      const now = Date.now();
      const cooldownMap =
        PROCTORING_CONFIG?.COOLDOWNS ||
        PROCTORING_CONFIG?.cooldowns ||
        {};
      const cooldown = cooldownMap[eventType] ?? 10000;
      const lastTime = lastEventTime.current[eventType] || 0;
      if (now - lastTime < cooldown) return false;
      lastEventTime.current[eventType] = now;
      return true;
    } catch {
      return true;
    }
  }, []);

  const emit = useCallback(
    (eventType, confidence, metadata = {}) => {
      if (!isActive) return;
      if (!throttle(eventType)) return;
      try {
        if (typeof onViolation === 'function') {
          onViolation({
            eventType,
            confidence: confidence ?? 1.0,
            description: metadata.description || `${eventType.replace(/_/g, ' ')} detected by audio monitor`,
            metadata,
          });
        }
      } catch (err) {
        console.warn('[AudioMonitor] Error dispatching violation:', err);
      }
    },
    [isActive, onViolation, throttle],
  );

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    const startAudioMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
          return;
        }

        streamRef.current = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('[AudioMonitor] Web Audio API is not supported in this browser.');
          return;
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        // Safe resolution of thresholds from shared config
        const audioCfg = PROCTORING_CONFIG?.AUDIO || PROCTORING_CONFIG?.audio || {};
        const voiceCfg = audioCfg?.EXTERNAL_VOICE || {};
        const noiseCfg = audioCfg?.BACKGROUND_NOISE || {};

        const SPEECH_THRESHOLD = voiceCfg?.THRESHOLD ?? audioCfg?.SPEECH_THRESHOLD ?? 0.30;
        const NOISE_THRESHOLD = noiseCfg?.THRESHOLD ?? audioCfg?.NOISE_THRESHOLD ?? 0.15;
        const ANALYSIS_INTERVAL = audioCfg?.ANALYSIS_INTERVAL ?? 1000;
        const SUSTAINED_SPEECH_COUNT = Math.max(1, Math.round((voiceCfg?.SUSTAINED_MS ?? 1000) / ANALYSIS_INTERVAL));

        let sustainedCount = 0;

        // Clear any previous interval before starting
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        timerRef.current = setInterval(() => {
          try {
            if (cancelled || !isActive) return;

            analyser.getFloatTimeDomainData(dataArray);

            // Calculate RMS amplitude
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
              sumSquares += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sumSquares / bufferLength);

            if (rms >= SPEECH_THRESHOLD) {
              sustainedCount++;
              if (sustainedCount >= SUSTAINED_SPEECH_COUNT) {
                const confidence = Math.min(1.0, Math.max(0.6, rms / 0.5));
                emit('EXTERNAL_VOICE', confidence, {
                  rms: rms.toFixed(4),
                  sustainedCount,
                  threshold: SPEECH_THRESHOLD,
                  points: 0,
                  description: 'External voice / speech detected during exam',
                });
                sustainedCount = 0;
              }
            } else if (rms >= NOISE_THRESHOLD) {
              sustainedCount = Math.max(0, sustainedCount - 1);
              const confidence = Math.min(1.0, Math.max(0.4, rms / 0.4));
              emit('BACKGROUND_NOISE', confidence, {
                rms: rms.toFixed(4),
                threshold: NOISE_THRESHOLD,
                points: 0,
                description: 'Elevated background noise detected',
              });
            } else {
              sustainedCount = 0;
            }
          } catch (err) {
            if (!errorLoggedRef.current) {
              console.warn('[AudioMonitor] Error processing audio frame:', err);
              errorLoggedRef.current = true;
            }
          }
        }, ANALYSIS_INTERVAL);

        console.log('[AudioMonitor] Audio monitoring started');
      } catch (err) {
        console.warn('[AudioMonitor] Could not access microphone:', err.message);
      }
    };

    startAudioMonitoring();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
        } catch (_) {}
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (_) {}
        streamRef.current = null;
      }
      analyserRef.current = null;
      console.log('[AudioMonitor] Audio monitoring stopped and resources cleaned up');
    };
  }, [isActive, emit]);

  return null;
}
