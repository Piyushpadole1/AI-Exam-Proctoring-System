import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,

  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import Webcam from 'react-webcam';
import { analyzeFace, verifyThreePhotosSamePerson } from '../../../utils/faceRecognition';

const SLOT_LABELS = [
  'Photo 1: Direct Front View',
  'Photo 2: Slight Angle View',
  'Photo 3: Natural Expression',
];

export default function StudentFaceCapture({ onFaceDataChange, consentAgreed, setConsentAgreed }) {
  const [photos, setPhotos] = useState([null, null, null]);
  const [descriptors, setDescriptors] = useState([null, null, null]);
  const [slotStatus, setSlotStatus] = useState(['pending', 'pending', 'pending']);
  const [slotError, setSlotError] = useState(['', '', '']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingSlot, setAnalyzingSlot] = useState(null);

  // WebCam Modal State
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const webcamRef = useRef(null);
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];

  // Cross-validation result
  const [crossValidation, setCrossValidation] = useState(null);

  // Analyze captured or uploaded image
  const processImage = useCallback(async (slotIndex, imageBase64) => {
    setIsAnalyzing(true);
    setAnalyzingSlot(slotIndex);
    setSlotError((prev) => {
      const copy = [...prev];
      copy[slotIndex] = '';
      return copy;
    });

    try {
      const result = await analyzeFace(imageBase64);
      if (!result.success) {
        setSlotStatus((prev) => {
          const copy = [...prev];
          copy[slotIndex] = 'error';
          return copy;
        });
        setSlotError((prev) => {
          const copy = [...prev];
          copy[slotIndex] = result.message;
          return copy;
        });
        setPhotos((prev) => {
          const copy = [...prev];
          copy[slotIndex] = null;
          return copy;
        });
        setDescriptors((prev) => {
          const copy = [...prev];
          copy[slotIndex] = null;
          return copy;
        });
      } else {
        const newPhotos = [...photos];
        newPhotos[slotIndex] = imageBase64;
        setPhotos(newPhotos);

        const newDescriptors = [...descriptors];
        newDescriptors[slotIndex] = result.descriptor;
        setDescriptors(newDescriptors);

        setSlotStatus((prev) => {
          const copy = [...prev];
          copy[slotIndex] = 'valid';
          return copy;
        });

        // If all 3 slots have descriptors, run cross-person validation
        if (newDescriptors[0] && newDescriptors[1] && newDescriptors[2]) {
          const crossCheck = verifyThreePhotosSamePerson(newDescriptors);
          setCrossValidation(crossCheck);
          if (crossCheck.matches && typeof onFaceDataChange === 'function') {
            onFaceDataChange({
              faceImages: newPhotos,
              faceEmbeddings: newDescriptors,
              averageEmbedding: crossCheck.averageDescriptor,
              isVerified: true,
            });
          } else if (!crossCheck.matches && typeof onFaceDataChange === 'function') {
            onFaceDataChange(null);
          }
        }
      }
    } catch (err) {
      setSlotStatus((prev) => {
        const copy = [...prev];
        copy[slotIndex] = 'error';
        return copy;
      });
      setSlotError((prev) => {
        const copy = [...prev];
        copy[slotIndex] = 'Face analysis failed: ' + err.message;
        return copy;
      });
    } finally {
      setIsAnalyzing(false);
      setAnalyzingSlot(null);
    }
  }, [descriptors, photos, onFaceDataChange]);

  const handleCaptureFromWebcam = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setWebcamOpen(false);
        processImage(activeSlot, imageSrc);
      }
    }
  };

  const handleFileUpload = (slotIndex, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSlotError((prev) => {
        const copy = [...prev];
        copy[slotIndex] = 'Please upload a valid image file (JPG, PNG, WebP).';
        return copy;
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      processImage(slotIndex, base64);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // Reset input so same file can be re-selected if retrying
  };

  const openWebcamForSlot = (slotIndex) => {
    setActiveSlot(slotIndex);
    setWebcamOpen(true);
  };

  const resetSlot = (slotIndex) => {
    setPhotos((prev) => {
      const copy = [...prev];
      copy[slotIndex] = null;
      return copy;
    });
    setDescriptors((prev) => {
      const copy = [...prev];
      copy[slotIndex] = null;
      return copy;
    });
    setSlotStatus((prev) => {
      const copy = [...prev];
      copy[slotIndex] = 'pending';
      return copy;
    });
    setSlotError((prev) => {
      const copy = [...prev];
      copy[slotIndex] = '';
      return copy;
    });
    setCrossValidation(null);
    if (typeof onFaceDataChange === 'function') onFaceDataChange(null);
  };

  return (
    <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraAltIcon color="primary" /> Biometric Face Verification Setup (Required for Students)
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        Please provide 3 clear photos of your face. You can use your <b>webcam</b> or <b>upload photos</b>.
        Our AI will verify that each photo has exactly one face, is well-lit, and that all 3 photos match the same person.
      </Typography>

      {/* 3 Photo Slots Grid */}
      <Grid container spacing={2}>
        {[0, 1, 2].map((slotIndex) => {
          const photo = photos[slotIndex];
          const status = slotStatus[slotIndex];
          const errorMsg = slotError[slotIndex];
          const isThisSlotAnalyzing = isAnalyzing && analyzingSlot === slotIndex;

          return (
            <Grid item xs={12} sm={4} key={slotIndex}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  borderColor:
                    status === 'valid'
                      ? 'success.main'
                      : status === 'error'
                      ? 'error.main'
                      : 'divider',
                  bgcolor: status === 'valid' ? '#f0fdf4' : status === 'error' ? '#fef2f2' : 'inherit',
                }}
              >
                <Box
                  sx={{
                    height: 160,
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {isThisSlotAnalyzing ? (
                    <Box textAlign="center">
                      <CircularProgress size={32} />
                      <Typography variant="caption" display="block" mt={1}>
                        Scanning face...
                      </Typography>
                    </Box>
                  ) : photo ? (
                    <CardMedia
                      component="img"
                      image={photo}
                      alt={SLOT_LABELS[slotIndex]}
                      sx={{ height: '100%', width: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box textAlign="center" p={2}>
                      <CameraAltIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                      <Typography variant="caption" color="textSecondary" display="block">
                        No photo captured yet
                      </Typography>
                    </Box>
                  )}

                  {status === 'valid' && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Verified"
                      color="success"
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 'bold' }}
                    />
                  )}
                </Box>

                <CardContent sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap title={SLOT_LABELS[slotIndex]}>
                    {SLOT_LABELS[slotIndex]}
                  </Typography>

                  {errorMsg && (
                    <Typography variant="caption" color="error" mt={0.5} sx={{ display: 'block' }}>
                      {errorMsg}
                    </Typography>
                  )}

                  <Box mt="auto" pt={1.5} display="flex" gap={1}>
                    {photo ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        startIcon={<ReplayIcon />}
                        onClick={() => resetSlot(slotIndex)}
                      >
                        Retake
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<CameraAltIcon />}
                          onClick={() => openWebcamForSlot(slotIndex)}
                          disabled={isAnalyzing}
                        >
                          Webcam
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          startIcon={<UploadFileIcon />}
                          onClick={() => fileInputRefs[slotIndex].current && fileInputRefs[slotIndex].current.click()}
                          disabled={isAnalyzing}
                        >
                          Upload
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRefs[slotIndex]}
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(slotIndex, e)}
                        />
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Cross-Validation Status */}
      {crossValidation && (
        <Box mt={2}>
          {crossValidation.matches ? (
            <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
              <b>Identity Confirmed:</b> All 3 photos match the same student (Similarity: {crossValidation.confidence}%). Biometric profile is ready!
            </Alert>
          ) : (
            <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />}>
              <b>Photo Mismatch:</b> {crossValidation.message}
            </Alert>
          )}
        </Box>
      )}

      {/* Mandatory Consent Checkbox */}
      <Box mt={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(consentAgreed)}
              onChange={(e) => setConsentAgreed(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              I agree to my face data being used for exam verification.
            </Typography>
          }
        />
      </Box>

      {/* Webcam Snapshot Capture Modal */}
      <Dialog open={webcamOpen} onClose={() => setWebcamOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Capture {SLOT_LABELS[activeSlot]}</Typography>
          <IconButton onClick={() => setWebcamOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#000',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              style={{ width: '100%', height: 'auto', maxHeight: 380, objectFit: 'contain' }}
            />
            {/* Centering Face Oval Guide */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200,
                height: 260,
                border: '2px dashed rgba(56, 189, 248, 0.8)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          </Box>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            Align your face within the guide in a well-lit room and click Snap Photo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWebcamOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" startIcon={<CameraAltIcon />} onClick={handleCaptureFromWebcam}>
            Snap Photo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
