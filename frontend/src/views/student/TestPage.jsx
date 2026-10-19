import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import MultipleChoiceQuestion from './Components/MultipleChoiceQuestion';
import NumberOfQuestions from './Components/NumberOfQuestions';
import ProctoringManager from './Components/ProctoringManager';
import { useGetExamsQuery, useGetQuestionsQuery } from '../../slices/examApiSlice';
import { useStartSessionMutation, useSubmitSessionMutation, useTerminateSessionMutation } from 'src/slices/sessionApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import axiosInstance from '../../axios';

const TestPage = () => {
  const { examId } = useParams();
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDurationInSeconds, setExamDurationInSeconds] = useState(0);
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  
  const [startSession] = useStartSessionMutation();
  const [submitSessionMutation] = useSubmitSessionMutation();
  const [terminateSessionMutation] = useTerminateSessionMutation();
  
  const [sessionId, setSessionId] = useState(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const webcamRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');

  const requestPermissions = async () => {
    try {
      setPermissionsError('');

      // Request Fullscreen IMMEDIATELY on click to preserve the user gesture context
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } catch (fsErr) {
        setPermissionsError('Fullscreen access is required to take this exam. Please allow the browser to enter Fullscreen.');
        return; // Halt if fullscreen is denied
      }

      // Request both audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop tracks so they are free for the actual monitor components to use
      stream.getTracks().forEach(track => track.stop());

      setPermissionsGranted(true);
    } catch (err) {
      console.error('Permission error:', err);
      setPermissionsError(
        'Camera and Microphone access are required to start the exam. Please click Allow in your browser address bar.'
      );
    }
  };

  useEffect(() => {
    if (userExamdata) {
      const exam = userExamdata.find((exam) => exam.examId === examId);
      if (exam) {
        setSelectedExam(exam);
        setExamDurationInSeconds(exam.duration);
        console.log('Exam duration (minutes):', exam.duration);
      }
    }
  }, [userExamdata, examId]);

  useEffect(() => {
    if (!examId || sessionId || !userInfo || !permissionsGranted) return;

    const initSession = async () => {
      const storedPassword = sessionStorage.getItem(`exam_pwd_${examId}`);
      try {
        const res = await startSession({
          examId,
          examPassword: storedPassword,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          }
        }).unwrap();
        
        setSessionId(res.session._id);
        setIsExamActive(true);
        if (res.resumed) {
          toast.info('Session resumed.');
          if (res.timeLeftSeconds) {
             setExamDurationInSeconds(res.timeLeftSeconds / 60);
          }
        } else {
          toast.success('Exam session started.');
        }
      } catch (err) {
        console.error('Failed to start session:', err);
        const msg = err?.data?.message || err?.data?.error || 'Could not start exam session. Access may be restricted.';
        toast.error(msg);
      }
    };

    initSession();
  }, [examId, startSession, sessionId, userInfo, permissionsGranted]);

  const [questions, setQuestions] = useState([]);
  const { data, isLoading } = useGetQuestionsQuery(examId);
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const navigate = useNavigate();

  const toggleFlagQuestion = (idx) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  useEffect(() => {
    if (data) {
      setQuestions(data);
    }
  }, [data]);

  const handleMcqCompletion = (answersToSubmit) => {
    const finalAnswers = (answersToSubmit && Object.keys(answersToSubmit).length > 0)
      ? answersToSubmit
      : (answers && Object.keys(answers).length > 0 ? answers : {});
    if (selectedExam?.hasCodingRound) {
      navigate(`/exam/${examId}/codedetails`, { state: { mcqAnswers: finalAnswers, sessionId } });
    } else {
      handleTestSubmission(finalAnswers);
    }
  };

  const handleTestSubmission = async (answersToSubmit) => {
    if (isSubmitting) return; // Prevent multiple submissions

    const finalAnswers = (answersToSubmit && Object.keys(answersToSubmit).length > 0)
      ? answersToSubmit
      : (answers && Object.keys(answers).length > 0 ? answers : {});

    const targetSessionId = sessionId;

    try {
      setIsSubmitting(true);
      setIsExamActive(false);

      if (targetSessionId) {
        const result = await submitSessionMutation({ sessionId: targetSessionId, answers: finalAnswers }).unwrap();
        console.log('Session submitted:', result);
      } else {
        await axiosInstance.post('/api/users/results', { examId, answers: finalAnswers }, { withCredentials: true });
      }

      sessionStorage.removeItem(`exam_pwd_${examId}`);
      sessionStorage.removeItem(`active_attempt_${examId}`);
      toast.success('Test submitted successfully!');
      navigate('/result', { replace: true });
    } catch (error) {
      console.error('Error submitting session:', error);
      sessionStorage.removeItem(`exam_pwd_${examId}`);
      toast.error(
        error?.data?.message || 'Failed to submit exam. Please try again.',
      );
      navigate('/result', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTerminate = async (reason) => {
    const finalReason = reason || 'Exam terminated: Integrity score reached 0 or proctoring policy violated.';
    toast.error(finalReason);
    setIsExamActive(false);
    try {
      if (sessionId) {
        await terminateSessionMutation({ sessionId, reason: finalReason }).unwrap();
      }
    } catch (e) {
      console.warn('Error recording termination:', e);
    }
    navigate('/result');
  };

  const saveUserTestScore = () => {
    setScore(score + 1);
  };

  if (isExamsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!permissionsGranted) {
    return (
      <PageContainer title="Exam Setup" description="Permission Check">
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh" 
          flexDirection="column"
          textAlign="center"
          sx={{ p: 4 }}
        >
          <img src="/assets/images/backgrounds/security.svg" alt="Security" width="150" style={{ marginBottom: '2rem' }} />
          <Typography variant="h3" gutterBottom>System Check</Typography>
          <Typography variant="body1" mb={3} maxWidth="500px" color="textSecondary">
            This is a secure proctored exam. To maintain academic integrity, you must grant access to your <b>Camera</b> and <b>Microphone</b>. The system will log behavior anomalies. 
          </Typography>
          {permissionsError && (
             <Box mb={3} maxWidth="500px">
                <div style={{ color: 'red', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
                   {permissionsError}
                </div>
             </Box>
          )}
          <button 
             onClick={requestPermissions}
             style={{
               padding: '12px 24px',
               fontSize: '16px',
               backgroundColor: '#1976d2',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer'
             }}
          >
            Grant Permissions & Start Test
          </button>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="TestPage" description="This is TestPage">
      <Box pt="3rem">
        <Grid container spacing={3}>
          <Grid item xs={12} md={7} lg={7}>
            <BlankCard>
              <Box
                width="100%"
                minHeight="400px"
                boxShadow={3}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                {isLoading ? (
                  <CircularProgress />
                ) : (
                  <MultipleChoiceQuestion
                    submitTest={handleMcqCompletion}
                    questions={questions}
                    currentQuestion={currentQuestionIndex}
                    setCurrentQuestion={setCurrentQuestionIndex}
                    answers={answers}
                    setAnswers={setAnswers}
                    flaggedQuestions={flaggedQuestions}
                    toggleFlagQuestion={toggleFlagQuestion}
                    saveUserTestScore={saveUserTestScore}
                    sessionId={sessionId}
                  />
                )}
              </Box>
            </BlankCard>
          </Grid>
          <Grid item xs={12} md={5} lg={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'start',
                      justifyContent: 'center',
                      overflowY: 'auto',
                      height: '100%',
                    }}
                  >
                    <NumberOfQuestions
                      questions={questions}
                      questionLength={questions.length}
                      currentQuestion={currentQuestionIndex}
                      setCurrentQuestion={setCurrentQuestionIndex}
                      answers={answers}
                      flaggedQuestions={flaggedQuestions}
                      submitTest={handleMcqCompletion}
                      examDurationInSeconds={examDurationInSeconds}
                    />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    sx={{ width: '100%', height: 400 }}
                    display="flex"
                    alignItems="start"
                    justifyContent="center"
                    flexDirection="column"
                  >
                    <ProctoringManager 
                       sessionId={sessionId} 
                       examId={examId}
                       webcamRef={webcamRef} 
                       isActive={isExamActive} 
                       onTerminate={handleTerminate} 
                    />
                  </Box>
                </BlankCard>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TestPage;
