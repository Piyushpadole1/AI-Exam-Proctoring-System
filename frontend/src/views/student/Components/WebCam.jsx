import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceDetection from '@tensorflow-models/face-detection';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';

export default function WebCam({ onViolation, webcamRef }) {
  const internalWebcamRef = useRef(null);
  const actualWebcamRef = webcamRef || internalWebcamRef;
  const canvasRef = useRef(null);

  // Keep a ref to the latest onViolation callback to avoid stale closure issues
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const lastDetectionTimeRef = useRef({});
  const absenceStartRef = useRef(null);
  const headTurnStartRef = useRef(null);
  const gazeAwayStartRef = useRef(null);

  const handleDetection = (type, customDescription = null) => {
    const now = Date.now();
    const lastTime = lastDetectionTimeRef.current[type] || 0;

    // Cooldown per violation type
    const cooldown = type === 'CELL_PHONE_DETECTED' ? 4000 : type === 'MULTIPLE_FACES' ? 3500 : 5000;
    if (now - lastTime >= cooldown) {
      lastDetectionTimeRef.current[type] = now;

      let screenshot = null;
      try {
        if (actualWebcamRef.current && typeof actualWebcamRef.current.getScreenshot === 'function') {
          screenshot = actualWebcamRef.current.getScreenshot();
        }
      } catch (e) {
        console.warn('Screenshot capture failed:', e);
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

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    let cocoNet = null;
    let faceDetector = null;

    const initModels = async () => {
      try {
        // Load COCO-SSD for objects (phone, book, laptop, person)
        cocoNet = await cocossd.load();
        console.log('[WebCam] COCO-SSD model initialized successfully.');
      } catch (err) {
        console.warn('[WebCam] Error initializing COCO-SSD:', err);
      }

      try {
        // Load MediaPipe Face Detector for head turns & gaze tracking
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        faceDetector = await faceDetection.createDetector(model, {
          runtime: 'tfjs',
          maxFaces: 5,
        });
        console.log('[WebCam] Face Landmark Detector initialized successfully.');
      } catch (err) {
        console.warn('[WebCam] Face detector fallback mode enabled:', err.message);
      }

      if (!isMounted) return;

      // Start periodic proctoring detection loop (every 1 second)
      intervalId = setInterval(async () => {
        if (!isMounted) return;
        await runProctoringAnalysis(cocoNet, faceDetector);
      }, 1000);
    };

    const runProctoringAnalysis = async (coco, faceDet) => {
      if (
        !actualWebcamRef.current ||
        !actualWebcamRef.current.video ||
        actualWebcamRef.current.video.readyState !== 4
      ) {
        return;
      }

      const video = actualWebcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (!videoWidth || !videoHeight) return;

      if (canvasRef.current) {
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
      }

      const now = Date.now();
      let personCount = 0;
      let detectedCellPhone = false;

      // 1. COCO-SSD Object & Person Detection
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

            // Direct Phone Detection
            if (
              label === 'cell phone' ||
              label === 'phone' ||
              label === 'mobile phone' ||
              label === 'telephone'
            ) {
              detectedCellPhone = true;
              handleDetection(
                'CELL_PHONE_DETECTED',
                'Cell phone detected in student webcam field of view'
              );
            }

            // Prohibited Study Material / Electronic Devices
            if (label === 'book' || label === 'laptop') {
              handleDetection(
                'PROHIBITED_OBJECT',
                `Prohibited object (${label}) detected during examination`
              );
            }

            if (label === 'person') {
              personCount++;
            }
          });
        } catch (cocoErr) {
          console.warn('[WebCam] COCO analysis error:', cocoErr);
        }
      }

      // 2. Face Detection & Landmark Gaze / Head Turn Tracking
      let faces = [];
      if (faceDet) {
        try {
          faces = await faceDet.estimateFaces(video, { flipHorizontal: false });
        } catch (fErr) {
          // fallback
        }
      }

      // Check multiple persons / faces
      const totalFaces = Math.max(personCount, faces.length);

      // Draw real-time detection boxes on canvas for instant visual feedback
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');

        if (totalFaces > 1) {
          // Highlight multiple faces/persons in RED
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.font = 'bold 15px sans-serif';
          ctx.fillStyle = '#ef4444';

          faces.forEach((f, idx) => {
            const b = f.box;
            if (b) {
              const x = b.xMin ?? b.left ?? 0;
              const y = b.yMin ?? b.top ?? 0;
              const w = b.width ?? (b.xMax - b.xMin) ?? 100;
              const h = b.height ?? (b.yMax - b.yMin) ?? 100;
              ctx.strokeRect(x, y, w, h);
              ctx.fillText(`⚠️ Person ${idx + 1} Detected`, x, Math.max(16, y - 6));
            }
          });

          // Top warning banner
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(0, 0, videoWidth, 34);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(`⚠️ PROCTORING ALERT: MULTIPLE INDIVIDUALS (${totalFaces}) DETECTED`, 15, 22);
        } else if (faces.length === 1) {
          // Single face verified in GREEN
          const f = faces[0];
          const b = f.box;
          if (b) {
            const x = b.xMin ?? b.left ?? 0;
            const y = b.yMin ?? b.top ?? 0;
            const w = b.width ?? (b.xMax - b.xMin) ?? 100;
            const h = b.height ?? (b.yMax - b.yMin) ?? 100;

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = '#22c55e';
            ctx.fillText('✓ Face Verified', x, Math.max(16, y - 6));
          }
        } else if (totalFaces === 0) {
          // Top warning banner for no face
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.fillRect(0, 0, videoWidth, 34);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('⚠️ PROCTORING ALERT: NO FACE DETECTED - PLEASE FACE SCREEN', 15, 22);
        }
      }

      // Check multiple persons / faces violation
      if (totalFaces > 1) {
        handleDetection(
          'MULTIPLE_FACES',
          `Multiple individuals (${totalFaces}) detected in camera view`
        );
      }

      // Check absence / no face
      if (totalFaces === 0) {
        if (!absenceStartRef.current) {
          absenceStartRef.current = now;
        } else if (now - absenceStartRef.current >= 3000) {
          // Sustained absence for >= 3 seconds
          handleDetection(
            'NO_FACE_DETECTED',
            'Candidate not visible in front of camera for more than 3 seconds'
          );
        }
      } else {
        absenceStartRef.current = null;
      }

      // Check Head Turning & Gaze Deviation using Keypoints
      if (faces.length === 1) {
        const face = faces[0];
        const keypoints = face.keypoints || [];
        const rightEye = keypoints.find((k) => k.name === 'rightEye');
        const leftEye = keypoints.find((k) => k.name === 'leftEye');
        const nose = keypoints.find((k) => k.name === 'noseTip');

        if (rightEye && leftEye && nose) {
          const eyeDistance = Math.abs(leftEye.x - rightEye.x);
          const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
          const noseRatioX = (nose.x - eyeMidpointX) / Math.max(1, eyeDistance);

          // Head Turn Check: nose is shifted significantly to one side
          const isTurned = Math.abs(noseRatioX) > 0.32;
          if (isTurned) {
            if (!headTurnStartRef.current) {
              headTurnStartRef.current = now;
            } else if (now - headTurnStartRef.current >= 2500) {
              handleDetection(
                'HEAD_TURNED',
                'Student head turned away from computer screen'
              );
            }
          } else {
            headTurnStartRef.current = null;
          }

          // Eye Gaze Check: gaze shifted vertically or looking down/away
          const eyeMidpointY = (leftEye.y + rightEye.y) / 2;
          const noseOffsetY = nose.y - eyeMidpointY;
          const isGazeAway =
            isTurned ||
            noseOffsetY < 0.1 * eyeDistance ||
            noseOffsetY > 1.25 * eyeDistance;

          if (isGazeAway) {
            if (!gazeAwayStartRef.current) {
              gazeAwayStartRef.current = now;
            } else if (now - gazeAwayStartRef.current >= 3000) {
              handleDetection(
                'EYE_GAZE_AWAY',
                'Student looking away from exam screen for more than 3 seconds'
              );
            }
          } else {
            gazeAwayStartRef.current = null;
          }
        }
      } else if (personCount === 1 && faces.length === 0) {
        // Fallback: If only COCO person detected, check bounding box centering
        absenceStartRef.current = null;
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
