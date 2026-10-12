import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import axiosInstance from '../../axios';
import Webcam from '../student/Components/WebCam';
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
} from '@mui/material';
import { useSaveCheatingLogMutation } from 'src/slices/cheatingLogApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router';
import { useCheatingLog } from 'src/context/CheatingLogContext';

const STARTER_TEMPLATES = {
  javascript: `// JavaScript Code
function solution() {
    console.log("Hello, World!");
}

solution();
`,
  python: `# Python Code
def solution():
    print("Hello, World!")

if __name__ == "__main__":
    solution()
`,
  java: `// Java Code
public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  c: `// C Code
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
  cpp: `// C++ Code
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
};

export default function Coder() {
  const [code, setCode] = useState(STARTER_TEMPLATES.javascript);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showInputBox, setShowInputBox] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [questionId, setQuestionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const { examId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { cheatingLog, updateCheatingLog } = useCheatingLog();
  const [saveCheatingLogMutation] = useSaveCheatingLogMutation();

  useEffect(() => {
    if (userInfo) {
      updateCheatingLog((prevLog) => ({
        ...prevLog,
        username: userInfo.name,
        email: userInfo.email,
      }));
    }
  }, [userInfo]);

  // Fetch coding question when component mounts
  useEffect(() => {
    const fetchCodingQuestion = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/api/coding/questions/exam/${examId}`, {
          withCredentials: true,
        });
        if (response.data.success && response.data.data) {
          setQuestionId(response.data.data._id);
          setQuestion(response.data.data);
          if (response.data.data.language && STARTER_TEMPLATES[response.data.data.language]) {
            setLanguage(response.data.data.language);
          }
          if (response.data.data.description) {
            const defaultLang = response.data.data.language || 'javascript';
            const template = STARTER_TEMPLATES[defaultLang] || '// Write your code here...';
            setCode(`// Task: ${response.data.data.question}\n// Description: ${response.data.data.description}\n\n${template}`);
          }
        } else {
          toast.info(response.data.message || 'No specific coding question found for this exam. You can practice coding freely.');
        }
      } catch (error) {
        console.error('Error fetching coding question:', error);
        toast.error(error?.response?.data?.message || 'Failed to load coding question');
      } finally {
        setIsLoading(false);
      }
    };

    if (examId) {
      fetchCodingQuestion();
    } else {
      setIsLoading(false);
    }
  }, [examId]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // If the editor currently has another starter template, replace with new starter template
    const currentMatchesTemplate = Object.values(STARTER_TEMPLATES).some(
      (tmpl) => code.trim() === tmpl.trim() || code.includes('// Write your code here...'),
    );
    if (currentMatchesTemplate && STARTER_TEMPLATES[newLang]) {
      setCode(STARTER_TEMPLATES[newLang]);
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Compiling and executing code in real-time...');

    let apiUrl;
    switch (language) {
      case 'python':
        apiUrl = '/run-python';
        break;
      case 'java':
        apiUrl = '/run-java';
        break;
      case 'javascript':
        apiUrl = '/run-javascript';
        break;
      case 'c':
        apiUrl = '/run-c';
        break;
      case 'cpp':
        apiUrl = '/run-cpp';
        break;
      default:
        apiUrl = '/api/coding/run';
        break;
    }

    try {
      const payload = {
        code,
        language,
        input: customInput || '',
      };

      const response = await axiosInstance.post(apiUrl, payload, { withCredentials: true });
      console.log('API Response:', response.data);

      if (typeof response.data === 'string') {
        setOutput(response.data || 'Program executed successfully with no output.');
      } else if (response.data && typeof response.data === 'object') {
        const out = response.data.output || response.data.error || response.data.result || response.data.message;
        setOutput(out || 'Program executed successfully with no output.');
      } else {
        setOutput(String(response.data));
      }
    } catch (error) {
      console.error('Error running code:', error);
      const errData = error?.response?.data;
      let errMsg = 'Error executing code.';
      if (typeof errData === 'string') {
        errMsg = errData;
      } else if (errData && typeof errData === 'object') {
        errMsg = errData.error || errData.output || errData.message || error.message;
      } else if (error.message) {
        errMsg = error.message;
      }
      setOutput(errMsg);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Starting submission with questionId:', questionId);
    console.log('Current code:', code);
    console.log('Selected language:', language);
    console.log('Current cheating log:', cheatingLog);

    try {
      const codeSubmissionData = {
        code,
        language,
        questionId: questionId || (question ? question._id : null),
        input: customInput || '',
      };

      console.log('Submitting code with data:', codeSubmissionData);

      const response = await axiosInstance.post('/api/coding/submit', codeSubmissionData, {
        withCredentials: true,
      });
      console.log('Submission response:', response.data);

      if (response.data.success) {
        try {
          const updatedLog = {
            ...cheatingLog,
            username: userInfo?.name || 'Student',
            email: userInfo?.email || 'student@test.com',
            examId: examId,
            noFaceCount: parseInt(cheatingLog.noFaceCount) || 0,
            multipleFaceCount: parseInt(cheatingLog.multipleFaceCount) || 0,
            cellPhoneCount: parseInt(cheatingLog.cellPhoneCount) || 0,
            prohibitedObjectCount: parseInt(cheatingLog.prohibitedObjectCount) || 0,
            screenshots: cheatingLog.screenshots || [],
          };

          const logResult = await saveCheatingLogMutation(updatedLog).unwrap();
          console.log('Cheating log saved successfully:', logResult);

          toast.success('Test submitted successfully!');
          navigate('/success');
        } catch (cheatingLogError) {
          console.error('Error saving cheating log:', cheatingLogError);
          toast.success('Test submitted successfully!');
          navigate('/success');
        }
      } else {
        console.error('Submission failed:', response.data);
        toast.error('Failed to submit code: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error during submission:', error.response?.data || error);
      toast.error(
        error?.response?.data?.message || error?.data?.message || 'Failed to submit test',
      );
    }
  };

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isLoading ? (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography>Loading question...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Question Section */}
          {question && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 1 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {question.question}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {question.description}
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* Main Content Area */}
          <Grid item xs={12} sx={{ display: 'flex', gap: 2, height: question ? 'calc(100vh - 220px)' : 'calc(100vh - 120px)' }}>
            {/* Code Editor Section */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    label="Language"
                    onChange={(e) => handleLanguageChange(e.target.value)}
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
                  variant="outlined"
                  onClick={() => setShowInputBox((prev) => !prev)}
                >
                  {showInputBox ? 'Hide Custom Input' : 'Add Custom Input (stdin)'}
                </Button>
              </Box>

              <Collapse in={showInputBox}>
                <Box sx={{ mb: 1.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    label="Standard Input (stdin)"
                    placeholder="Enter input for programs reading from stdin (e.g., input(), Scanner, cin)..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                  />
                </Box>
              </Collapse>

              {/* Monaco Editor */}
              <Box sx={{ flex: 1, minHeight: 180, border: '1px solid #333', borderRadius: 1, overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  language={language === 'c' || language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              </Box>

              {/* Output Section */}
              <Paper
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  height: '140px',
                  overflow: 'auto',
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  fontFamily: 'Consolas, monospace',
                  border: '1px solid #444',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#9cdcfe', fontWeight: 'bold' }}>
                    Output Terminal:
                  </Typography>
                  {isRunning && <CircularProgress size={16} sx={{ color: '#9cdcfe' }} />}
                </Box>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.4' }}>
                  {output || 'Click "Run Code" to compile and execute your program.'}
                </pre>
              </Paper>

              {/* Action Buttons */}
              <Box sx={{ mt: 1.5, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={runCode}
                  disabled={isRunning}
                  sx={{ minWidth: 140 }}
                  startIcon={isRunning ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {isRunning ? 'Running...' : 'Run Code'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={isRunning}
                  sx={{ minWidth: 140 }}
                >
                  Submit Test
                </Button>
              </Box>
            </Box>

            {/* Webcam Section */}
            <Box sx={{ width: '320px', height: '240px', flexShrink: 0 }}>
              <Paper sx={{ height: '100%', overflow: 'hidden', boxShadow: 3 }}>
                <Webcam
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  cheatingLog={cheatingLog}
                  updateCheatingLog={updateCheatingLog}
                />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
