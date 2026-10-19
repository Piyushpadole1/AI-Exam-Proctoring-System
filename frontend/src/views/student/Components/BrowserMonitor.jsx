/**
 * BrowserMonitor — Enforces Fullscreen Lock and blocks evasive browser actions:
 *   - Detects leaving fullscreen (fullscreenchange / webkitfullscreenchange)
 *   - Detects window minimize / tab switch (visibilitychange)
 *   - Detects window blur
 *   - Fullscreen rule: 1st strike = warning modal with re-enter prompt, 2nd strike = immediate termination
 *   - Disables right-click, text selection, copy/paste, and navigation shortcuts
 */
import { useEffect, useRef, useCallback } from 'react';
import PROCTORING_CONFIG from '../../../config/proctoring';

export default function BrowserMonitor({ onViolation, isActive, onFullscreenWarning }) {
  const lastEventTime = useRef({});
  const fullscreenStrikeCount = useRef(0);
  const isEnforcingFullscreen = useRef(false);

  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const onFullscreenWarningRef = useRef(onFullscreenWarning);
  useEffect(() => {
    onFullscreenWarningRef.current = onFullscreenWarning;
  }, [onFullscreenWarning]);

  const throttle = useCallback((eventType) => {
    const now = Date.now();
    const cooldown = PROCTORING_CONFIG.COOLDOWNS[eventType] || 3000;
    const lastTime = lastEventTime.current[eventType] || 0;
    if (now - lastTime < cooldown) return false;
    lastEventTime.current[eventType] = now;
    return true;
  }, []);

  const handleFullscreenBreach = useCallback(
    (reason) => {
      if (!isActive) return;
      if (!throttle('FULLSCREEN_EXIT')) return;

      fullscreenStrikeCount.current += 1;
      const strike = fullscreenStrikeCount.current;
      const isSecondStrike = strike >= 2;

      console.warn(`[BrowserMonitor] Fullscreen breach detected (${reason}). Strike: ${strike}/2`);

      if (onViolationRef.current) {
        onViolationRef.current({
          eventType: 'FULLSCREEN_EXIT',
          confidence: 1.0,
          description: isSecondStrike
            ? 'Left fullscreen second time: Exam terminated immediately'
            : 'Left fullscreen or minimized window (Warning 1 of 1)',
          strike,
          forceTerminate: isSecondStrike,
          terminationReason: isSecondStrike ? 'Left fullscreen twice' : null,
          metadata: {
            reason,
            strike,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (onFullscreenWarningRef.current && !isSecondStrike) {
        onFullscreenWarningRef.current(strike);
      }
    },
    [isActive, throttle]
  );

  useEffect(() => {
    if (!isActive) return;

    // ── 1. Tab Switching & Window Minimizing (visibilitychange) ──────
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFullscreenBreach('Tab switched or browser minimized');
      }
    };

    // ── 2. Window Blur (Lost Window Focus) ───────────────────────────
    const handleBlur = () => {
      handleFullscreenBreach('Window lost focus / switched application');
    };

    // ── 3. Fullscreen Exit Event ─────────────────────────────────────
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFullscreen && isEnforcingFullscreen.current) {
        handleFullscreenBreach('Exited full screen mode');
      }
    };

    // ── 4. Disable Copy, Paste, Cut ──────────────────────────────────
    const handleCopy = (e) => {
      e.preventDefault();
      if (throttle('COPY_PASTE')) {
        onViolation?.({
          eventType: 'COPY_PASTE',
          confidence: 1.0,
          description: 'Copy attempt blocked',
        });
      }
    };

    const handlePaste = (e) => {
      e.preventDefault();
      if (throttle('COPY_PASTE')) {
        onViolation?.({
          eventType: 'COPY_PASTE',
          confidence: 1.0,
          description: 'Paste attempt blocked',
        });
      }
    };

    const handleCut = (e) => {
      e.preventDefault();
    };

    // ── 5. Disable Right-Click Context Menu ──────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // ── 6. Disable Text Selection ────────────────────────────────────
    const handleSelectStart = (e) => {
      // Allow inputs and textareas
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    // ── 7. Disable Navigation & Shortcut Keys ────────────────────────
    const handleKeyDown = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Block F11 (browser fullscreen toggle) and F12 (dev tools)
      if (e.key === 'F11' || e.key === 'F12') {
        e.preventDefault();
      }

      // Block Ctrl+W (close tab), Ctrl+T (new tab), Ctrl+N (new window)
      if (isCtrlOrMeta && ['w', 't', 'n', 'r', 'tab', 'u', 'p', 's'].includes(key)) {
        e.preventDefault();
      }

      // Block Alt+Tab or Alt+Left/Right
      if (e.altKey && (key === 'tab' || key === 'arrowleft' || key === 'arrowright')) {
        e.preventDefault();
      }
    };

    // Request fullscreen on mounting proctoring monitor
    const requestFullscreen = async () => {
      try {
        const el = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          }
        }
        isEnforcingFullscreen.current = true;
      } catch (err) {
        console.warn('[BrowserMonitor] Fullscreen initial request note:', err.message);
        isEnforcingFullscreen.current = true;
      }
    };

    requestFullscreen();

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('keydown', handleKeyDown, true);
      isEnforcingFullscreen.current = false;
    };
  }, [isActive, handleFullscreenBreach, onViolation, throttle]);

  return null;
}
