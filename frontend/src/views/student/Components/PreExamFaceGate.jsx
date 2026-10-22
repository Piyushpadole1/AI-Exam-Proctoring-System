import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import Webcam from 'react-webcam';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import axiosInstance from '../../../axios';
import { loadFaceApiModels, analyzeFace } from '../../../utils/faceRecognition';
import PROCTORING_CONFIG from '../../../config/proctoring';

const MAX_ATTEMPTS = PROCTORING_CONFIG.FACE_VERIFICATION?.PRE_EXAM_MAX_RETRY_ATTEMPTS || 3;

const PreExamFaceGate = ({ studentName, studentId, examId, onVerified, onFailed, onBackToDashboard }) => {
  const webcamRef = useRef(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('IDLE'); // 'IDLE', 'CHECKING', 'SUCCESS', 'MISMATCH', 'LOCKED', 'NO_PROFILE'
  const [statusMessage, setStatusMessage] = useState('Position your face inside the oval and click Verify Identity.');

  useEffect(() => {
    let isMounted = true;

    // 1. Check if logged-in student has a registered face profile
    axiosInstance.get('/api/users/face-profile/status', { withCredentials: true })
      .then((res) => {
        if (isMounted) {
          if (!res.data.isFaceRegistered) {
            setStatus('NO_PROFILE');
            setStatusMessage('No biometric face profile found for your account. Please complete face registration before taking an exam.');
          }
        }
      })
      .catch((err) => {
        console.warn('[PreExamFaceGate] Profile status check notice:', err.message);
      });

    // 2. Load Face Models
    loadFaceApiModels()
      .then(() => {
        if (isMounted) setModelLoading(false);
      })
      .catch((err) => {
        console.error('[PreExamFaceGate] Failed to load models:', err);
        if (isMounted) {
          setModelLoading(false);
          setStatusMessage('Could not initialize biometric models. Please ensure camera access and refresh.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCaptureAndVerify = useCallback(async () => {
    if (!webcamRef.current) return;
    const video = webcamRef.current.video;
    if (!video || video.readyState < 2) {
      setStatusMessage('Camera feed not ready yet. Please wait a moment.');
      return;
    }

    try {
      setVerifying(true);
      setStatus('CHECKING');
      setVerificationProgress(10);
      setStatusMessage('Capturing Frame 1/4: Looking directly into camera...');

      const frames = [];
      const totalFramesToCapture = 4;

      for (let i = 0; i < totalFramesToCapture; i++) {
        if (i === 1) {
          setStatusMessage('Capturing Frame 2/4: Please blink naturally to confirm live presence...');
        } else if (i === 2) {
          setStatusMessage('Capturing Frame 3/4: Tracking facial biometrics...');
        } else if (i === 3) {
          setStatusMessage('Capturing Frame 4/4: Finalizing biometric vector extraction...');
        }

        const screenshot = webcamRef.current?.getScreenshot();
        if (!screenshot) {
          throw new Error('Failed to capture frame from webcam.');
        }

        // Run client-side face detection, landmarking, and 128-d vector extraction
        const analysis = await analyzeFace(screenshot);

        if (!analysis.success) {
          setVerifying(false);
          setStatus('MISMATCH');
          setStatusMessage(analysis.message);
          return;
        }

        frames.push({
          descriptor: analysis.descriptor,
          ear: analysis.ear || 0.3,
          nosePoint: analysis.nosePoint,
          screenshot,
        });

        setVerificationProgress(20 + (i + 1) * 18);
        if (i < totalFramesToCapture - 1) {
          await new Promise((r) => setTimeout(r, 280));
        }
      }

      // ── Liveness Check: Verify eye blink or facial micro-motion ───────────────
      const ears = frames.map((f) => f.ear);
      const minEAR = Math.min(...ears);
      const maxEAR = Math.max(...ears);
      const earDiff = maxEAR - minEAR;

      let noseDiff = 0;
      if (frames[0].nosePoint && frames[frames.length - 1].nosePoint) {
        noseDiff = Math.hypot(
          frames[0].nosePoint.x - frames[frames.length - 1].nosePoint.x,
          frames[0].nosePoint.y - frames[frames.length - 1].nosePoint.y
        );
      }

      // A static paper/screen photo exhibits near-zero landmark variation (< 0.018 EAR variation and < 1.5px movement)
      const livenessPassed = earDiff >= 0.018 || noseDiff >= 2.0;

      setStatusMessage('Authorizing biometrics with backend security gate...');
      setVerificationProgress(95);

      // Send live embeddings to backend authoritative gate
      const response = await axiosInstance.post(
        '/api/proctoring/pre-exam-verify',
        {
          examId: examId || '',
          liveEmbeddings: frames.map((f) => f.descriptor),
          evidenceScreenshot: frames[0].screenshot,
          livenessPassed,
        },
        { withCredentials: true }
      );

      const result = response.data;

      if (result.error === 'NO_FACE_PROFILE' || !result.registered) {
        setStatus('NO_PROFILE');
        setStatusMessage(result.message || 'No registered face profile found for your account. Please complete face registration.');
        setVerifying(false);
        return;
      }

      if (result.verified) {
        setStatus('SUCCESS');
        setStatusMessage(result.message || `Identity verified successfully! Confidence: ${result.confidence || 95}%. Initializing exam...`);
        setVerifying(false);
        setTimeout(() => {
          if (onVerified) onVerified(result);
        }, 1200);
      } else {
        const nextAttempts = result.attemptNumber || attempts + 1;
        setAttempts(nextAttempts);

        if (result.locked || nextAttempts >= MAX_ATTEMPTS) {
          setStatus('LOCKED');
          setStatusMessage(
            result.message || `Face verification failed ${MAX_ATTEMPTS} times. Access to this exam is locked. Please contact your instructor.`
          );
          if (onFailed) onFailed(result);
        } else {
          setStatus('MISMATCH');
          setStatusMessage(result.message);
        }
        setVerifying(false);
      }
    } catch (err) {
      console.error('[PreExamFaceGate] Verification error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Verification service failed.';
      setStatus('MISMATCH');
      setStatusMessage(`Verification error: ${errMsg}`);
      setVerifying(false);
    }
  }, [attempts, examId, onFailed, onVerified]);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="85vh"
      sx={{ p: 2, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}
    >
      <Card
        elevation={8}
        sx={{
          maxWidth: 620,
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid #e0e6ed',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            bgcolor: status === 'LOCKED' ? '#d32f2f' : status === 'SUCCESS' ? '#2e7d32' : '#1976d2',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background-color 0.3s ease',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VerifiedUserIcon fontSize="large" />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Biometric Identity Verification
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                AI-Evalu8 Multi-Frame Biometric Security Gate
              </Typography>
            </Box>
          </Stack>
          <Chip
            label={status === 'LOCKED' ? 'LOCKED' : `Attempt ${Math.min(attempts + 1, MAX_ATTEMPTS)} of ${MAX_ATTEMPTS}`}
            color={status === 'LOCKED' ? 'error' : status === 'SUCCESS' ? 'success' : 'default'}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
          />
        </Box>

        {(modelLoading || verifying) && (
          <LinearProgress
            color={status === 'SUCCESS' ? 'success' : 'primary'}
            variant={verifying ? 'determinate' : 'indeterminate'}
            value={verificationProgress}
          />
        )}

        <CardContent sx={{ p: 3 }}>
          <Box mb={2} textAlign="center">
            <Typography variant="body1" fontWeight={600} color="textPrimary">
              Student: {studentName || 'Student'} {studentId ? `(${studentId})` : ''}
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={0.5}>
              Look directly into the webcam and blink naturally so the AI proctor can confirm your identity before the exam begins.
            </Typography>
          </Box>

          {/* Live Camera View with Oval Guide */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 320,
              bgcolor: '#000',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
              mb: 2,
            }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              muted
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: 'user',
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Oval Alignment Frame */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '190px',
                height: '240px',
                border: `3px dashed ${
                  status === 'SUCCESS'
                    ? '#4caf50'
                    : status === 'MISMATCH' || status === 'LOCKED'
                    ? '#f44336'
                    : '#2196f3'
                }`,
                borderRadius: '50%',
                pointerEvents: 'none',
                boxShadow:
                  status === 'SUCCESS'
                    ? '0 0 20px rgba(76, 175, 80, 0.6)'
                    : status === 'MISMATCH'
                    ? '0 0 20px rgba(244, 67, 54, 0.6)'
                    : '0 0 15px rgba(33, 150, 243, 0.4)',
                transition: 'all 0.3s ease',
              }}
            />

            {verifying && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 1.5,
                  color: 'white',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                <CircularProgress color="inherit" size={48} />
                <Typography variant="body2" fontWeight={600}>
                  {statusMessage}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Status Alert Box */}
          <Box mb={2.5}>
            {status === 'SUCCESS' && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  {statusMessage}
                </Typography>
              </Alert>
            )}
            {status === 'MISMATCH' && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  {statusMessage}
                </Typography>
              </Alert>
            )}
            {status === 'LOCKED' && (
              <Alert severity="error" icon={<ErrorOutlineIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  {statusMessage}
                </Typography>
              </Alert>
            )}
            {status === 'NO_PROFILE' && (
              <Alert severity="error" icon={<ErrorOutlineIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  {statusMessage}
                </Typography>
              </Alert>
            )}
            {status === 'IDLE' && (
              <Alert severity="info" icon={<VerifiedUserIcon />}>
                <Typography variant="body2">
                  Position your face clearly inside the oval. During verification, you will be prompted to blink naturally.
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            {status !== 'LOCKED' && status !== 'NO_PROFILE' && status !== 'SUCCESS' && (
              <Button
                variant="contained"
                size="large"
                color="primary"
                startIcon={<VerifiedUserIcon />}
                onClick={handleCaptureAndVerify}
                disabled={verifying || modelLoading}
                sx={{ px: 4, py: 1.2, fontWeight: 700, borderRadius: 2 }}
              >
                {verifying ? 'Verifying Identity...' : attempts > 0 ? 'Retry Verification' : 'Verify Identity & Begin Exam'}
              </Button>
            )}

            {(status === 'LOCKED' || status === 'NO_PROFILE') && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={onBackToDashboard}
                sx={{ px: 3, fontWeight: 600 }}
              >
                Return to Dashboard
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PreExamFaceGate;
