/**
 * ProctoringManager — 100-Point Integrity Proctoring System Orchestrator:
 *   - Live 100-point integrity score display
 *   - Head/Eye gaze warning tracker (first 10 free, 11th+ -5 pts)
 *   - Fullscreen lock enforcement (1st strike = warning modal, 2nd = termination)
 *   - Web Audio API alarm siren on violation
 *   - Sustained detection & cooldown handling
 *   - Backend validation & synchronization
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Fullscreen as FullscreenIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import BrowserMonitor from './BrowserMonitor';
import AudioMonitor from './AudioMonitor';
import WebCam from './WebCam';
import axiosInstance from '../../../axios';
import PROCTORING_CONFIG from '../../../config/proctoring';
import { playSiren } from '../../../utils/siren';
import { toast } from 'react-toastify';

export default function ProctoringManager({
  sessionId,
  examId,
  webcamRef,
  isActive,
  onTerminate,
  cheatingLog,
  updateCheatingLog,
}) {
  const [integrityScore, setIntegrityScore] = useState(100);
  const [headGazeCount, setHeadGazeCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [classification, setClassification] = useState('SAFE');
  const [isTerminated, setIsTerminated] = useState(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const isTerminatedRef = useRef(isTerminated);
  useEffect(() => {
    isTerminatedRef.current = isTerminated;
  }, [isTerminated]);

  const integrityScoreRef = useRef(100);
  const headGazeCountRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const totalViolationsRef = useRef(0);
  const onTerminateRef = useRef(onTerminate);
  useEffect(() => {
    onTerminateRef.current = onTerminate;
  }, [onTerminate]);

  // Real-time WebSocket connection and offline retry queue
  const wsRef = useRef(null);
  const pendingQueueRef = useRef([]);

  const handleBackendUpdate = useCallback((data) => {
    if (!data) return;
    const backendScore =
      data.integrityScore !== undefined
        ? Number(data.integrityScore)
        : data.fairnessScore !== undefined
        ? Number(data.fairnessScore)
        : null;

    if (backendScore !== null) {
      integrityScoreRef.current = backendScore;
      setIntegrityScore(backendScore);
      setClassification(
        data.classification ||
          (backendScore >= 70 ? 'SAFE' : backendScore >= 30 ? 'WARNING' : 'MALPRACTICE')
      );
    }

    if (data.totalViolations !== undefined) {
      totalViolationsRef.current = Number(data.totalViolations);
      setTotalViolations(totalViolationsRef.current);
    }

    if (data.shouldTerminate || (backendScore !== null && backendScore <= 0)) {
      if (!isTerminatedRef.current) {
        setIsTerminated(true);
        isTerminatedRef.current = true;
        const termReason = data.terminationReason || 'Integrity score reached 0';
        toast.error(`Exam Terminated: ${termReason}`);
        if (onTerminateRef.current) {
          onTerminateRef.current(termReason);
        }
      }
    }
  }, []);

  const dispatchReport = useCallback(
    async (payload) => {
      let sentViaWs = false;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ action: 'VIOLATION', ...payload }));
          sentViaWs = true;
        } catch (wsErr) {
          console.warn('[ProctoringManager] WS send error, falling back to HTTP:', wsErr);
        }
      }

      if (!sentViaWs) {
        try {
          const res = await axiosInstance.post('/api/proctoring/events', payload, {
            withCredentials: true,
          });
          if (res?.data) {
            handleBackendUpdate(res.data);
          }
        } catch (httpErr) {
          console.warn('[ProctoringManager] HTTP report failed, queued for retry:', httpErr.message);
          pendingQueueRef.current.push(payload);
        }
      }
    },
    [handleBackendUpdate]
  );

  const flushPendingQueue = useCallback(async () => {
    if (pendingQueueRef.current.length === 0) return;
    const queued = [...pendingQueueRef.current];
    pendingQueueRef.current = [];
    for (const item of queued) {
      await dispatchReport(item);
    }
  }, [dispatchReport]);

  // Connect to persistent WebSocket with automatic reconnect and queue flush
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.port === '3000'
          ? `${window.location.hostname}:5000`
          : window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws/proctoring`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[ProctoringManager] Connected to real-time WebSocket');
          flushPendingQueue();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'VIOLATION_ACK') {
              handleBackendUpdate(data);
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          wsRef.current = null;
          reconnectTimeout = setTimeout(() => {
            if (isActiveRef.current && !isTerminatedRef.current) {
              connectWS();
            }
          }, 2000);
        };

        ws.onerror = () => {
          // Graceful fallback to HTTP
        };
      } catch (err) {
        console.warn('[ProctoringManager] WebSocket setup:', err.message);
      }
    };

    connectWS();

    const handleOnline = () => {
      flushPendingQueue();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
      wsRef.current = null;
    };
  }, [flushPendingQueue, handleBackendUpdate]);

  // Decoupled asynchronous background evidence upload
  const uploadEvidence = useCallback(
    async (violationId, screenshot) => {
      if (!violationId || !screenshot) return;
      const activeSessionId = sessionIdRef.current || sessionId;
      if (!activeSessionId) return;

      try {
        await axiosInstance.post(
          '/api/proctoring/evidence',
          {
            violationId,
            sessionId: activeSessionId,
            evidenceUrl: screenshot,
          },
          { withCredentials: true }
        );
      } catch (e) {
        console.warn('[ProctoringManager] Decoupled evidence upload note:', e.message);
      }
    },
    [sessionId]
  );

  const terminateSession = useCallback(
    (reason) => {
      if (isTerminatedRef.current) return;
      setIsTerminated(true);
      isTerminatedRef.current = true;
      const termReason = reason || 'Exam terminated due to violations';
      toast.error(`Exam Terminated: ${termReason}`);
      if (onTerminateRef.current) {
        onTerminateRef.current(termReason);
      }
    },
    []
  );

  useEffect(() => {
    window.__uploadProctoringEvidence = uploadEvidence;
    window.__terminateExamSession = terminateSession;
    return () => {
      if (window.__uploadProctoringEvidence === uploadEvidence) {
        delete window.__uploadProctoringEvidence;
      }
      if (window.__terminateExamSession === terminateSession) {
        delete window.__terminateExamSession;
      }
    };
  }, [uploadEvidence, terminateSession]);

  // ── Restore live score and violations from backend on mount or page refresh ──
  useEffect(() => {
    if (!sessionId) return;
    let isSubscribed = true;

    const restoreSessionStatus = async () => {
      try {
        const res = await axiosInstance.get(`/api/proctoring/sessions/${sessionId}/status`, {
          withCredentials: true,
        });
        if (!isSubscribed || !res?.data) return;

        const data = res.data;
        const restoredScore =
          data.integrityScore !== undefined
            ? Number(data.integrityScore)
            : data.fairnessScore !== undefined
            ? Number(data.fairnessScore)
            : 100;

        integrityScoreRef.current = restoredScore;
        setIntegrityScore(restoredScore);

        if (data.headGazeCount !== undefined) {
          headGazeCountRef.current = Number(data.headGazeCount);
          setHeadGazeCount(Number(data.headGazeCount));
        }

        if (data.fullscreenExits !== undefined) {
          fullscreenExitsRef.current = Number(data.fullscreenExits);
          setFullscreenExits(Number(data.fullscreenExits));
        }

        if (data.totalViolations !== undefined) {
          totalViolationsRef.current = Number(data.totalViolations);
          setTotalViolations(Number(data.totalViolations));
        }

        if (data.classification) {
          setClassification(data.classification);
        }

        if (data.isTerminated || data.shouldTerminate) {
          setIsTerminated(true);
          isTerminatedRef.current = true;
          const reason = data.terminationReason || 'Integrity score reached 0';
          if (onTerminateRef.current) {
            onTerminateRef.current(reason);
          }
        }
      } catch (err) {
        console.warn('[ProctoringManager] Could not restore session status on mount:', err.message);
      }
    };

    restoreSessionStatus();
    return () => {
      isSubscribed = false;
    };
  }, [sessionId]);

  // Handle Fullscreen Exit Modal Prompt
  const handleFullscreenWarning = useCallback((strike) => {
    if (strike === 1) {
      setFullscreenPromptOpen(true);
    }
  }, []);

  const handleReEnterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn('[ProctoringManager] Fullscreen request error:', err);
    }
    setFullscreenPromptOpen(false);
  };

  // ── Handle Violations from WebCam, BrowserMonitor, AudioMonitor ──
  const handleViolation = useCallback(
    async (violation) => {
      const activeSessionId = sessionIdRef.current || sessionId;
      if (!activeSessionId || !isActiveRef.current || isTerminatedRef.current) return;

      const eventType = violation.eventType || '';

      // Downward gaze (keyboard/desk/paper/writing): Strictly zero warning, zero siren, zero deduction
      if (eventType.toUpperCase().includes('DOWNWARD')) {
        return;
      }

      // 1. Play Siren Alert immediately (< 5ms)
      playSiren();

      const isHeadGaze =
        eventType.includes('HEAD') || eventType.includes('GAZE') || eventType.includes('LOOKING_AWAY');
      const isFullscreen =
        eventType.includes('FULLSCREEN') ||
        eventType.includes('TAB_SWITCH') ||
        eventType.includes('WINDOW_BLUR');

      // 2. Update local counters using refs to avoid stale closures
      let nextHeadGaze = headGazeCountRef.current;
      if (isHeadGaze) {
        nextHeadGaze += 1;
        headGazeCountRef.current = nextHeadGaze;
        setHeadGazeCount(nextHeadGaze);
      }

      let nextFullscreen = fullscreenExitsRef.current;
      if (isFullscreen) {
        nextFullscreen += 1;
        fullscreenExitsRef.current = nextFullscreen;
        setFullscreenExits(nextFullscreen);
      }

      // 3. Calculate client-side tentative deduction for instant HUD update
      let localDeduction = 0;
      if (eventType.includes('CELL') || eventType.includes('PHONE') || eventType.includes('LAPTOP')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MOBILE_PHONE || 50; // 50
      } else if (eventType.includes('MISMATCH') || eventType.includes('UNAUTHORIZED')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.FACE_MISMATCH || 30;
      } else if (eventType.includes('MULTIPLE')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MULTIPLE_FACES || 30; // 30
      } else if (eventType.includes('NO_FACE') || eventType.includes('NOT_VISIBLE')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.NO_PERSON || 20; // 20
      } else if (isHeadGaze) {
        const freeLimit = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_FREE_WARNINGS || 10;
        const penalty = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_PENALTY_POINTS || 5;
        if (nextHeadGaze > freeLimit) {
          localDeduction = penalty;
        }
      }

      const currentScore = integrityScoreRef.current;
      const tentativeScore = Math.max(0, currentScore - localDeduction);
      integrityScoreRef.current = tentativeScore;
      setIntegrityScore(tentativeScore);

      totalViolationsRef.current += 1;
      setTotalViolations(totalViolationsRef.current);

      // 4. Display Warning Message with detailed count/deduction instantly (< 5ms)
      let displayMsg = '';
      if (isHeadGaze) {
        const freeLimit = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_FREE_WARNINGS || 10;
        const penalty = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_PENALTY_POINTS || 5;
        if (nextHeadGaze <= freeLimit) {
          displayMsg = `⚠️ Warning ${nextHeadGaze} of ${freeLimit}: ${violation.description || 'Looking away from screen'}`;
        } else {
          displayMsg = `🚨 Warning ${nextHeadGaze}: Looking away penalty! (${penalty} points deducted)`;
        }
      } else if (eventType.includes('MISMATCH') || eventType.includes('UNAUTHORIZED')) {
        displayMsg = `🚨 Face Mismatch: ${violation.description || 'Unrecognized face detected'} (-${localDeduction} points deducted)`;
      } else if (isFullscreen) {
        if (nextFullscreen === 1) {
          displayMsg = '⚠️ Fullscreen Exit Warning (1 of 2): Return to fullscreen immediately!';
        } else {
          displayMsg = '🚨 Exam Disqualified: Fullscreen exit limit exceeded (2/2)!';
        }
      } else if (localDeduction > 0) {
        displayMsg = `⚠️ ${violation.description || eventType.replace(/_/g, ' ')} (-${localDeduction} points deducted)`;
      } else {
        displayMsg = `⚠️ Warning: ${violation.description || eventType.replace(/_/g, ' ')}`;
      }

      toast.warn(displayMsg);

      // Generate client-side UUID for idempotency
      const violationId =
        violation.violationId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

      // 5. Send lightweight violation event first (< 10ms) without heavy screenshot
      const lightweightPayload = {
        violationId,
        sessionId: activeSessionId,
        eventType: violation.eventType,
        confidence: violation.confidence || 1.0,
        description: violation.description || displayMsg,
        evidenceUrl: null,
        metadata: {
          ...violation.metadata,
          warningNumber: isHeadGaze ? nextHeadGaze : null,
          fullscreenStrike: isFullscreen ? nextFullscreen : null,
        },
      };

      // Dispatch immediately over WebSocket (with HTTP fallback and offline queue)
      dispatchReport(lightweightPayload);

      // 6. Decoupled evidence upload: if screenshot is available or can be captured, send in background
      const rawScreenshot = violation.evidenceUrl || violation.screenshot;
      if (rawScreenshot) {
        setTimeout(() => {
          uploadEvidence(violationId, rawScreenshot);
        }, 30);
      } else if (typeof violation.captureScreenshot === 'function') {
        setTimeout(() => {
          try {
            const sc = violation.captureScreenshot();
            if (sc) uploadEvidence(violationId, sc);
          } catch (_) {}
        }, 30);
      }

      // Check local immediate disqualification conditions
      if ((tentativeScore <= 0 || (isFullscreen && nextFullscreen >= 2)) && !isTerminatedRef.current) {
        setIsTerminated(true);
        isTerminatedRef.current = true;
        const termReason = tentativeScore <= 0 ? 'Integrity score reached 0' : 'Left fullscreen twice';
        toast.error(`Exam Terminated: ${termReason}`);
        if (onTerminateRef.current) onTerminateRef.current(termReason);
      }
    },
    [sessionId, dispatchReport, uploadEvidence]
  );

  const getScoreColor = () => {
    if (integrityScore >= 70) return 'success';
    if (integrityScore >= 30) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Visual WebCam HUD and Head/Gaze Tracker */}
      <WebCam webcamRef={webcamRef} onViolation={handleViolation} />

      {/* Invisible Monitors */}
      <BrowserMonitor
        onViolation={handleViolation}
        isActive={isActive && !isTerminated}
        onFullscreenWarning={handleFullscreenWarning}
      />
      <AudioMonitor onViolation={handleViolation} isActive={isActive && !isTerminated} />

      {/* Live Integrity Score & Violations HUD */}
      <Box sx={{ p: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip
            icon={<ShieldIcon />}
            label={`Integrity: ${integrityScore}/100`}
            color={getScoreColor()}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip
            icon={<VisibilityIcon />}
            label={`Head/Eye: ${headGazeCount}/10 warnings`}
            color={headGazeCount > 10 ? 'error' : headGazeCount > 5 ? 'warning' : 'default'}
            size="small"
          />
          <Chip
            icon={<FullscreenIcon />}
            label={`Fullscreen Exits: ${fullscreenExits}/2`}
            color={fullscreenExits >= 2 ? 'error' : fullscreenExits === 1 ? 'warning' : 'default'}
            size="small"
          />
          {totalViolations > 0 && (
            <Chip
              label={`Violations: ${totalViolations}`}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
          <Chip
            label={`Status: ${classification}`}
            color={getScoreColor()}
            size="small"
            variant="outlined"
          />
        </Stack>

        {isTerminated && (
          <Alert severity="error" sx={{ mt: 1 }}>
            <strong>Exam Disqualified</strong> — Your exam has been automatically ended due to integrity rules violation.
          </Alert>
        )}
      </Box>

      {/* First Fullscreen Exit Warning Prompt Dialog */}
      <Dialog
        open={fullscreenPromptOpen && !isTerminated}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: '#d97706', fontWeight: 'bold' }}>
          ⚠️ Fullscreen Exit Warning (1 of 2)
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" mb={2}>
            You have left fullscreen mode or switched windows.
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={2}>
            You must remain in fullscreen mode for the entire duration of the examination. 
            <b> A second exit will result in immediate disqualification and auto-submission of your exam.</b>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleReEnterFullscreen}
            sx={{ py: 1.2, fontWeight: 'bold' }}
          >
            Re-enter Fullscreen & Continue Exam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
