import * as faceapi from '@vladmandic/face-api';

let modelsLoadedPromise = null;

/**
 * Loads face-api.js model weights from public/models.
 */
export async function loadFaceApiModels() {
  if (modelsLoadedPromise) return modelsLoadedPromise;

  modelsLoadedPromise = (async () => {
    const MODEL_URL = '/models';
    try {
      console.log('[FaceRecognition] Loading face models from', MODEL_URL);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]);
      console.log('[FaceRecognition] Models loaded successfully.');
      return true;
    } catch (err) {
      console.warn('[FaceRecognition] Local model load failed, attempting fallback:', err);
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        return true;
      } catch (e2) {
        console.error('[FaceRecognition] All model loads failed:', e2);
        throw e2;
      }
    }
  })();

  return modelsLoadedPromise;
}

/**
 * Converts a base64 string or image element into an HTMLImageElement.
 */
export function createImageFromSource(source) {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement || source instanceof HTMLVideoElement) {
      resolve(source);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image from source'));
    img.src = source;
  });
}

/**
 * Measures image brightness (average luminance 0-255).
 */
export function calculateBrightness(canvasOrImg) {
  const canvas = document.createElement('canvas');
  const w = canvasOrImg.videoWidth || canvasOrImg.naturalWidth || canvasOrImg.width || 300;
  const h = canvasOrImg.videoHeight || canvasOrImg.naturalHeight || canvasOrImg.height || 200;
  canvas.width = Math.min(w, 200);
  canvas.height = Math.min(h, 200);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(canvasOrImg, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let totalLuminance = 0;
  const count = imgData.length / 4;
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return totalLuminance / count;
}

/**
 * Evaluates an image for single face detection, brightness, and extracts 128-d descriptor.
 */
export async function analyzeFace(imageSource) {
  await loadFaceApiModels();
  const imgElement = await createImageFromSource(imageSource);

  // 1. Check brightness
  const brightness = calculateBrightness(imgElement);
  if (brightness < 38) {
    return {
      success: false,
      error: 'TOO_DARK',
      message: 'Photo is too dark (average brightness: ' + Math.round(brightness) + '/255). Please ensure your face is well-lit.',
    };
  }
  if (brightness > 245) {
    return {
      success: false,
      error: 'TOO_BRIGHT',
      message: 'Photo is overexposed/too bright. Please avoid strong backlight.',
    };
  }

  // 2. Detect all faces to ensure EXACTLY one person is present
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  let detections = await faceapi.detectAllFaces(imgElement, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  // If tiny detector finds nothing, try full ssdMobilenetv1
  if (detections.length === 0 && faceapi.nets.ssdMobilenetv1.isLoaded) {
    detections = await faceapi.detectAllFaces(imgElement)
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  if (detections.length === 0) {
    return {
      success: false,
      error: 'NO_FACE',
      message: 'No clear face detected in the photo. Please center your face and look directly at the camera.',
    };
  }

  if (detections.length > 1) {
    return {
      success: false,
      error: 'MULTIPLE_FACES',
      message: `Multiple faces (${detections.length}) detected. Only the registered student may be in the photo.`,
    };
  }

  const match = detections[0];
  const box = match.detection.box;
  if (box.width < 50 || box.height < 50) {
    return {
      success: false,
      error: 'FACE_TOO_SMALL',
      message: 'Face is too far from camera. Please move closer.',
    };
  }

  const descriptor = Array.from(match.descriptor);
  const leftEye = match.landmarks ? match.landmarks.getLeftEye() : null;
  const rightEye = match.landmarks ? match.landmarks.getRightEye() : null;
  const nose = match.landmarks ? match.landmarks.getNose() : null;
  const leftEAR = leftEye ? calculateEyeAspectRatio(leftEye) : 0.3;
  const rightEAR = rightEye ? calculateEyeAspectRatio(rightEye) : 0.3;
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  return {
    success: true,
    descriptor,
    brightness: Math.round(brightness),
    confidence: Math.round(match.detection.score * 100),
    ear: Math.round(avgEAR * 1000) / 1000,
    nosePoint: nose && nose[3] ? { x: Math.round(nose[3].x), y: Math.round(nose[3].y) } : null,
    box: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
  };
}

/**
 * Calculates Eye Aspect Ratio (EAR) from 6 landmark points of an eye.
 */
export function calculateEyeAspectRatio(eyeLandmarks) {
  if (!eyeLandmarks || eyeLandmarks.length < 6) return 0.3;
  const dV1 = Math.hypot(eyeLandmarks[1].x - eyeLandmarks[5].x, eyeLandmarks[1].y - eyeLandmarks[5].y);
  const dV2 = Math.hypot(eyeLandmarks[2].x - eyeLandmarks[4].x, eyeLandmarks[2].y - eyeLandmarks[4].y);
  const dH = Math.hypot(eyeLandmarks[0].x - eyeLandmarks[3].x, eyeLandmarks[0].y - eyeLandmarks[3].y);
  if (dH <= 0) return 0.3;
  return (dV1 + dV2) / (2.0 * dH);
}

/**
 * Calculates Euclidean distance between two 128-d vectors.
 * Distance < 0.40 indicates a match (same person).
 */
export function calculateEuclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Verifies that 3 photo descriptors belong to the same person.
 */
export function verifyThreePhotosSamePerson(descriptors, threshold = 0.40) {
  if (!descriptors || descriptors.length !== 3) {
    return {
      matches: false,
      message: 'Exactly 3 face descriptors are required for verification.',
    };
  }

  const d12 = calculateEuclideanDistance(descriptors[0], descriptors[1]);
  const d13 = calculateEuclideanDistance(descriptors[0], descriptors[2]);
  const d23 = calculateEuclideanDistance(descriptors[1], descriptors[2]);

  const maxDist = Math.max(d12, d13, d23);
  if (maxDist >= threshold) {
    return {
      matches: false,
      distances: { d12, d13, d23 },
      message: 'Photo identity mismatch: The 3 photos do not appear to be of the same person. Please ensure all 3 photos are of yourself.',
    };
  }

  // Calculate normalized average descriptor
  const dim = descriptors[0].length;
  const avg = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    avg[i] = (descriptors[0][i] + descriptors[1][i] + descriptors[2][i]) / 3;
  }

  // Unit normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += avg[i] * avg[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) avg[i] /= norm;
  }

  return {
    matches: true,
    distances: { d12, d13, d23 },
    averageDescriptor: avg,
    confidence: Math.round((1 - maxDist / threshold) * 100),
  };
}

/**
 * Live identity matcher: compares live face descriptor against stored average descriptor.
 */
export function verifyLiveMatch(liveDescriptor, storedAverageDescriptor, threshold = 0.40) {
  if (!liveDescriptor || !storedAverageDescriptor) {
    return { matches: false, distance: 1.0, message: 'Descriptors missing for comparison' };
  }
  const distance = calculateEuclideanDistance(liveDescriptor, storedAverageDescriptor);
  const matches = distance < threshold;
  return {
    matches,
    distance: Math.round(distance * 1000) / 1000,
    threshold,
    confidence: Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100))),
  };
}
