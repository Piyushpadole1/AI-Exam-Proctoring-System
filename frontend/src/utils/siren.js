/**
 * Web Audio API Siren / Alarm Synthesizer for Exam Proctoring Violations
 * Completely self-contained, no external audio files or URLs needed.
 * Handles browser autoplay policy via unlockAudio().
 * Non-overlapping, automatically stops after 2.5 seconds.
 */

let audioCtx = null;
let isPlaying = false;
let stopTimer = null;

export const unlockAudio = () => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (err) {
    console.warn('[Siren] Failed to initialize AudioContext:', err);
  }
};

export const playSiren = () => {
  if (isPlaying) {
    // Avoid overlapping sounds
    return;
  }

  unlockAudio();

  if (!audioCtx) {
    console.warn('[Siren] AudioContext unavailable');
    return;
  }

  try {
    isPlaying = true;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    // Set initial volume
    gainNode.gain.setValueAtTime(0.18, now);

    // Alternate frequency (two-tone proctoring siren: 750Hz and 1100Hz)
    const duration = 2.4; // seconds
    const interval = 0.25; // 250ms per tone
    let t = now;

    for (let i = 0; i < Math.floor(duration / interval); i++) {
      const freq = i % 2 === 0 ? 750 : 1100;
      osc.frequency.setValueAtTime(freq, t);
      t += interval;
    }

    // Fade out at end to avoid speaker click
    gainNode.gain.setValueAtTime(0.18, now + duration - 0.15);
    gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (e) {}
      isPlaying = false;
    };

    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      isPlaying = false;
    }, duration * 1000 + 100);
  } catch (err) {
    console.warn('[Siren] Error playing alarm sound:', err);
    isPlaying = false;
  }
};

export const stopSiren = () => {
  isPlaying = false;
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
};
