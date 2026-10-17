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
  InputLabel,
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
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/Shield';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router';
import { useCheatingLog } from 'src/context/CheatingLogContext';

const STARTER_TEMPLATES = {
  javascript: `// JavaScript (Node.js)
// Read input using readline or process.argv if required
function solution(input) {
    // Write your code here
    return input;
}

// Example execution
const fs = require('fs');
try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (input) console.log(solution(input));
} catch (e) {
    console.log(solution(""));
}
`,
  python: `# Python 3
import sys

def solution(data):
    # Write your solution here
    return data

if __name__ == "__main__":
    raw_input = sys.stdin.read().strip()
    if raw_input:
        print(solution(raw_input))
`,
  java: `// Java 21
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            String input = scanner.nextLine();
            // Process input
            System.out.println(input);
        }
        scanner.close();
    }
}
`,
  c: `// C (GCC)
#include <stdio.h>
#include <string.h>

int main() {
    char input[1024];
    if (fgets(input, sizeof(input), stdin)) {
        // Process input
        printf("%s", input);
    }
    return 0;
}
`,
  cpp: `// C++ (G++)
#include <iostream>
#include <string>

using namespace std;

int main() {
    string input;
    if (getline(cin, input)) {
        // Process input
        cout << input << endl;
    }
    return 0;
}
`,
};

export default function Coder() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { cheatingLog, updateCheatingLog } = useCheatingLog();

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

  // Proctoring States
  const [violationsCount, setViolationsCount] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const lastViolationTime = useRef({});
  const webcamRef = useRef(null);

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

  // Log Violation Handler with Cooldown and 6-Violation Auto-Disqualification
  const logProctoringViolation = useCallback(
    async (eventType, description, evidenceUrl = null) => {
      const now = Date.now();
      const last = lastViolationTime.current[eventType] || 0;
      if (now - last < 4000) return; // 4s cooldown per type
      lastViolationTime.current[eventType] = now;

      const newCount = violationsCount + 1;
      setViolationsCount(newCount);

      toast.warn(`Proctoring Warning: ${description} (Violation ${newCount}/6)`);

      // Send to backend
      try {
        await axiosInstance.post(
          '/api/proctoring/events',
          {
            sessionId: sessionId || examId,
            eventType,
            confidence: 1.0,
            description,
            evidenceUrl,
            examId,
          },
          { withCredentials: true }
        );
      } catch (err) {
        console.warn('Could not post proctoring event:', err.message);
      }

      // Check 6-violation rule
      if (newCount >= 6 && !isDisqualified) {
        setIsDisqualified(true);
        setDisqualifyDialogOpen(true);
        // Auto-submit current solution
        try {
          await axiosInstance.post(
            '/api/coding/submit',
            {
              examId,
              questionId,
              code,
              language,
            },
            { withCredentials: true }
          );
        } catch (subErr) {
          console.warn('Auto-submit on disqualification failed:', subErr);
        }
      }
    },
    [violationsCount, isDisqualified, sessionId, examId, questionId, code, language]
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

  // Reset Code
  const handleResetCode = () => {
    if (STARTER_TEMPLATES[language]) {
      setCode(STARTER_TEMPLATES[language]);
      toast.info('Editor reset to starter template');
    }
  };

  // Run Code (Sample Test Cases)
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveConsoleTab(0);
    setConsoleOutput('Executing code against sample test cases in secure sandbox...');

    try {
      const payload = {
        code,
        language,
        examId,
        questionId: questionId || (question ? question._id : null),
        input: customInput || null,
        runOnly: true,
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
  const handleSubmitSolution = async () => {
    setIsSubmitting(true);
    setActiveConsoleTab(0);
    setConsoleOutput('Submitting solution against all test cases (sample + hidden)...');

    try {
      const payload = {
        code,
        language,
        examId,
        questionId: questionId || (question ? question._id : null),
        runOnly: false,
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
          {/* Proctoring Status Pill */}
          <Chip
            icon={<ShieldIcon />}
            label={`Violations: ${violationsCount}/6`}
            color={violationsCount >= 5 ? 'error' : violationsCount > 0 ? 'warning' : 'success'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />

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
              startIcon={<RestartAltIcon />}
              onClick={handleResetCode}
              sx={{ color: '#aaa', textTransform: 'none' }}
            >
              Reset Starter Code
            </Button>

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

      {/* Disqualification / Termination Dialog (6 Violations) */}
      <Dialog open={disqualifyDialogOpen} disableEscapeKeyDown>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Exam Terminated: Violation Threshold Exceeded
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You have accumulated <strong>{violationsCount}</strong> malpractice violations during this proctored exam session.
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            Under institutional proctoring regulations, reaching 6 violations results in immediate session termination. Your work submitted up to this point has been recorded and submitted for teacher review.
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
