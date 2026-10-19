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

      // 1. Play Siren Alert immediately (< 10ms)
      playSiren();

      const eventType = violation.eventType;
      const isHeadGaze =
        eventType.includes('HEAD') || eventType.includes('GAZE');
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
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MOBILE_PHONE; // 50
      } else if (eventType.includes('MULTIPLE')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.MULTIPLE_FACES; // 30
      } else if (eventType.includes('NO_FACE') || eventType.includes('NOT_VISIBLE')) {
        localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.NO_PERSON; // 20
      } else if (isHeadGaze) {
        if (nextHeadGaze > PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_FREE_WARNINGS) {
          localDeduction = PROCTORING_CONFIG.INTEGRITY_SYSTEM.DEDUCTIONS.HEAD_GAZE_PENALTY_POINTS; // 5
        }
      }

      const currentScore = integrityScoreRef.current;
      const tentativeScore = Math.max(0, currentScore - localDeduction);
      integrityScoreRef.current = tentativeScore;
      setIntegrityScore(tentativeScore);

      totalViolationsRef.current += 1;
      setTotalViolations(totalViolationsRef.current);

      // 4. Display Warning Message with detailed count/deduction
      let displayMsg = '';
      if (isHeadGaze) {
        if (nextHeadGaze <= 10) {
          displayMsg = `⚠️ Warning ${nextHeadGaze} of 10: Head movement / eye gaze looking away`;
        } else {
          displayMsg = `⚠️ Warning ${nextHeadGaze}: Head/eye movement detected (5 points deducted)`;
        }
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
        (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      // 5. Send lightweight violation event first (< 20ms) without heavy screenshot
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

      // 6. Decoupled evidence upload: if screenshot exists, send asynchronously
      const rawScreenshot = violation.evidenceUrl || violation.screenshot;
      if (rawScreenshot) {
        setTimeout(async () => {
          try {
            await axiosInstance.post(
              '/api/proctoring/evidence',
              {
                violationId,
                sessionId: activeSessionId,
                evidenceUrl: rawScreenshot,
              },
              { withCredentials: true }
            );
          } catch (evidenceErr) {
            console.warn('[ProctoringManager] Asynchronous evidence upload note:', evidenceErr.message);
          }
        }, 50);
      }

      try {
        const response = await axiosInstance.post('/api/proctoring/events', lightweightPayload, {
          withCredentials: true,
        });

        if (response?.data) {
          const data = response.data;
          const backendScore =
            data.integrityScore !== undefined
              ? Number(data.integrityScore)
              : data.fairnessScore !== undefined
              ? Number(data.fairnessScore)
              : tentativeScore;

          integrityScoreRef.current = backendScore;
          setIntegrityScore(backendScore);
          setClassification(
            data.classification ||
              (backendScore >= 70 ? 'SAFE' : backendScore >= 30 ? 'WARNING' : 'MALPRACTICE')
          );

          if (data.totalViolations !== undefined) {
            totalViolationsRef.current = Number(data.totalViolations);
            setTotalViolations(totalViolationsRef.current);
          }

          // Termination check: score <= 0 or 2nd fullscreen exit
          const isTerm =
            data.shouldTerminate ||
            backendScore <= 0 ||
            (isFullscreen && nextFullscreen >= 2) ||
            violation.forceTerminate;

          if (isTerm && !isTerminatedRef.current) {
            setIsTerminated(true);
            isTerminatedRef.current = true;
            const termReason =
              violation.terminationReason ||
              data.terminationReason ||
              (backendScore <= 0 ? 'Integrity score reached 0' : 'Left fullscreen twice');

            toast.error(`Exam Terminated: ${termReason}`);
            if (onTerminateRef.current) {
              onTerminateRef.current(termReason);
            }
          }
        }
      } catch (err) {
        console.warn('[ProctoringManager] Backend event sync note:', err.message);
        // Fallback local termination
        if ((tentativeScore <= 0 || (isFullscreen && nextFullscreen >= 2)) && !isTerminatedRef.current) {
          setIsTerminated(true);
          isTerminatedRef.current = true;
          const termReason = tentativeScore <= 0 ? 'Integrity score reached 0' : 'Left fullscreen twice';
          if (onTerminateRef.current) onTerminateRef.current(termReason);
        }
      }
    },
    [sessionId]
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
