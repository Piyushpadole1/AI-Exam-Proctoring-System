import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import axiosInstance from '../../axios';
import WebCam from './Components/WebCam';
import {
  Button,
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  TextField,
  Collapse,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ShieldIcon from '@mui/icons-material/Shield';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router';
import AudioMonitor from './Components/AudioMonitor';
import { playSiren, unlockAudio } from '../../utils/siren';
import PROCTORING_CONFIG from '../../config/proctoring';

const STARTER_TEMPLATES = {
  javascript: `// JavaScript (Node.js) - Write your code from scratch
`,
  python: `# Python 3 - Write your code from scratch
`,
  java: `// Java 21 - Write your code from scratch
public class Solution {
    public static void main(String[] args) {
        // Write your code here
    }
}
`,
  c: `// C (GCC) - Write your code from scratch
#include <stdio.h>

int main() {
    // Write your code here
    return 0;
}
`,
  cpp: `// C++ (G++) - Write your code from scratch
#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}
`,
};

export default function Coder() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);
  const [customInput, setCustomInput] = useState('');
  const [showInputBox, setShowInputBox] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [summaryStatus, setSummaryStatus] = useState(null);
  const [marksEarned, setMarksEarned] = useState(null);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [activeConsoleTab, setActiveConsoleTab] = useState(0);

  // Proctoring States (100-Point Integrity Model)
  const [integrityScore, setIntegrityScore] = useState(100);
  const [headGazeCount, setHeadGazeCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const lastViolationTime = useRef({});
  const webcamRef = useRef(null);

  // Unlock AudioContext for Siren on user/mount
  useEffect(() => {
    unlockAudio();
  }, []);

  // Timer & Code Tracking State
  const [timeLeft, setTimeLeft] = useState(null);
  const startTimeRef = useRef(Date.now());
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Fetch Exam and Coding Question
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch Exam to check hasCodingRound
        const examRes = await axiosInstance.get(`/api/users/exam/${examId}`);
        const examData = examRes.data;
        setExam(examData);

        if (examData && examData.hasCodingRound === false) {
          toast.info('This exam does not include a coding round. Redirecting to results.');
          navigate('/result');
          return;
        }

        // Fetch Coding Question
        const qRes = await axiosInstance.get(`/api/coding/questions/exam/${examId}`);
        if (qRes.data?.success && qRes.data?.data) {
          const q = qRes.data.data;
          setQuestion(q);
          setQuestionId(q._id || q.id);

          const defaultLang = q.language && STARTER_TEMPLATES[q.language] ? q.language : 'javascript';
          setLanguage(defaultLang);
          setCode(STARTER_TEMPLATES[defaultLang]);

          // Set problem countdown duration (in seconds)
          let durationSec = 1800; // default 30 mins
          if (q.timeLimitMinutes && q.timeLimitMinutes > 0) {
            durationSec = q.timeLimitMinutes * 60;
          } else if (examData?.durationMinutes && examData.durationMinutes > 0) {
            durationSec = examData.durationMinutes * 60;
          }
          setTimeLeft(durationSec);
          startTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to load coding round data:', err);
        toast.error('Failed to load coding round details');
      } finally {
        setIsLoading(false);
      }
    };

    if (examId) fetchData();
  }, [examId, navigate]);

  // Retrieve active session ID for proctoring events
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const res = await axiosInstance.get(`/api/students/active-attempt/${examId}`);
        if (res.data?.attemptId || res.data?.id) {
          setSessionId(res.data.attemptId || res.data.id);
        }
      } catch (e) {
        // Fallback to examId
        setSessionId(examId);
      }
    };
    fetchSessionId();
  }, [examId]);

  // Log Violation Handler with 100-Point Deductions, Cooldown, Siren, and Auto-Disqualification
  const logProctoringViolation = useCallback(
    async (eventType, description, evidenceUrl = null) => {
      const now = Date.now();
      const last = lastViolationTime.current[eventType] || 0;
      if (now - last < 4000) return; // 4s cooldown per type
      lastViolationTime.current[eventType] = now;

      // Play Siren Alert
      playSiren();

      const isHeadGaze = eventType.includes('HEAD') || eventType.includes('GAZE');
      const isFullscreen =
        eventType.includes('FULLSCREEN') ||
        eventType.includes('TAB_SWITCH') ||
        eventType.includes('WINDOW_BLUR');

      let nextHeadGaze = headGazeCount;
      if (isHeadGaze) {
        nextHeadGaze = headGazeCount + 1;
        setHeadGazeCount(nextHeadGaze);
      }

      let nextFullscreen = fullscreenExits;
      if (isFullscreen) {
        nextFullscreen = fullscreenExits + 1;
        setFullscreenExits(nextFullscreen);
        if (nextFullscreen === 1) {
          setFullscreenPromptOpen(true);
        }
      }

      // Calculate deduction according to 100-point model
      let deduction = 0;
      if (eventType.includes('CELL') || eventType.includes('PHONE') || eventType.includes('LAPTOP')) {
        deduction = PROCTORING_CONFIG?.INTEGRITY_SYSTEM?.DEDUCTIONS?.MOBILE_PHONE || 50;
      } else if (eventType.includes('MULTIPLE')) {
        deduction = PROCTORING_CONFIG?.INTEGRITY_SYSTEM?.DEDUCTIONS?.MULTIPLE_FACES || 30;
      } else if (eventType.includes('NO_FACE') || eventType.includes('NOT_VISIBLE')) {
        deduction = PROCTORING_CONFIG?.INTEGRITY_SYSTEM?.DEDUCTIONS?.NO_PERSON || 20;
      } else if (isHeadGaze) {
        if (nextHeadGaze > (PROCTORING_CONFIG?.INTEGRITY_SYSTEM?.DEDUCTIONS?.HEAD_GAZE_FREE_WARNINGS || 10)) {
          deduction = PROCTORING_CONFIG?.INTEGRITY_SYSTEM?.DEDUCTIONS?.HEAD_GAZE_PENALTY_POINTS || 5;
        }
      }

      const tentativeScore = Math.max(0, integrityScore - deduction);
      setIntegrityScore(tentativeScore);
      setTotalViolations((p) => p + 1);

      // Warning Feedback Toast
      let toastMsg = '';
      if (isHeadGaze) {
        toastMsg = nextHeadGaze <= 10
          ? `⚠️ Warning ${nextHeadGaze} of 10: Head movement / eye gaze looking away`
          : `⚠️ Warning ${nextHeadGaze}: Head/eye movement detected (5 points deducted)`;
      } else if (isFullscreen) {
        toastMsg = nextFullscreen === 1
          ? '⚠️ Fullscreen Exit Warning (1 of 2): Return to fullscreen immediately!'
          : '🚨 Exam Disqualified: Fullscreen exit limit exceeded (2/2)!';
      } else if (deduction > 0) {
        toastMsg = `⚠️ ${description || eventType} (-${deduction} points deducted)`;
      } else {
        toastMsg = `⚠️ Warning: ${description || eventType}`;
      }
      toast.warn(toastMsg);

      // Send to backend
      let backendScore = tentativeScore;
      let shouldTerminate = tentativeScore <= 0 || (isFullscreen && nextFullscreen >= 2);
      let termReason = tentativeScore <= 0 ? 'Integrity score reached 0' : (isFullscreen && nextFullscreen >= 2 ? 'Left fullscreen twice' : '');

      try {
        const response = await axiosInstance.post(
          '/api/proctoring/events',
          {
            sessionId: sessionId || examId,
            eventType,
            confidence: 1.0,
            description: description || toastMsg,
            evidenceUrl,
            examId,
            metadata: {
              warningNumber: isHeadGaze ? nextHeadGaze : null,
              fullscreenStrike: isFullscreen ? nextFullscreen : null,
            },
          },
          { withCredentials: true }
        );

        if (response.data) {
          if (response.data.integrityScore !== undefined) {
            backendScore = response.data.integrityScore;
            setIntegrityScore(backendScore);
          }
          if (response.data.shouldTerminate || backendScore <= 0) {
            shouldTerminate = true;
          }
          if (response.data.terminationReason) {
            termReason = response.data.terminationReason;
          }
        }
      } catch (err) {
        console.warn('Could not post proctoring event:', err.message);
      }

      // Check Termination
      if ((shouldTerminate || isDisqualified) && !isDisqualified) {
        setIsDisqualified(true);
        setTerminationReason(termReason || (backendScore <= 0 ? 'Integrity score reached 0' : 'Violation threshold exceeded'));
        setDisqualifyDialogOpen(true);
        // Auto-submit current solution
        try {
          await axiosInstance.post(
            '/api/coding/submit',
            {
              examId,
              questionId: questionId || (question ? question._id : null),
              code: codeRef.current || code,
              language,
              runOnly: false,
            },
            { withCredentials: true }
          );
        } catch (subErr) {
          console.warn('Auto-submit on disqualification failed:', subErr);
        }
      }
    },
    [integrityScore, headGazeCount, fullscreenExits, isDisqualified, sessionId, examId, questionId, question, code, language]
  );

  // Fullscreen and Security Listeners
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request bypassed:', e);
      }
    };
    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logProctoringViolation('FULLSCREEN_EXIT', 'Exited fullscreen mode during exam');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringViolation('TAB_SWITCH', 'Switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      logProctoringViolation('WINDOW_BLUR', 'Focus lost from exam test window');
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      logProctoringViolation('CLIPBOARD_COPY_PASTE', 'Copy / Paste attempt prevented');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      logProctoringViolation('RIGHT_CLICK', 'Context menu / Right click attempt prevented');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [logProctoringViolation]);

  // Handle WebCam camera violation callback
  const handleWebCamViolation = useCallback(
    (violation) => {
      logProctoringViolation(
        violation.eventType,
        violation.description || 'Webcam proctor violation',
        violation.evidenceUrl || violation.screenshot
      );
    },
    [logProctoringViolation]
  );

  // Language Change
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (STARTER_TEMPLATES[newLang]) {
      setCode(STARTER_TEMPLATES[newLang]);
    }
  };

  // Problem countdown timer & Auto-submit
  const handleAutoSubmitOnExpiry = useCallback(async () => {
    toast.warning('Time limit expired! Automatically submitting your solution...');
    try {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      const currentCode = codeRef.current || '';
      await axiosInstance.post(
        '/api/coding/submit',
        {
          code: currentCode,
          language,
          examId,
          questionId: questionId || (question ? question._id : null),
          runOnly: false,
          timeTakenSeconds: elapsedSeconds,
        },
        { withCredentials: true }
      );
      toast.info('Time expired: Solution auto-submitted.');
      navigate('/result');
    } catch (e) {
      console.warn('Auto submit failed on timer expiry:', e);
      navigate('/result');
    }
  }, [examId, questionId, question, language, navigate]);

  useEffect(() => {
    if (timeLeft === null || isDisqualified) return;
    if (timeLeft <= 0) {
      handleAutoSubmitOnExpiry();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isDisqualified, handleAutoSubmitOnExpiry]);

  // Run Code (Sample Test Cases)
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveConsoleTab(0);
    setConsoleOutput('Executing code against sample test cases in secure sandbox...');

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    try {
      const payload = {
        code,
        language,
        examId,
        questionId: questionId || (question ? question._id : null),
        input: customInput || null,
        runOnly: true,
        timeTakenSeconds: elapsedSeconds,
      };

      const res = await axiosInstance.post('/api/coding/run', payload, { withCredentials: true });
      const data = res.data;

      if (data && data.testResults) {
        setTestResults(data.testResults);
        setSummaryStatus(data.status);
        setMarksEarned(data.marksEarned);
        setConsoleOutput(
          `Executed ${data.testResults.length} test case(s).\nStatus: ${data.status}\nPassed: ${data.passedCount}/${data.testResults.length}`
        );
      } else if (data && typeof data === 'object') {
        const out = data.output || data.result || data.message || 'Execution finished.';
        setConsoleOutput(out);
        setTestResults([]);
      }
    } catch (err) {
      console.error('Run code error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Execution error';
      setConsoleOutput(`Error: ${errMsg}`);
      toast.error('Code execution failed: ' + errMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Solution (All Test Cases + Scoring + Academic Score Update)
  const handleSubmitSolution = async (isAutoSubmit = false) => {
    setIsSubmitting(true);
    setActiveConsoleTab(0);
    setConsoleOutput(isAutoSubmit ? 'Auto-submitting solution on time expiry...' : 'Submitting solution against all test cases (sample + hidden)...');

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const currentCode = codeRef.current || code;

    try {
      const payload = {
        code: currentCode,
        language,
        examId,
        questionId: questionId || (question ? question._id : null),
        runOnly: false,
        timeTakenSeconds: elapsedSeconds,
      };

      const res = await axiosInstance.post('/api/coding/submit', payload, { withCredentials: true });
      const data = res.data;

      if (data && data.testResults) {
        setTestResults(data.testResults);
        setSummaryStatus(data.status);
        setMarksEarned(data.marksEarned);

        const passed = data.passedCount;
        const total = data.totalCases || data.testResults.length;
        const marks = data.marksEarned;
        const totalMarks = data.questionMarks || 20;

        setConsoleOutput(
          `Official Evaluation Result:\nStatus: ${data.status}\nPassed: ${passed}/${total} test cases\nMarks Earned: ${marks}/${totalMarks}`
        );

        toast.success(`Solution Submitted! Status: ${data.status}. Score Earned: ${marks}/${totalMarks}`);

        setTimeout(() => {
          navigate('/result');
        }, 2500);
      } else {
        toast.success('Solution submitted successfully!');
        navigate('/result');
      }
    } catch (err) {
      console.error('Submit solution error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Submission error';
      setConsoleOutput(`Submission Error: ${errMsg}`);
      toast.error('Failed to submit solution: ' + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={40} />
      </Box>
    );
  }

  const sampleCases = question?.sampleTestCases || [
    { input: 'Example Input', expectedOutput: 'Example Output', explanation: 'Standard example' },
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8' }}>
      {/* Top Navigation Bar */}
      <Box
        sx={{
          px: 3,
          py: 1,
          bgcolor: '#1a1f2c',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight="bold">
            {exam?.examName || 'Exam'} — Coding Round
          </Typography>
          {question?.difficulty && (
            <Chip
              label={question.difficulty}
              size="small"
              color={
                question.difficulty === 'Easy'
                  ? 'success'
                  : question.difficulty === 'Medium'
                  ? 'warning'
                  : 'error'
              }
            />
          )}
          <Chip
            label={`${question?.marks || exam?.codingMarks || 20} Marks`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ color: '#90caf9', borderColor: '#90caf9' }}
          />
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          {/* Problem Countdown Timer */}
          <Chip
            icon={<AccessTimeIcon sx={{ color: '#fff !important' }} />}
            label={`Time Left: ${Math.floor((timeLeft || 0) / 60)
              .toString()
              .padStart(2, '0')}:${((timeLeft || 0) % 60).toString().padStart(2, '0')}`}
            color={timeLeft !== null && timeLeft < 300 ? 'error' : timeLeft !== null && timeLeft < 600 ? 'warning' : 'primary'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />

          {/* Integrity Score Chip */}
          <Chip
            icon={<ShieldIcon />}
            label={`Integrity: ${integrityScore}/100`}
            color={integrityScore >= 70 ? 'success' : integrityScore >= 30 ? 'warning' : 'error'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />

          {/* Head / Eye Warnings Chip */}
          <Chip
            label={`Head/Eye: ${headGazeCount}/10`}
            size="small"
            sx={{
              fontWeight: 600,
              color: '#fff',
              bgcolor: headGazeCount > 10 ? '#d32f2f' : headGazeCount > 5 ? '#ed6c02' : 'rgba(255,255,255,0.15)',
            }}
          />

          {/* Fullscreen Strikes Chip */}
          <Chip
            label={`Fullscreen: ${fullscreenExits}/2`}
            size="small"
            sx={{
              fontWeight: 600,
              color: '#fff',
              bgcolor: fullscreenExits >= 2 ? '#d32f2f' : fullscreenExits === 1 ? '#ed6c02' : 'rgba(255,255,255,0.15)',
            }}
          />

          {totalViolations > 0 && (
            <Chip
              label={`Violations: ${totalViolations}`}
              size="small"
              sx={{
                fontWeight: 600,
                color: '#fff',
                bgcolor: '#d32f2f',
              }}
            />
          )}

          <Tooltip title="Toggle Fullscreen">
            <IconButton
              size="small"
              sx={{ color: '#fff' }}
              onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
              }}
            >
              <FullscreenIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            color="inherit"
            startIcon={<PlayArrowIcon />}
            disabled={isRunning || isSubmitting}
            onClick={handleRunCode}
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </Button>

          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<SendIcon />}
            disabled={isRunning || isSubmitting}
            onClick={handleSubmitSolution}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
          </Button>
        </Box>
      </Box>

      {/* Main Split Body */}
      <Grid container sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Pane: Problem Description & Test Cases (42%) */}
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            height: 'calc(100vh - 56px)',
            overflowY: 'auto',
            p: 3,
            bgcolor: '#ffffff',
            borderRight: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {question?.title || question?.question || 'Problem Statement'}
          </Typography>

          <Box my={2}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#333' }}>
              {question?.description || 'Implement the solution according to the requirements specified.'}
            </Typography>
          </Box>

          {question?.constraints && (
            <Box my={2.5} p={2} sx={{ bgcolor: '#f8f9fa', borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Constraints:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {question.constraints}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Sample Test Cases
          </Typography>

          <Stack spacing={2} mt={1.5}>
            {sampleCases.map((tc, idx) => (
              <Card key={idx} variant="outlined" sx={{ bgcolor: '#fafafa', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                    Example {idx + 1}:
                  </Typography>
                  <Box mb={1}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Input:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 1, bgcolor: '#ffffff', fontFamily: 'monospace', fontSize: '13px' }}
                    >
                      {tc.input || '(empty)'}
                    </Paper>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Expected Output:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 1, bgcolor: '#ffffff', fontFamily: 'monospace', fontSize: '13px' }}
                    >
                      {tc.expectedOutput || '(empty)'}
                    </Paper>
                  </Box>
                  {tc.explanation && (
                    <Typography variant="caption" color="textSecondary">
                      <strong>Explanation:</strong> {tc.explanation}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* Right Pane: Code Editor + Runner & Console (58%) */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{
            height: 'calc(100vh - 56px)',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#1e1e1e',
            position: 'relative',
          }}
        >
          {/* Floating Webcam Proctoring Pip (Top Right) */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 15,
              width: 170,
              height: 125,
              zIndex: 100,
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 5,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              bgcolor: '#000',
            }}
          >
            <WebCam
              webcamRef={webcamRef}
              onViolation={handleWebCamViolation}
            />
            <AudioMonitor
              onViolation={handleWebCamViolation}
              isActive={!isDisqualified}
            />
          </Box>

          {/* Editor Header Bar */}
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: '#252526',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderBottom: '1px solid #333',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                sx={{
                  color: '#fff',
                  bgcolor: '#333',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#888' },
                  fontSize: '13px',
                }}
              >
                <MenuItem value="javascript">JavaScript (Node.js)</MenuItem>
                <MenuItem value="python">Python 3</MenuItem>
                <MenuItem value="java">Java 21</MenuItem>
                <MenuItem value="c">C (GCC)</MenuItem>
                <MenuItem value="cpp">C++ (G++)</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="text"
              onClick={() => setShowInputBox((p) => !p)}
              sx={{ color: '#aaa', textTransform: 'none' }}
            >
              {showInputBox ? 'Hide Stdin' : 'Custom Input (stdin)'}
            </Button>
          </Box>

          {/* Collapsible Stdin Input */}
          <Collapse in={showInputBox}>
            <Box sx={{ p: 1.5, bgcolor: '#2d2d2d' }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Custom Stdin"
                placeholder="Enter custom input values to feed into standard input..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                sx={{
                  bgcolor: '#1e1e1e',
                  input: { color: '#fff' },
                  '& .MuiInputBase-input': { color: '#fff', fontFamily: 'monospace' },
                  '& .MuiInputLabel-root': { color: '#888' },
                }}
              />
            </Box>
          </Collapse>

          {/* Monaco Code Editor */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language={language === 'c' || language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={(val) => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          </Box>

          {/* Lower Test Results & Output Console */}
          <Box sx={{ height: 220, bgcolor: '#1e1e1e', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              value={activeConsoleTab}
              onChange={(e, val) => setActiveConsoleTab(val)}
              sx={{
                bgcolor: '#252526',
                minHeight: 36,
                '& .MuiTab-root': {
                  minHeight: 36,
                  color: '#888',
                  fontSize: '13px',
                  textTransform: 'none',
                  '&.Mui-selected': { color: '#90caf9' },
                },
              }}
            >
              <Tab label="Test Results & Grading" />
              <Tab label="Console Output" />
            </Tabs>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              {activeConsoleTab === 0 ? (
                <div>
                  {summaryStatus && (
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={summaryStatus}
                          color={
                            summaryStatus === 'Accepted'
                              ? 'success'
                              : summaryStatus === 'Partially Accepted'
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                        />
                        {marksEarned !== null && (
                          <Typography variant="body2" color="#fff">
                            Marks: <strong>{marksEarned}</strong> / {question?.marks || 20}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {testResults.length === 0 ? (
                    <Typography variant="body2" color="#888">
                      Click <strong>"Run Code"</strong> to test against sample cases, or <strong>"Submit Solution"</strong> to evaluate against all hidden test cases.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {testResults.map((tr, idx) => (
                        <Card
                          key={idx}
                          variant="outlined"
                          sx={{
                            bgcolor: '#252526',
                            borderColor: tr.passed ? '#2e7d32' : '#d32f2f',
                            p: 1.5,
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                              {tr.passed ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : (
                                <CancelIcon color="error" fontSize="small" />
                              )}
                              <Typography variant="subtitle2" color="#fff" fontWeight="bold">
                                Case {tr.testCase || idx + 1}: {tr.status}
                              </Typography>
                            </Box>
                            {tr.runtimeMs !== undefined && (
                              <Typography variant="caption" color="#aaa">
                                Runtime: {tr.runtimeMs}ms
                              </Typography>
                            )}
                          </Box>
                          <Grid container spacing={1} sx={{ fontSize: '12px', color: '#ccc', fontFamily: 'monospace' }}>
                            <Grid item xs={12} sm={4}>
                              <Box>Input: {tr.input}</Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box>Expected: {tr.expectedOutput}</Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{ color: tr.passed ? '#81c784' : '#e57373' }}>
                                Output: {tr.actualOutput}
                              </Box>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </div>
              ) : (
                <pre style={{ margin: 0, color: '#9cdcfe', fontFamily: 'monospace', fontSize: '13px' }}>
                  {consoleOutput || 'Standard output console is empty.'}
                </pre>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Fullscreen Exit Warning Dialog (Strike 1 of 2) */}
      <Dialog open={fullscreenPromptOpen} disableEscapeKeyDown>
        <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>
          ⚠️ Fullscreen Warning (Strike 1 of 2)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You have left or minimized the fullscreen proctoring window.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            You are granted exactly <strong>1 warning</strong>. Leaving fullscreen a second time will terminate your exam session immediately with 0 remaining integrity points.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              try {
                if (document.documentElement.requestFullscreen) {
                  await document.documentElement.requestFullscreen();
                }
              } catch (e) {
                console.warn(e);
              }
              setFullscreenPromptOpen(false);
            }}
          >
            Return to Fullscreen Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disqualification / Termination Dialog (100-Point Integrity Enforcement) */}
      <Dialog open={disqualifyDialogOpen} disableEscapeKeyDown>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Exam Terminated: Integrity Policy Enforced
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Reason: <strong>{terminationReason || (integrityScore <= 0 ? 'Integrity score reached 0' : 'Fullscreen exit limit exceeded')}</strong>
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            Final Integrity Score: <strong>{integrityScore} / 100</strong>.<br />
            Under institutional proctoring regulations, reaching 0 integrity points or repeatedly violating security boundaries results in immediate session termination. Your current code solution was automatically submitted for review.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => navigate('/result')}
          >
            Proceed to Results
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
