import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import Webcam from 'react-webcam';
import { Box, Card } from '@mui/material';
import { useSelector } from 'react-redux';
import axiosInstance from '../../../axios';
import { analyzeFace, verifyLiveMatch } from '../../../utils/faceRecognition';
import PROCTORING_CONFIG from '../../../config/proctoring';

export default function WebCam({ onViolation, webcamRef }) {
  const internalWebcamRef = useRef(null);
  const { userInfo } = useSelector((state) => state.auth);
  const studentId = userInfo?.id || userInfo?._id;
  const isStudent = !((userInfo?.role || '').toLowerCase().includes('teacher') || (userInfo?.role || '').toLowerCase().includes('admin'));

  const storedFaceEmbeddingRef = useRef(null);
  const consecutiveFaceMismatchesRef = useRef(0);
  const faceCheckInProgressRef = useRef(false);

  // High-speed phone / laptop detection state
  const consecutivePhoneFramesRef = useRef(0);
  const consecutiveLaptopFramesRef = useRef(0);
  const offscreenCanvasRef = useRef(null);
  const latestPredictionsRef = useRef([]);

  // Fetch registered face profile once on mount for continuous verification
  useEffect(() => {
    if (!isStudent || !studentId) return;
    let isSubscribed = true;

    axiosInstance
      .get(`/api/proctoring/face-profile/${studentId}`, { withCredentials: true })
      .then((res) => {
        if (!isSubscribed) return;
        if (res.data?.registered && res.data?.averageEmbedding) {
          storedFaceEmbeddingRef.current = res.data.averageEmbedding;
          console.log('[WebCam] Registered biometric descriptor loaded for continuous verification.');
        } else {
          console.warn('[WebCam] No registered face biometric profile found for continuous verification.');
        }
      })
      .catch((err) => {
        console.warn('[WebCam] Could not fetch face profile:', err.message);
      });

    return () => {
      isSubscribed = false;
    };
  }, [studentId, isStudent]);

  const actualWebcamRef = webcamRef || internalWebcamRef;
  const canvasRef = useRef(null);

  // Keep a ref to the latest onViolation callback
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Cooldown timestamps (enforce minimum gap between repeat events of the SAME type)
  const lastDetectionTimeRef = useRef({});

  // Sustained violation tracking refs (timestamps when abnormal condition started)
  const noFaceStartRef = useRef(null);
  const multiFaceStartRef = useRef(null);
  const lookAwayStartRef = useRef(null);
  const headTurnedAwayStartRef = useRef(null);

  // Real-time head orientation state for gating continuous face identity verification
  const currentHeadPoseRef = useRef({
    isFrontal: false,
    isLookingAway: false,
    isLookingDown: false,
    isYawExceeded: false,
    isPitchExceeded: false,
    lastUpdated: 0,
  });

  const handleDetection = (type, customDescription = null) => {
    // Looking down (keyboard, desk, writing): Strictly ZERO penalty, ZERO warning, ZERO siren
    if (!type || type.toUpperCase().includes('DOWNWARD')) {
      return;
    }

    const now = Date.now();
    const lastTime = lastDetectionTimeRef.current[type] || 0;

    let cooldown = PROCTORING_CONFIG.COOLDOWNS[type] || 5000;
    if (type === 'CELL_PHONE' || type === 'CELL_PHONE_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.CELL_PHONE || 5000;
    } else if (type === 'LAPTOP' || type === 'LAPTOP_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.LAPTOP || 5000;
    } else if (type === 'NO_FACE' || type === 'NO_FACE_DETECTED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.NO_FACE || 5000;
    } else if (type === 'MULTIPLE_FACES') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.MULTIPLE_FACES || 5000;
    } else if (type === 'HEAD_MOVEMENT' || type === 'HEAD_TURNED') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.HEAD_MOVEMENT || 5000;
    } else if (type === 'EYE_GAZE' || type === 'EYE_GAZE_AWAY' || type === 'PROLONGED_LOOKING_AWAY') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.EYE_GAZE || 5000;
    } else if (type === 'FACE_MISMATCH' || type === 'UNAUTHORIZED_PERSON') {
      cooldown = PROCTORING_CONFIG.COOLDOWNS.FACE_MISMATCH || 12000;
    }

    if (now - lastTime >= cooldown) {
      lastDetectionTimeRef.current[type] = now;

      // Unique client-side violation ID for idempotent deduplication
      const violationId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      const description =
        customDescription ||
        `${type.replace(/_/g, ' ')} detected by AI proctoring monitor`;

      // 1. Send violation immediately (< 5ms) without waiting for screenshot
      if (onViolationRef.current) {
        onViolationRef.current({
          violationId,
          eventType: type,
          confidence: 1.0,
          description,
          evidenceUrl: null,
          screenshot: null,
        });
      }

      // 2. Capture screenshot asynchronously in background and attach afterward
      setTimeout(() => {
        try {
          if (actualWebcamRef.current && typeof actualWebcamRef.current.getScreenshot === 'function') {
            const screenshot = actualWebcamRef.current.getScreenshot();
            if (screenshot) {
              if (typeof onViolationRef.current?.onEvidenceReady === 'function') {
                onViolationRef.current.onEvidenceReady(violationId, screenshot);
              } else if (typeof window.__uploadProctoringEvidence === 'function') {
                window.__uploadProctoringEvidence(violationId, screenshot);
              }
            }
          }
        } catch (e) {
          console.warn('[WebCam] Background screenshot capture failed:', e);
        }
      }, 40);
    }
  };

  // Calibrated Baseline State
  const debugLogThrottleRef = useRef(0);
  const calibrationStartRef = useRef(null);
  const calibrationSamplesRef = useRef([]);
  const baselineRef = useRef({
    calibrated: false,
    yaw: 0.0,
    pitch: 0.35,
    pitch3D: 0.0,
    leftIrisX: 0.50,
    leftIrisY: 0.0,
    rightIrisX: 0.50,
    rightIrisY: 0.0,
    fallbackNoseX: 0.0,
    fallbackNoseY: 0.35,
  });

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    let objectIntervalId = null;
    let faceCheckIntervalId = null;
    let cocoNet = null;
    let landmarkDetector = null;
    let fallbackFaceDetector = null;
    let activeModelName = 'Initializing...';

    // ── High-Speed Dedicated Object Detection (Phone / Secondary Laptop) ──
    const runObjectDetection = async (coco) => {
      if (
        !actualWebcamRef.current ||
        !actualWebcamRef.current.video ||
        actualWebcamRef.current.video.readyState < 2
      ) {
        return;
      }
      const video = actualWebcamRef.current.video;
      if (!video.videoWidth || !video.videoHeight) return;

      // Resized 320x240 offscreen canvas for 4x faster background inference without UI lag
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
        offscreenCanvasRef.current.width = 320;
        offscreenCanvasRef.current.height = 240;
      }
      const offCtx = offscreenCanvasRef.current.getContext('2d');
      offCtx.drawImage(video, 0, 0, 320, 240);

      try {
        const predictions = await coco.detect(offscreenCanvasRef.current);
        latestPredictionsRef.current = predictions;

        let phoneInFrame = false;
        let isConfidentPhone = false;
        let laptopInFrame = false;

        for (const pred of predictions) {
          const label = (pred.class || '').toLowerCase();
          const score = pred.score || 0;
          const [, , w, h] = pred.bbox || [0, 0, 0, 0];
          const aspect = w > 0 && h > 0 ? (w > h ? w / h : h / w) : 1;

          // Exclude hands, remotes, books, or whole desk:
          // A phone has rectangular aspect ratio (1.25 to 3.2) and takes reasonable frame area (<65%)
          const isPhoneAspect = aspect >= 1.25 && aspect <= 3.2 && (w * h < 320 * 240 * 0.65);

          if (
            label === 'cell phone' ||
            label === 'phone' ||
            label === 'mobile phone' ||
            label === 'telephone'
          ) {
            if (score >= 0.50) {
              phoneInFrame = true;
              isConfidentPhone = true;
            } else if (score >= 0.38 && isPhoneAspect) {
              // Phone held at an angle, partly hidden, or smaller in frame
              phoneInFrame = true;
            }
          }

          if (label === 'laptop' && score >= 0.50) {
            laptopInFrame = true;
          }
        }

        // Fast phone detection confirmation:
        // Confident frame (score >= 0.50): flags on 1st frame!
        // Moderate/angled frame (0.38 <= score < 0.50): confirmed on 2 frames max!
        if (phoneInFrame) {
          consecutivePhoneFramesRef.current += 1;
          if (isConfidentPhone || consecutivePhoneFramesRef.current >= 2) {
            handleDetection('CELL_PHONE_DETECTED', 'Mobile phone detected in camera view');
          }
        } else {
          consecutivePhoneFramesRef.current = 0;
        }

        if (laptopInFrame) {
          consecutiveLaptopFramesRef.current += 1;
          if (consecutiveLaptopFramesRef.current >= 2) {
            handleDetection('LAPTOP_DETECTED', 'Secondary laptop detected in camera view');
          }
        } else {
          consecutiveLaptopFramesRef.current = 0;
        }
      } catch (objErr) {
        // Non-critical background frame error
      }
    };

    const initModels = async () => {
      // 1. Load Object Detection (COCO-SSD with lightweight MobileNet model)
      try {
        cocoNet = await cocossd.load({ base: 'lite_mobilenet_v2' });
        console.log('[WebCam] Loaded fast MobileNetV2 COCO detector.');
      } catch (err) {
        try {
          cocoNet = await cocossd.load();
          console.log('[WebCam] Fallback COCO-SSD object model initialized.');
        } catch (fbErr) {
          console.warn('[WebCam] COCO-SSD initialization notice:', fbErr.message);
        }
      }

      // 2. Load FaceMesh Landmarker (Multi-tier fallback for 100% reliability)
      const meshModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      let meshLoaded = false;

      // Tier 1: Local Offline MediaPipe assets (/mediapipe/face_mesh)
      try {
        landmarkDetector = await faceLandmarksDetection.createDetector(meshModel, {
          runtime: 'mediapipe',
          solutionPath: '/mediapipe/face_mesh',
          refineLandmarks: true,
          maxFaces: 2,
        });
        meshLoaded = true;
        activeModelName = 'MediaPipe FaceMesh + Iris (Local)';
        console.log('[WebCam] Loaded local offline MediaPipe FaceMesh detector.');
      } catch (localErr) {
        console.warn('[WebCam] Local MediaPipe FaceMesh notice, attempting CDN fallback:', localErr.message);
      }

      // Tier 2: CDN MediaPipe assets
      if (!meshLoaded) {
        try {
          landmarkDetector = await faceLandmarksDetection.createDetector(meshModel, {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            refineLandmarks: true,
            maxFaces: 2,
          });
          meshLoaded = true;
          activeModelName = 'MediaPipe FaceMesh + Iris (CDN)';
          console.log('[WebCam] Loaded CDN MediaPipe FaceMesh detector.');
        } catch (cdnErr) {
          console.warn('[WebCam] CDN MediaPipe FaceMesh notice, attempting TFJS runtime:', cdnErr.message);
        }
      }

      // Tier 3: TFJS runtime
      if (!meshLoaded) {
        try {
          landmarkDetector = await faceLandmarksDetection.createDetector(meshModel, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 2,
          });
          meshLoaded = true;
          activeModelName = 'FaceMesh Landmarker (TFJS)';
          console.log('[WebCam] Loaded TFJS FaceMesh detector.');
        } catch (tfjsErr) {
          console.warn('[WebCam] TFJS FaceMesh notice, loading fallback face detector:', tfjsErr.message);
        }
      }

      // Tier 4: Fallback basic face detector
      if (!meshLoaded) {
        const fbModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
        try {
          fallbackFaceDetector = await faceDetection.createDetector(fbModel, {
            runtime: 'mediapipe',
            solutionPath: '/mediapipe/face_detection',
            maxFaces: 2,
          });
          activeModelName = 'FaceDetector (Local Fallback)';
          console.log('[WebCam] Fallback Face Detector (Local) loaded.');
        } catch (fbErr1) {
          try {
            fallbackFaceDetector = await faceDetection.createDetector(fbModel, {
              runtime: 'tfjs',
              maxFaces: 2,
            });
            activeModelName = 'FaceDetector (TFJS Fallback)';
            console.log('[WebCam] Fallback Face Detector (TFJS) loaded.');
          } catch (fbErr2) {
            console.warn('[WebCam] Notice: Basic face detector failed:', fbErr2.message);
          }
        }
      }

      if (!isMounted) return;

      // Start dedicated high-speed object detection loop (10 checks per second)
      if (cocoNet) {
        objectIntervalId = setInterval(async () => {
          if (!isMounted) return;
          try {
            await runObjectDetection(cocoNet);
          } catch (loopErr) {
            // Ignore frame error
          }
        }, PROCTORING_CONFIG.OBJECT_CHECK_INTERVAL_MS || 100);
      }

      // Start dedicated face landmark & pose analysis loop (8 checks per second)
      intervalId = setInterval(async () => {
        if (!isMounted) return;
        try {
          await runProctoringAnalysis(landmarkDetector, fallbackFaceDetector, activeModelName);
        } catch (loopErr) {
          console.warn('[WebCam] Analysis loop notice:', loopErr.message);
        }
      }, PROCTORING_CONFIG.CHECK_INTERVAL_MS || 120);

      // Continuous Face Identity Re-verification (every 12 seconds)
      if (isStudent && PROCTORING_CONFIG.FACE_VERIFICATION?.ENABLED) {
        faceCheckIntervalId = setInterval(async () => {
          if (!isMounted || !storedFaceEmbeddingRef.current || faceCheckInProgressRef.current) return;
          if (
            !actualWebcamRef.current ||
            !actualWebcamRef.current.video ||
            actualWebcamRef.current.video.readyState < 2
          ) {
            return;
          }

          // Strict Frontal Pose Guard:
          // ONLY run biometric identity comparison when the student is facing the screen frontally!
          // If the student is moving their head, turned away, tilted, or looking away, DO NOT run identity verification!
          const pose = currentHeadPoseRef.current;
          if (!pose || !pose.isFrontal) {
            return;
          }

          const video = actualWebcamRef.current.video;
          try {
            faceCheckInProgressRef.current = true;
            const analysis = await analyzeFace(video);

            // Double check pose didn't change while frame was capturing
            if (!currentHeadPoseRef.current?.isFrontal) {
              return;
            }

            // Only evaluate when exactly one face is detected with good visibility
            if (analysis && analysis.success && analysis.descriptor) {
              const threshold =
                PROCTORING_CONFIG.FACE_VERIFICATION.CONTINUOUS_MATCH_THRESHOLD ||
                PROCTORING_CONFIG.FACE_VERIFICATION.MATCH_THRESHOLD ||
                0.52;
              const matchResult = verifyLiveMatch(
                analysis.descriptor,
                storedFaceEmbeddingRef.current,
                threshold
              );

              if (matchResult.matches) {
                consecutiveFaceMismatchesRef.current = 0;
              } else {
                consecutiveFaceMismatchesRef.current += 1;
                const count = consecutiveFaceMismatchesRef.current;
                const maxAllowed = PROCTORING_CONFIG.FACE_VERIFICATION.MAX_CONSECUTIVE_MISMATCHES || 3;
                handleDetection(
                  'FACE_MISMATCH',
                  `Face mismatch detected (${count}/${maxAllowed}): Unrecognized person in front of webcam.`
                );

                if (count >= maxAllowed) {
                  if (typeof onViolationRef.current?.onTerminate === 'function') {
                    onViolationRef.current.onTerminate('Face verification failed 3 consecutive times');
                  } else if (typeof window.__terminateExamSession === 'function') {
                    window.__terminateExamSession('Face verification failed 3 consecutive times');
                  }
                }
              }
            }
          } catch (faceErr) {
            console.warn('[WebCam] Background face verification check note:', faceErr.message);
          } finally {
            faceCheckInProgressRef.current = false;
          }
        }, PROCTORING_CONFIG.FACE_VERIFICATION.INTERVAL_MS || 12000);
      }
    };

    const runProctoringAnalysis = async (meshDet, fbDet, modelLabel) => {
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

      // Clear canvas overlay for fresh frame rendering
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, videoWidth, videoHeight);
      }

      // Check person count from background object predictions
      let personCount = 0;
      for (const pred of (latestPredictionsRef.current || [])) {
        if ((pred.class || '').toLowerCase() === 'person' && (pred.score || 0) >= 0.45) {
          personCount++;
        }
      }

      // ── 1. Face Landmarks & Gaze Analysis ─────────────────────────────
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
        } else if (now - multiFaceStartRef.current >= (PROCTORING_CONFIG.SUSTAINED_DURATIONS.MULTIPLE_FACES || 500)) {
          handleDetection('MULTIPLE_FACES', `Multiple individuals (${totalFaces}) detected in camera view`);
        }
      } else {
        multiFaceStartRef.current = null;
      }

      // Absence / No Face Sustained Check
      if (totalFaces === 0) {
        if (!noFaceStartRef.current) {
          noFaceStartRef.current = now;
        } else if (now - noFaceStartRef.current >= (PROCTORING_CONFIG.SUSTAINED_DURATIONS.NO_FACE || 1000)) {
          handleDetection('NO_FACE_DETECTED', 'No person detected in camera view');
        }
      } else {
        noFaceStartRef.current = null;
      }

      // Head turned completely away: Person is present in chair (personCount >= 1), but no frontal face detected
      if (personCount >= 1 && detectedFaces.length === 0) {
        if (!headTurnedAwayStartRef.current) {
          headTurnedAwayStartRef.current = now;
        } else if (now - headTurnedAwayStartRef.current >= (PROCTORING_CONFIG.SUSTAINED_DURATIONS.HEAD_MOVEMENT || 1000)) {
          handleDetection('HEAD_MOVEMENT', 'Head movement: Head turned away from camera view');
        }
      } else {
        headTurnedAwayStartRef.current = null;
      }

      if (detectedFaces.length === 0) {
        currentHeadPoseRef.current = {
          isFrontal: false,
          isLookingAway: personCount >= 1,
          isLookingDown: false,
          isYawExceeded: false,
          isPitchExceeded: false,
          lastUpdated: now,
        };
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

      // Draw prohibited object bounding boxes on canvas (scaled from 320x240 to video dimensions)
      const preds = latestPredictionsRef.current || [];
      if (canvasRef.current && preds.length > 0) {
        const ctx = canvasRef.current.getContext('2d');
        const scaleX = videoWidth / 320;
        const scaleY = videoHeight / 240;

        preds.forEach((pred) => {
          const label = (pred.class || '').toLowerCase();
          const score = pred.score || 0;
          if (
            (label.includes('phone') && score >= 0.38) ||
            (label.includes('laptop') && score >= 0.50)
          ) {
            const [x, y, w, h] = pred.bbox || [0, 0, 0, 0];
            const rx = x * scaleX;
            const ry = y * scaleY;
            const rw = w * scaleX;
            const rh = h * scaleY;

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(
              `⚠️ PROHIBITED: ${pred.class.toUpperCase()} (${Math.round(score * 100)}%)`,
              rx,
              Math.max(16, ry - 6)
            );
          }
        });
      }

      // Reset look-away timer if face count is not exactly 1
      if (totalFaces !== 1) {
        lookAwayStartRef.current = null;
      }

      // ── 2. Single Face: Robust Head Pose & Eye Gaze Tracking ─────────
      if (detectedFaces.length === 1) {
        const face = detectedFaces[0];
        const keypoints = face.keypoints || [];

        let currentYawRatio = 0.0;
        let currentPitchRatio2D = 0.35;
        let currentPitch3D = 0.0;
        let has3DDepth = false;
        let currentLeftIrisX = 0.50;
        let currentLeftIrisY = 0.0;
        let currentRightIrisX = 0.50;
        let currentRightIrisY = 0.0;
        let hasValidLandmarks = false;

        let isLookingAwayOther = false;
        let isLookingDown = false;
        let currentYawDev = 0;
        let currentPitchDev = 0;
        let currentGazeHorizDev = 0;
        let currentGazeVertDev = 0;

        if (isLandmarkMesh && keypoints.length >= 468) {
          // Anatomical landmarks
          const nose = keypoints[1] || keypoints[4];
          const forehead = keypoints[10];
          const chin = keypoints[152];
          const leftCheek = keypoints[234];
          const rightCheek = keypoints[454];

          // Eyes
          const leftEyeOuter = keypoints[33];
          const leftEyeInner = keypoints[133];
          const rightEyeInner = keypoints[362];
          const rightEyeOuter = keypoints[263];

          // Irises (indices 468 & 473 when refined mesh is active)
          const leftIris = keypoints[468];
          const rightIris = keypoints[473];

          // Head Pose: Scale-invariant Yaw
          if (nose && leftEyeOuter && rightEyeOuter && leftCheek && rightCheek) {
            const midEyeX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
            const eyeSpan = Math.max(20, Math.abs(rightEyeOuter.x - leftEyeOuter.x));
            const yawOffset = (nose.x - midEyeX) / eyeSpan;

            const dLeft = Math.hypot(nose.x - leftCheek.x, nose.y - leftCheek.y);
            const dRight = Math.hypot(nose.x - rightCheek.x, nose.y - rightCheek.y);
            const cheekRatio = (dLeft - dRight) / Math.max(10, dLeft + dRight);

            currentYawRatio = 0.6 * yawOffset + 0.4 * cheekRatio;
          }

          // Head Pose: Scale-invariant Pitch (2D + 3D)
          if (nose && forehead && chin && leftEyeOuter && rightEyeOuter) {
            const midEyeY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
            const faceHeight = Math.max(30, Math.abs(chin.y - forehead.y));
            // In 2D: as head tilts DOWN towards keyboard, chin moves back/up and (nose.y - midEyeY) / faceHeight shrinks.
            // When head tilts UP towards ceiling, chin pushes forward/up and nose points up.
            currentPitchRatio2D = (nose.y - midEyeY) / faceHeight;

            // In 3D: forehead.z decreases (closer) and chin.z increases (farther) when tilting down.
            if (chin.z !== undefined && forehead.z !== undefined) {
              currentPitch3D = (chin.z - forehead.z) / faceHeight;
              has3DDepth = true;
            }
            hasValidLandmarks = true;
          }

          // Eye Gaze: Left Eye Iris relative to stable eye corners (canthi)
          if (leftEyeOuter && leftEyeInner) {
            const leftEyeCenterY = (leftEyeOuter.y + leftEyeInner.y) / 2;
            const leftEyeW = Math.max(10, Math.abs(leftEyeInner.x - leftEyeOuter.x));
            const leftMinX = Math.min(leftEyeOuter.x, leftEyeInner.x);

            const irisX = leftIris ? leftIris.x : (leftEyeInner.x + leftEyeOuter.x) / 2;
            const irisY = leftIris ? leftIris.y : leftEyeCenterY;

            // Horizontal ratio: 0.0 (lateral/outer) to 1.0 (medial/inner)
            currentLeftIrisX = (irisX - leftMinX) / leftEyeW;
            // Vertical offset relative to inter-canthal horizontal line (positive = downward, negative = upward)
            currentLeftIrisY = (irisY - leftEyeCenterY) / leftEyeW;
          }

          // Eye Gaze: Right Eye Iris relative to stable eye corners (canthi)
          if (rightEyeOuter && rightEyeInner) {
            const rightEyeCenterY = (rightEyeOuter.y + rightEyeInner.y) / 2;
            const rightEyeW = Math.max(10, Math.abs(rightEyeOuter.x - rightEyeInner.x));
            const rightMinX = Math.min(rightEyeInner.x, rightEyeOuter.x);

            const irisX = rightIris ? rightIris.x : (rightEyeInner.x + rightEyeOuter.x) / 2;
            const irisY = rightIris ? rightIris.y : rightEyeCenterY;

            // Horizontal ratio: 0.0 (medial/inner) to 1.0 (lateral/outer)
            currentRightIrisX = (irisX - rightMinX) / rightEyeW;
            // Vertical offset relative to inter-canthal horizontal line (positive = downward, negative = upward)
            currentRightIrisY = (irisY - rightEyeCenterY) / rightEyeW;
          }
        } else {
          // Fallback keypoint estimation using 6 basic face keypoints
          const rightEye = keypoints.find((k) => k.name === 'rightEye');
          const leftEye = keypoints.find((k) => k.name === 'leftEye');
          const nose = keypoints.find((k) => k.name === 'noseTip');

          if (rightEye && leftEye && nose) {
            const eyeDistance = Math.max(10, Math.abs(leftEye.x - rightEye.x));
            const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
            const eyeMidpointY = (leftEye.y + rightEye.y) / 2;

            currentYawRatio = (nose.x - eyeMidpointX) / eyeDistance;
            currentPitchRatio2D = (nose.y - eyeMidpointY) / eyeDistance;

            // Fallback iris proxy from eye-nose configuration
            currentLeftIrisX = 0.50 + currentYawRatio * 0.3;
            currentRightIrisX = 0.50 + currentYawRatio * 0.3;
            currentLeftIrisY = -((currentPitchRatio2D - 0.35) * 0.3);
            currentRightIrisY = -((currentPitchRatio2D - 0.35) * 0.3);
            hasValidLandmarks = true;
          }
        }

        // ── 2a. Initial Calibration Baseline Capture ─────────────────────
        if (!baselineRef.current.calibrated) {
          if (!calibrationStartRef.current) {
            calibrationStartRef.current = now;
          }

          if (hasValidLandmarks) {
            calibrationSamplesRef.current.push({
              yaw: currentYawRatio,
              pitch: currentPitchRatio2D,
              pitch3D: currentPitch3D,
              leftIrisX: currentLeftIrisX,
              leftIrisY: currentLeftIrisY,
              rightIrisX: currentRightIrisX,
              rightIrisY: currentRightIrisY,
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
            if (samples.length >= 3) {
              const avgYaw = samples.reduce((acc, s) => acc + s.yaw, 0) / samples.length;
              const avgPitch = samples.reduce((acc, s) => acc + s.pitch, 0) / samples.length;
              const avgPitch3D = samples.reduce((acc, s) => acc + s.pitch3D, 0) / samples.length;
              const avgLX = samples.reduce((acc, s) => acc + s.leftIrisX, 0) / samples.length;
              const avgLY = samples.reduce((acc, s) => acc + s.leftIrisY, 0) / samples.length;
              const avgRX = samples.reduce((acc, s) => acc + s.rightIrisX, 0) / samples.length;
              const avgRY = samples.reduce((acc, s) => acc + s.rightIrisY, 0) / samples.length;

              baselineRef.current = {
                calibrated: true,
                yaw: avgYaw,
                pitch: avgPitch,
                pitch3D: avgPitch3D,
                leftIrisX: avgLX,
                leftIrisY: avgLY,
                rightIrisX: avgRX,
                rightIrisY: avgRY,
              };
              console.log('[WebCam] Calibrated forward-looking baseline established:', baselineRef.current);
            } else {
              // Not enough samples, reset calibration timer to re-attempt
              calibrationStartRef.current = now;
            }
          }

          // Do not flag violations during initial calibration window
          return;
        }

        // ── 2b. Compute Deviations Against Baseline ──────────────────────
        const base = baselineRef.current;
        const yawDelta = currentYawRatio - base.yaw;
        currentYawDev = Math.abs(yawDelta);

        // Directional Head Pitch analysis:
        // In 2D: when head tilts DOWN towards keyboard, currentPitchRatio2D < base.pitch => (base.pitch - currentPitchRatio2D) is POSITIVE.
        // In 3D: when head tilts DOWN towards keyboard, chin.z moves away, forehead.z moves closer => (currentPitch3D - base.pitch3D) is POSITIVE.
        const pitchDelta2D = base.pitch - currentPitchRatio2D;
        const pitchDelta3D = has3DDepth ? (currentPitch3D - (base.pitch3D || 0)) : pitchDelta2D;
        // Combined pitch delta:
        // pitchDelta > 0: looking DOWN (at keyboard, desk, paper, writing)
        // pitchDelta < 0: looking UP (at ceiling, away from screen)
        const pitchDelta = has3DDepth ? (0.6 * pitchDelta2D + 0.4 * pitchDelta3D) : pitchDelta2D;
        currentPitchDev = Math.abs(pitchDelta);

        // Eye Gaze Horizontal Deviations (Left vs Right)
        const leftIrisHorizDelta = currentLeftIrisX - base.leftIrisX;
        const rightIrisHorizDelta = currentRightIrisX - base.rightIrisX;
        const gazeHorizDelta = (leftIrisHorizDelta + rightIrisHorizDelta) / 2;
        currentGazeHorizDev = Math.max(Math.abs(leftIrisHorizDelta), Math.abs(rightIrisHorizDelta));

        // Eye Gaze Vertical Deviations (Down vs Up)
        // In screen coordinates (y increases downward):
        // When irises move DOWN towards keyboard/desk, currentLeftIrisY increases => delta is POSITIVE.
        // When irises move UP towards ceiling, currentLeftIrisY decreases => delta is NEGATIVE.
        const leftIrisVertDelta = currentLeftIrisY - base.leftIrisY;
        const rightIrisVertDelta = currentRightIrisY - base.rightIrisY;
        const gazeVertDelta = (leftIrisVertDelta + rightIrisVertDelta) / 2;
        currentGazeVertDev = Math.max(Math.abs(leftIrisVertDelta), Math.abs(rightIrisVertDelta));

        const yawThreshold = PROCTORING_CONFIG.THRESHOLDS.HEAD_YAW_DEVIATION || 0.18;
        const pitchThreshold = PROCTORING_CONFIG.THRESHOLDS.HEAD_PITCH_DEVIATION || 0.14;
        const gazeHorizThreshold = PROCTORING_CONFIG.THRESHOLDS.EYE_GAZE_HORIZONTAL_DEVIATION || 0.16;
        const gazeVertThreshold = PROCTORING_CONFIG.THRESHOLDS.EYE_GAZE_VERTICAL_DEVIATION || 0.16;
        const downwardYawTol = PROCTORING_CONFIG.THRESHOLDS.DOWNWARD_YAW_TOLERANCE || 0.08;

        // Direction classification:
        // Downward: generous thresholds so any normal glance at desk/keyboard/notes is recognized
        const isPitchDown = pitchDelta > 0.05;
        const isPitchUp = pitchDelta < -pitchThreshold;

        const isGazeDown = gazeVertDelta > 0.06;
        const isGazeUp = gazeVertDelta < -gazeVertThreshold;

        const isGazeHorizExceeded = currentGazeHorizDev > gazeHorizThreshold;

        // Downward glance check (head or eyes directed downward at desk/keyboard):
        const isLookingDownRaw = isPitchDown || isGazeDown;

        // When looking down at keyboard/desk, allow wide horizontal tolerance across desk width
        const allowedYaw = isLookingDownRaw ? (yawThreshold + downwardYawTol + 0.08) : yawThreshold;
        const isYawExceeded = currentYawDev > allowedYaw;

        // Student is looking DOWN at desk, keyboard, or writing:
        // STRICTLY ZERO PENALTY, ZERO SIREN, ZERO WARNING
        isLookingDown = isLookingDownRaw && !isGazeHorizExceeded && !isYawExceeded;

        // Directional identification for looking away:
        let activeDirection = null; // 'LEFT' | 'RIGHT' | 'UP'
        if (!isLookingDown) {
          if (yawDelta > allowedYaw || gazeHorizDelta > gazeHorizThreshold) {
            activeDirection = 'LEFT';
          } else if (yawDelta < -allowedYaw || gazeHorizDelta < -gazeHorizThreshold) {
            activeDirection = 'RIGHT';
          } else if (isPitchUp || isGazeUp) {
            activeDirection = 'UP';
          }
        }

        // Only looking LEFT, RIGHT, or UP is penalized
        isLookingAwayOther = activeDirection !== null;

        // Temporary Throttled Console Debug Logging (User Request: confirm pitch & gaze values while looking up/down/left/right)
        if (now - debugLogThrottleRef.current >= 600) {
          debugLogThrottleRef.current = now;
          const pDir = isPitchDown ? 'DOWN' : isPitchUp ? 'UP' : 'LEVEL';
          const gDir = isGazeDown ? 'DOWN' : isGazeUp ? 'UP' : 'CENTER';
          const yDir = yawDelta > allowedYaw ? 'LEFT' : yawDelta < -allowedYaw ? 'RIGHT' : 'CENTER';
          const ghDir = gazeHorizDelta > gazeHorizThreshold ? 'LEFT' : gazeHorizDelta < -gazeHorizThreshold ? 'RIGHT' : 'CENTER';
          console.log(
            `[Head/Eye Pose] Pitch: ${pDir} (delta: ${pitchDelta.toFixed(3)}), ` +
            `GazeV: ${gDir} (delta: ${gazeVertDelta.toFixed(3)}), ` +
            `Yaw: ${yDir} (delta: ${yawDelta.toFixed(3)}), ` +
            `GazeH: ${ghDir} (delta: ${gazeHorizDelta.toFixed(3)}) => ` +
            (isLookingDown ? '✓ ALLOWED DOWN' : isLookingAwayOther ? `⚠️ LOOKING ${activeDirection}` : '✓ SCREEN')
          );
        }

        // ── 2c. Looking-Away Timers ──────────────────────────────────────
        const sustainedLookAwayMs = PROCTORING_CONFIG.SUSTAINED_DURATIONS.HEAD_MOVEMENT || 1000;
        let lookAwayElapsedMs = 0;

        if (isLookingAwayOther) {
          // Looking left, right, or upward: start sustained look-away timer
          if (!lookAwayStartRef.current) {
            lookAwayStartRef.current = now;
          }
          lookAwayElapsedMs = now - lookAwayStartRef.current;

          // Sustained look-away duration confirmed (~1.0s of looking left, right, or up)
          if (lookAwayElapsedMs >= sustainedLookAwayMs) {
            let violationType = isYawExceeded ? 'HEAD_MOVEMENT' : (isPitchUp ? 'HEAD_MOVEMENT' : 'EYE_GAZE');
            let desc = isYawExceeded
              ? 'Head movement: Head turned away from screen'
              : 'Eye gaze: Looking away from screen';

            if (activeDirection === 'LEFT') {
              violationType = isYawExceeded ? 'HEAD_MOVEMENT' : 'EYE_GAZE';
              desc = isYawExceeded
                ? 'Head movement: Head turned left away from screen'
                : 'Eye gaze: Looking left away from screen';
            } else if (activeDirection === 'RIGHT') {
              violationType = isYawExceeded ? 'HEAD_MOVEMENT' : 'EYE_GAZE';
              desc = isYawExceeded
                ? 'Head movement: Head turned right away from screen'
                : 'Eye gaze: Looking right away from screen';
            } else if (activeDirection === 'UP') {
              violationType = isPitchUp ? 'HEAD_MOVEMENT' : 'EYE_GAZE';
              desc = isPitchUp
                ? 'Head movement: Head tilted upward away from screen'
                : 'Eye gaze: Looking upward away from screen';
            }

            handleDetection(violationType, desc);
          }
        } else if (isLookingDown) {
          // Looking downward at keyboard/desk/paper: Reset look-away timer immediately.
          // Zero warning, zero siren, zero deduction! NEVER penalized.
          lookAwayStartRef.current = null;
        } else {
          // Student is looking straight at the screen: Immediately reset timer
          lookAwayStartRef.current = null;
        }

        // Update current head pose ref for continuous verification gating
        currentHeadPoseRef.current = {
          isFrontal:
            !isLookingAwayOther &&
            !isLookingDown &&
            !isYawExceeded &&
            !isPitchUp &&
            currentYawDev < (yawThreshold * 0.9) &&
            currentPitchDev < (pitchThreshold * 0.9),
          isLookingAway: isLookingAwayOther,
          isLookingDown,
          isYawExceeded,
          isPitchExceeded: isPitchUp || isPitchDown,
          lastUpdated: now,
        };

        // ── 2d. Real-Time HUD Overlay on Canvas ───────────────────────────
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');

          const hasActiveViolation = isLookingAwayOther;
          const isAllowedDownward = isLookingDown;

          // Main metrics HUD panel
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(8, 8, 330, 95);
          ctx.strokeStyle = hasActiveViolation ? '#ef4444' : isAllowedDownward ? '#38bdf8' : '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(8, 8, 330, 95);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`AI Proctor | ${modelLabel}`, 16, 24);

          // Head Yaw Metric
          ctx.fillStyle = isYawExceeded ? '#ef4444' : '#f8fafc';
          ctx.font = '10px monospace';
          const yawLabel = yawDelta > allowedYaw ? '⚠️ LEFT' : yawDelta < -allowedYaw ? '⚠️ RIGHT' : '✓ Straight';
          ctx.fillText(
            `Head Yaw:   ${currentYawDev.toFixed(2)} (limit: ${allowedYaw.toFixed(2)}) ${yawLabel}`,
            16,
            40
          );

          // Head Pitch Metric
          if (isPitchUp) {
            ctx.fillStyle = '#ef4444';
            ctx.fillText(
              `Head Pitch: ${currentPitchDev.toFixed(2)} (limit: ${pitchThreshold}) ⚠️ TILTED UP`,
              16,
              55
            );
          } else if (isPitchDown) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(
              `Head Pitch: ${currentPitchDev.toFixed(2)} (downward) ✓ Desk/Writing (Allowed)`,
              16,
              55
            );
          } else {
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(
              `Head Pitch: ${currentPitchDev.toFixed(2)} (limit: ${pitchThreshold}) ✓ Level`,
              16,
              55
            );
          }

          // Eye Gaze Metric (Horiz & Vert)
          const gazeDevMax = Math.max(currentGazeHorizDev, currentGazeVertDev);
          if (isGazeHorizExceeded || isGazeUp) {
            ctx.fillStyle = '#ef4444';
            const gazeDirLabel = isGazeUp ? 'UP' : (gazeHorizDelta > gazeHorizThreshold ? 'LEFT' : 'RIGHT');
            ctx.fillText(
              `Eye Gaze:   ${gazeDevMax.toFixed(2)} (H:${currentGazeHorizDev.toFixed(2)} V:${currentGazeVertDev.toFixed(2)}) ⚠️ LOOKING ${gazeDirLabel}`,
              16,
              70
            );
          } else if (isGazeDown) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(
              `Eye Gaze:   ${currentGazeVertDev.toFixed(2)} (downward) ✓ Desk/Reading (Allowed)`,
              16,
              70
            );
          } else {
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(
              `Eye Gaze:   ${gazeDevMax.toFixed(2)} (H:${currentGazeHorizDev.toFixed(2)} V:${currentGazeVertDev.toFixed(2)}) ✓ Focused`,
              16,
              70
            );
          }

          // Look-Away / Downward Status Meter
          if (isLookingAwayOther) {
            const progress = Math.min(1.0, lookAwayElapsedMs / sustainedLookAwayMs);
            const progressPct = Math.round(progress * 100);

            // Progress bar
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(16, 82, 180 * progress, 8);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(16, 82, 180, 8);

            ctx.fillStyle = progress >= 1.0 ? '#ef4444' : '#f59e0b';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(
              `LOOKING ${activeDirection}: ${(lookAwayElapsedMs / 1000).toFixed(1)}s/${(sustainedLookAwayMs / 1000).toFixed(1)}s (${progressPct}%)`,
              202,
              89
            );
          } else if (isLookingDown) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('✓ LOOKING DOWN (Keyboard / Desk / Writing Allowed)', 16, 89);
          } else {
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('✓ EYES & HEAD ON SCREEN (0 free warnings used: 10 allowed)', 16, 89);
          }

          // Face Bounding Box & Target Highlight
          const b = face.box;
          if (b) {
            const x = b.xMin ?? b.left ?? 30;
            const y = b.yMin ?? b.top ?? 30;
            const w = b.width ?? (b.xMax - b.xMin) ?? 120;
            const h = b.height ?? (b.yMax - b.yMin) ?? 140;

            if (hasActiveViolation) {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(x, y, w, h);
              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText(
                `⚠️ Looking ${activeDirection}`,
                x,
                Math.max(16, y - 6)
              );
            } else if (isAllowedDownward) {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, w, h);
              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText('✓ Looking Down (Desk / Keyboard Allowed)', x, Math.max(16, y - 6));
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
      }
    };

    initModels();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (objectIntervalId) clearInterval(objectIntervalId);
      if (faceCheckIntervalId) clearInterval(faceCheckIntervalId);
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
