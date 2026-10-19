import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';
import PROCTORING_CONFIG from '../../../config/proctoring';

export default function WebCam({ onViolation, webcamRef }) {
  const internalWebcamRef = useRef(null);
  const actualWebcamRef = webcamRef || internalWebcamRef;
  const canvasRef = useRef(null);

  // Keep a ref to the latest onViolation callback
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Cooldown timestamps
  const lastDetectionTimeRef = useRef({});

  // Sustained violation tracking refs (timestamps when abnormal condition started)
  const phoneStartRef = useRef(null);
  const laptopStartRef = useRef(null);
  const noFaceStartRef = useRef(null);
  const multiFaceStartRef = useRef(null);
  const headMovementStartRef = useRef(null);
  const eyeGazeStartRef = useRef(null);

  const handleDetection = (type, customDescription = null) => {
    const now = Date.now();
    const lastTime = lastDetectionTimeRef.current[type] || 0;

    let cooldown = PROCTORING_CONFIG.COOLDOWNS[type] || 6000;
    if (type === 'CELL_PHONE' || type === 'CELL_PHONE_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.CELL_PHONE;
    } else if (type === 'LAPTOP' || type === 'LAPTOP_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.LAPTOP;
    } else if (type === 'NO_FACE' || type === 'NO_FACE_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.NO_FACE;
    } else if (type === 'MULTIPLE_FACES') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.MULTIPLE_FACES;
    } else if (type === 'HEAD_MOVEMENT' || type === 'HEAD_TURNED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.HEAD_MOVEMENT;
    } else if (type === 'EYE_GAZE' || type === 'EYE_GAZE_AWAY') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.EYE_GAZE;
    }

    if (now - lastTime >= cooldown) {
      lastDetectionTimeRef.current[type] = now;

      let screenshot = null;
      try {
        if (actualWebcamRef.current && typeof actualWebcamRef.current.getScreenshot === 'function') {
          screenshot = actualWebcamRef.current.getScreenshot();
        }
      } catch (e) {
        console.warn('[WebCam] Screenshot capture failed:', e);
      }

      const description =
        customDescription ||
        `${type.replace(/_/g, ' ')} detected by AI proctoring monitor`;

      if (onViolationRef.current) {
        onViolationRef.current({
          eventType: type,
          confidence: 1.0,
          description,
          evidenceUrl: screenshot,
          screenshot: screenshot,
        });
      }
    }
  };

  // Calibrated Baseline State
  const calibrationStartRef = useRef(null);
  const calibrationSamplesRef = useRef([]);
  const baselineRef = useRef({
    calibrated: false,
    yaw: 0.50,
    pitch: 0.38,
    leftIris: 0.50,
    rightIris: 0.50,
    fallbackNoseRatioX: 0.0,
    fallbackNoseRatioY: 0.5,
  });

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    let cocoNet = null;
    let landmarkDetector = null;
    let fallbackFaceDetector = null;

    const initModels = async () => {
      try {
        cocoNet = await cocossd.load();
        console.log('[WebCam] COCO-SSD model initialized successfully.');
      } catch (err) {
        console.warn('[WebCam] Error initializing COCO-SSD:', err.message);
      }

      try {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        landmarkDetector = await faceLandmarksDetection.createDetector(model, {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 2,
        });
        console.log('[WebCam] MediaPipe Face Landmarker (with Iris) initialized.');
      } catch (lmErr) {
        console.warn('[WebCam] FaceMesh refined loader warning, falling back to basic FaceDetector:', lmErr.message);
        try {
          const fbModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
          fallbackFaceDetector = await faceDetection.createDetector(fbModel, {
            runtime: 'tfjs',
            maxFaces: 2,
          });
          console.log('[WebCam] Fallback Face Detector initialized.');
        } catch (fbErr) {
          console.warn('[WebCam] Fallback Face Detector failed:', fbErr.message);
        }
      }

      if (!isMounted) return;

      intervalId = setInterval(async () => {
        if (!isMounted) return;
        try {
          await runProctoringAnalysis(cocoNet, landmarkDetector, fallbackFaceDetector);
        } catch (loopErr) {
          console.warn('[WebCam] Analysis loop error:', loopErr.message);
        }
      }, PROCTORING_CONFIG.CHECK_INTERVAL_MS || 150);
    };

    const runProctoringAnalysis = async (coco, meshDet, fbDet) => {
      if (
        !actualWebcamRef.current ||
        !actualWebcamRef.current.video ||
        actualWebcamRef.current.video.readyState < 2
      ) {
        return;
      }

      const video = actualWebcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (!videoWidth || !videoHeight) return;

      if (canvasRef.current) {
        if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
        }
      }

      const now = Date.now();
      let personCount = 0;
      let phoneDetectedInFrame = false;
      let laptopDetectedInFrame = false;

      // ── 1. COCO-SSD Object Detection ─────────────────────────────────
      if (coco) {
        try {
          const predictions = await coco.detect(video);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, videoWidth, videoHeight);
            drawRect(predictions, ctx);
          }

          predictions.forEach((pred) => {
            const label = (pred.class || '').toLowerCase();
            const score = pred.score || 0;

            if (score >= 0.45) {
              if (
                label === 'cell phone' ||
                label === 'phone' ||
                label === 'mobile phone' ||
                label === 'telephone'
              ) {
                phoneDetectedInFrame = true;
              }

              if (label === 'laptop') {
                laptopDetectedInFrame = true;
              }

              if (label === 'person') {
                personCount++;
              }
            }
          });
        } catch (cocoErr) {
          console.warn('[WebCam] COCO inference error:', cocoErr.message);
        }
      }

      // Sustained Cell Phone Detection Check
      if (phoneDetectedInFrame) {
        if (!phoneStartRef.current) {
          phoneStartRef.current = now;
        } else if (now - phoneStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.CELL_PHONE) {
          handleDetection('CELL_PHONE_DETECTED', 'Mobile phone detected in camera view for > 2 seconds');
        }
      } else {
        phoneStartRef.current = null;
      }

      // Sustained Secondary Laptop Detection Check
      if (laptopDetectedInFrame) {
        if (!laptopStartRef.current) {
          laptopStartRef.current = now;
        } else if (now - laptopStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.LAPTOP) {
          handleDetection('LAPTOP_DETECTED', 'Secondary laptop detected in camera view for > 2 seconds');
        }
      } else {
        laptopStartRef.current = null;
      }

      // ── 2. Face Landmarks & Gaze Analysis ─────────────────────────────
      let detectedFaces = [];
      let isLandmarkMesh = false;

      if (meshDet) {
        try {
          detectedFaces = await meshDet.estimateFaces(video, { flipHorizontal: false });
          isLandmarkMesh = true;
        } catch (meshErr) {
          if (fbDet) {
            try {
              detectedFaces = await fbDet.estimateFaces(video, { flipHorizontal: false });
            } catch (fbErr) {}
          }
        }
      } else if (fbDet) {
        try {
          detectedFaces = await fbDet.estimateFaces(video, { flipHorizontal: false });
        } catch (fbErr) {}
      }

      const totalFaces = Math.max(personCount, detectedFaces.length);

      // Multiple Faces Sustained Check
      if (totalFaces > 1) {
        if (!multiFaceStartRef.current) {
          multiFaceStartRef.current = now;
        } else if (now - multiFaceStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.MULTIPLE_FACES) {
          handleDetection('MULTIPLE_FACES', `Multiple individuals (${totalFaces}) detected for > 2 seconds`);
        }
      } else {
        multiFaceStartRef.current = null;
      }

      // Absence / No Face Sustained Check
      if (totalFaces === 0) {
        if (!noFaceStartRef.current) {
          noFaceStartRef.current = now;
        } else if (now - noFaceStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.NO_FACE) {
          handleDetection('NO_FACE_DETECTED', 'No person detected in camera view for > 2 seconds');
        }
      } else {
        noFaceStartRef.current = null;
      }

      // Visual feedback banner for 0 or >1 faces
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (totalFaces > 1) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(0, 0, videoWidth, 34);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(`⚠️ PROCTORING ALERT: MULTIPLE INDIVIDUALS (${totalFaces}) DETECTED`, 15, 22);
        } else if (totalFaces === 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.fillRect(0, 0, videoWidth, 34);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('⚠️ PROCTORING ALERT: NO PERSON IN FRAME - PLEASE FACE CAMERA', 15, 22);
        }
      }

      // Single Face: Estimate Calibrated Head Movement (Yaw/Pitch) & Eye Gaze
      if (detectedFaces.length === 1) {
        const face = detectedFaces[0];
        const keypoints = face.keypoints || [];

        let currentYawRatio = 0.50;
        let currentPitchRatio = 0.38;
        let currentLeftIrisRatio = 0.50;
        let currentRightIrisRatio = 0.50;
        let hasValidLandmarks = false;

        let isHeadTurned = false;
        let isGazeDeviated = false;
        let currentYawDev = 0;
        let currentPitchDev = 0;
        let currentGazeDev = 0;

        if (isLandmarkMesh && keypoints.length >= 468) {
          const nose = keypoints[1] || keypoints[4];
          const chin = keypoints[152];
          const forehead = keypoints[10];
          const leftCheek = keypoints[234];
          const rightCheek = keypoints[454];

          if (nose && leftCheek && rightCheek && forehead && chin) {
            const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
            const faceHeight = Math.abs(chin.y - forehead.y);

            if (faceWidth > 20 && faceHeight > 20) {
              const noseDistFromLeft = Math.abs(nose.x - Math.min(leftCheek.x, rightCheek.x));
              currentYawRatio = noseDistFromLeft / faceWidth;

              const noseDistFromTop = Math.abs(nose.y - forehead.y);
              currentPitchRatio = noseDistFromTop / faceHeight;
              hasValidLandmarks = true;
            }
          }

          const leftEyeOuter = keypoints[33];
          const leftEyeInner = keypoints[133];
          const rightEyeInner = keypoints[362];
          const rightEyeOuter = keypoints[263];
          const leftIris = keypoints[468];
          const rightIris = keypoints[473];

          if (leftIris && leftEyeOuter && leftEyeInner) {
            const leftEyeW = Math.abs(leftEyeInner.x - leftEyeOuter.x);
            if (leftEyeW > 6) {
              currentLeftIrisRatio = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / leftEyeW;
            }
          }

          if (rightIris && rightEyeInner && rightEyeOuter) {
            const rightEyeW = Math.abs(rightEyeOuter.x - rightEyeInner.x);
            if (rightEyeW > 6) {
              currentRightIrisRatio = (rightIris.x - Math.min(rightEyeInner.x, rightEyeOuter.x)) / rightEyeW;
            }
          }
        } else {
          // Fallback keypoint estimation using 6 basic face keypoints
          const rightEye = keypoints.find((k) => k.name === 'rightEye');
          const leftEye = keypoints.find((k) => k.name === 'leftEye');
          const nose = keypoints.find((k) => k.name === 'noseTip');

          if (rightEye && leftEye && nose) {
            const eyeDistance = Math.abs(leftEye.x - rightEye.x);
            const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
            const eyeMidpointY = (leftEye.y + rightEye.y) / 2;

            if (eyeDistance > 10) {
              currentYawRatio = (nose.x - eyeMidpointX) / eyeDistance;
              currentPitchRatio = (nose.y - eyeMidpointY) / eyeDistance;
              hasValidLandmarks = true;
            }
          }
        }

        // ── 2a. Initial 2-Second Calibration Baseline Capture ───────────────
        if (!baselineRef.current.calibrated) {
          if (!calibrationStartRef.current) {
            calibrationStartRef.current = now;
          }

          if (hasValidLandmarks) {
            calibrationSamplesRef.current.push({
              yaw: currentYawRatio,
              pitch: currentPitchRatio,
              leftIris: currentLeftIrisRatio,
              rightIris: currentRightIrisRatio,
            });
          }

          const calElapsed = now - calibrationStartRef.current;
          const calDuration = PROCTORING_CONFIG.CALIBRATION_DURATION_MS || 2000;
          const calPercent = Math.min(100, Math.round((calElapsed / calDuration) * 100));

          // Draw calibration banner on canvas
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
            ctx.fillRect(0, 0, videoWidth, 34);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(
              `🎯 CALIBRATING AI PROCTOR: Look straight at screen... (${calPercent}%)`,
              15,
              22
            );
          }

          if (calElapsed >= calDuration) {
            const samples = calibrationSamplesRef.current;
            if (samples.length >= 4) {
              const avgYaw = samples.reduce((acc, s) => acc + s.yaw, 0) / samples.length;
              const avgPitch = samples.reduce((acc, s) => acc + s.pitch, 0) / samples.length;
              const avgLeftIris = samples.reduce((acc, s) => acc + s.leftIris, 0) / samples.length;
              const avgRightIris = samples.reduce((acc, s) => acc + s.rightIris, 0) / samples.length;

              baselineRef.current = {
                calibrated: true,
                yaw: avgYaw,
                pitch: avgPitch,
                leftIris: avgLeftIris,
                rightIris: avgRightIris,
              };
              console.log('[WebCam] Calibrated baseline established:', baselineRef.current);
            } else {
              // Not enough samples yet, extend calibration window
              calibrationStartRef.current = now;
            }
          }

          // Do not flag violations during initial calibration window
          return;
        }

        // ── 2b. Compute Deviations Against Calibrated Baseline ──────────────
        const base = baselineRef.current;
        currentYawDev = Math.abs(currentYawRatio - base.yaw);
        currentPitchDev = Math.abs(currentPitchRatio - base.pitch);

        const leftIrisDev = Math.abs(currentLeftIrisRatio - base.leftIris);
        const rightIrisDev = Math.abs(currentRightIrisRatio - base.rightIris);
        currentGazeDev = Math.max(leftIrisDev, rightIrisDev);

        const yawThreshold = PROCTORING_CONFIG.THRESHOLDS.HEAD_YAW_DEVIATION || 0.15;
        const pitchThreshold = PROCTORING_CONFIG.THRESHOLDS.HEAD_PITCH_DEVIATION || 0.14;
        const gazeThreshold = PROCTORING_CONFIG.THRESHOLDS.EYE_GAZE_HORIZONTAL_DEVIATION || 0.18;

        const isYawExceeded = currentYawDev > yawThreshold;
        const isPitchExceeded = currentPitchDev > pitchThreshold;
        isHeadTurned = isYawExceeded || isPitchExceeded;
        isGazeDeviated = currentGazeDev > gazeThreshold;

        // ── 2c. Real-Time Debug HUD Overlay on Canvas ────────────────────────
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');

          // Top HUD panel for metrics
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(10, 10, 310, 80);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(10, 10, 310, 80);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`AI Proctor [Calibrated ✓] | Model: ${isLandmarkMesh ? 'FaceMesh+Iris' : 'FaceDetect'}`, 18, 26);

          ctx.fillStyle = isYawExceeded ? '#ef4444' : '#f8fafc';
          ctx.font = '10px monospace';
          ctx.fillText(`Yaw Dev:   ${currentYawDev.toFixed(2)} (limit: ${yawThreshold}) ${isYawExceeded ? '⚠️ TURNED' : '✓'}`, 18, 42);

          ctx.fillStyle = isPitchExceeded ? '#ef4444' : '#f8fafc';
          ctx.fillText(`Pitch Dev: ${currentPitchDev.toFixed(2)} (limit: ${pitchThreshold}) ${isPitchExceeded ? '⚠️ TILTED' : '✓'}`, 18, 58);

          ctx.fillStyle = isGazeDeviated ? '#ef4444' : '#f8fafc';
          ctx.fillText(`Gaze Dev:  ${currentGazeDev.toFixed(2)} (limit: ${gazeThreshold}) ${isGazeDeviated ? '⚠️ LOOKING AWAY' : '✓'}`, 18, 74);

          // Face Bounding Box
          const b = face.box;
          if (b) {
            const x = b.xMin ?? b.left ?? 30;
            const y = b.yMin ?? b.top ?? 30;
            const w = b.width ?? (b.xMax - b.xMin) ?? 120;
            const h = b.height ?? (b.yMax - b.yMin) ?? 140;

            if (isHeadTurned || isGazeDeviated) {
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(x, y, w, h);
              ctx.fillStyle = '#f59e0b';
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText(
                isHeadTurned ? '⚠️ Head Movement' : '⚠️ Eye Gaze Away',
                x,
                Math.max(16, y - 6)
              );
            } else {
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, w, h);
              ctx.fillStyle = '#22c55e';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText('✓ Focused on Screen', x, Math.max(16, y - 6));
            }
          }
        }

        // ── 2d. Sustained Head Movement Check (> 1.5 seconds) ─────────────────
        if (isHeadTurned) {
          if (!headMovementStartRef.current) {
            headMovementStartRef.current = now;
          } else if (now - headMovementStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.HEAD_MOVEMENT) {
            handleDetection(
              'HEAD_MOVEMENT',
              isYawExceeded
                ? 'Head turned away from screen for > 1.5 seconds'
                : 'Head tilted away from screen for > 1.5 seconds'
            );
          }
        } else {
          headMovementStartRef.current = null;
        }

        // ── 2e. Sustained Eye Gaze Deviation Check (> 1.5 seconds) ────────────
        if (isGazeDeviated) {
          if (!eyeGazeStartRef.current) {
            eyeGazeStartRef.current = now;
          } else if (now - eyeGazeStartRef.current >= PROCTORING_CONFIG.SUSTAINED_DURATIONS.EYE_GAZE) {
            handleDetection('EYE_GAZE', 'Eyes looking away from screen for > 1.5 seconds');
          }
        } else {
          eyeGazeStartRef.current = null;
        }
      }
    };

    initModels();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Card
        variant="outlined"
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <Webcam
          ref={actualWebcamRef}
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
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      </Card>
    </Box>
  );
}
