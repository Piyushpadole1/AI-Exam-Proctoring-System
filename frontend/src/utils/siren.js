/**
 * Web Audio API Siren / Alarm Synthesizer for Exam Proctoring Violations
 * Completely self-contained, no external audio files or URLs needed.
 * Two-tone proctoring siren: alternating 750Hz and 1100Hz.
 * Single siren sound only, non-overlapping, automatically stops after 2.4 seconds.
 */

let audioCtx = null;
let isPlaying = false;
let currentOsc = null;
let currentGain = null;
let stopTimer = null;
let lastPlayTime = 0;

export const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Prime context with a tiny silent buffer on user gesture
    if (ctx.state === 'running') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (e) {}
    }
  } catch (err) {}
};

// Global automatic unlock on ANY user gesture anywhere on the page
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown'];
  const handleInteraction = () => {
    unlockAudio();
    if (audioCtx && audioCtx.state === 'running') {
      unlockEvents.forEach((ev) => {
        window.removeEventListener(ev, handleInteraction, true);
        document.removeEventListener(ev, handleInteraction, true);
      });
    }
  };

  unlockEvents.forEach((ev) => {
    window.addEventListener(ev, handleInteraction, { capture: true, passive: true });
    document.addEventListener(ev, handleInteraction, { capture: true, passive: true });
  });
}

/**
 * Plays the single synthesized two-tone siren (750Hz / 1100Hz)
 */
export const playSiren = () => {
  const nowMs = Date.now();
  // Prevent duplicate or overlapping siren triggers within 2.4 seconds
  if (isPlaying || nowMs - lastPlayTime < 2400) {
    return;
  }
  lastPlayTime = nowMs;

  unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const startSound = () => {
    try {
      // Disconnect any existing node safely
      if (currentOsc) {
        try {
          currentOsc.stop();
          currentOsc.disconnect();
        } catch (e) {}
        currentOsc = null;
      }
      if (currentGain) {
        try {
          currentGain.disconnect();
        } catch (e) {}
        currentGain = null;
      }

      isPlaying = true;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      currentOsc = osc;
      currentGain = gainNode;

      // Original two-tone sawtooth wave siren
      osc.type = 'sawtooth';
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      const volume = 0.45; // Audible, comfortable volume level

      // Set initial volume
      gainNode.gain.setValueAtTime(volume, now);

      // Alternate frequency (two-tone proctoring siren: 750Hz and 1100Hz)
      const duration = 2.4; // seconds
      const interval = 0.25; // 250ms per tone
      let t = now;

      for (let i = 0; i < Math.floor(duration / interval); i++) {
        const freq = i % 2 === 0 ? 750 : 1100;
        osc.frequency.setValueAtTime(freq, t);
        t += interval;
      }

      // Smooth fade out at end to avoid speaker click
      gainNode.gain.setValueAtTime(volume, now + duration - 0.15);
      gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

      osc.start(now);
      osc.stop(now + duration);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch (e) {}
        currentOsc = null;
        currentGain = null;
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

  if (ctx.state === 'suspended') {
    ctx.resume()
      .then(() => {
        startSound();
      })
      .catch((err) => {
        console.warn('[Siren] Audio resume notice:', err);
        isPlaying = false;
      });
  } else {
    startSound();
  }
};

export const stopSiren = () => {
  isPlaying = false;
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (currentOsc) {
    try {
      currentOsc.stop();
      currentOsc.disconnect();
    } catch (e) {}
    currentOsc = null;
  }
  if (currentGain) {
    try {
      currentGain.disconnect();
    } catch (e) {}
    currentGain = null;
  }
};

if (typeof window !== 'undefined') {
  window.playSiren = playSiren;
  window.stopSiren = stopSiren;
  window.testSiren = () => {
    unlockAudio();
    playSiren();
  };
}
