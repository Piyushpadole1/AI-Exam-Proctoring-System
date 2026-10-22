import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  ListItemText,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetQuestionsQuery, useGetExamsQuery } from 'src/slices/examApiSlice';
import { useSelector } from 'react-redux';
import axiosInstance from '../../axios';

const DescriptionAndInstructions = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { userInfo } = useSelector((state) => state.auth);

  const { data: exams, isLoading: examsLoading } = useGetExamsQuery();
  const isTeacher = Boolean((userInfo?.role || '').toLowerCase().includes('teacher') || (userInfo?.role || '').toLowerCase().includes('admin'));
  const { data: questions, isLoading: questionsLoading } = useGetQuestionsQuery(examId, { skip: !isTeacher });

  const [codingQuestion, setCodingQuestion] = useState(null);
  const [certify, setCertify] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [examPassword, setExamPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const exam = exams?.find(
    (e) => e.examId === examId || String(e._id) === String(examId) || String(e.id) === String(examId)
  );
  

  useEffect(() => {
    if (examId) {
      axiosInstance
        .get(`/api/coding/questions/exam/${examId}`, { withCredentials: true })
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setCodingQuestion(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [examId]);

  const mcqCount = (questions && Array.isArray(questions) && questions.length > 0) ? questions.length : Number(exam?.totalQuestions || exam?.mcqCount || 0);
  const hasCodingQuestion = Boolean(codingQuestion);
  const hasConfiguredQuestions = mcqCount > 0 || hasCodingQuestion;
  const [requestingEnrollment, setRequestingEnrollment] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  useEffect(() => {
    if (exam) {
      setLocalStatus(exam.enrollmentStatus || (exam.isEnrolled ? 'ENROLLED' : 'NOT_ENROLLED'));
    }
  }, [exam]);

  const handleRequestEnrollment = async () => {
    try {
      setRequestingEnrollment(true);
      const res = await axiosInstance.post(`/api/users/exam/${examId}/request-enrollment`, {}, { withCredentials: true });
      toast.success(res.data?.message || 'Enrollment request submitted! Waiting for teacher approval.');
      setLocalStatus('PENDING');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to submit enrollment request.');
    } finally {
      setRequestingEnrollment(false);
    }
  };

  const currentStatus = localStatus || exam?.enrollmentStatus || (exam?.isEnrolled ? 'ENROLLED' : 'NOT_ENROLLED');
  const isEnrolled = isTeacher || currentStatus === 'ENROLLED' || Boolean(exam?.isEnrolled);

  const handleOpenPasswordModal = () => {
    if (!exam) {
      toast.error('Exam not found.');
      return;
    }
    if (currentStatus === 'COMPLETED' || exam?.isCompleted || exam?.hasAttempted) {
      toast.info('You have already completed this examination.');
      navigate('/result');
      return;
    }
    if (!isEnrolled) {
      toast.error('Access Denied: You are not enrolled in this exam.');
      return;
    }
    if (!hasConfiguredQuestions) {
      toast.error('This exam has no questions configured yet. Please contact your teacher.');
      return;
    }
    if (isTeacher) {
      toast.info('Teacher Preview Mode: Proceeding to exam questions view.');
      navigate(mcqCount > 0 ? `/exam/${examId}/test` : `/exam/${examId}/codedetails`);
      return;
    }
    setVerifyError('');
    setPasswordDialogOpen(true);
  };

  const handleVerifyAndStart = async () => {
    if (!examPassword.trim()) {
      setVerifyError('Please enter the exam password provided by your teacher.');
      return;
    }

    try {
      setVerifying(true);
      setVerifyError('');

      // BACKEND GATEKEEPER CHECK: Verifies student enrollment AND exam password
      const res = await axiosInstance.post('/api/sessions/verify-access', {
        examId,
        password: examPassword.trim(),
      });

      if (res.data.success || res.data.verified) {
        sessionStorage.setItem(`exam_pwd_${examId}`, examPassword.trim());
        toast.success('Access verified! Initializing proctored session...');
        setPasswordDialogOpen(false);
        // If MCQ questions exist, begin with MCQ test; otherwise go directly to coding section
        if (mcqCount > 0) {
          navigate(`/exam/${examId}/test`);
        } else {
          navigate(`/exam/${examId}/codedetails`);
        }
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Access denied: Verification failed.';
      setVerifyError(errMsg);
      toast.error(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  if (examsLoading || (isTeacher && questionsLoading)) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!exam) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">Exam not found. Please return to your dashboard.</Alert>
          <Box mt={2}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const instructionLines = Array.isArray(exam.instructions)
    ? exam.instructions.filter((line) => line && line.trim().length > 0)
    : typeof exam.instructions === 'string'
      ? exam.instructions
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [];

  return (
    <Card sx={{ height: '100%', overflowY: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h3" fontWeight={700}>
              {exam.examName || 'Untitled Exam'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" mt={0.5}>
              Code: <strong>{exam.examId}</strong> &nbsp;|&nbsp; Subject: {exam.subject || '—'}
            </Typography>
          </Box>
          <Chip
            icon={<LockIcon />}
            label="Protected Exam"
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>

        <Typography variant="subtitle2" color="text.secondary" mb={3}>
          Duration: {exam.duration ? `${exam.duration} minutes` : '30 min'} &nbsp;|&nbsp;
          MCQs: {mcqCount} &nbsp;|&nbsp;
          Coding: {hasCodingQuestion ? '1 Problem' : 'None'} &nbsp;|&nbsp;
          Total Marks: {exam.totalMarks || 100} &nbsp;|&nbsp;
          Passing Marks: {exam.passingMarks || 40}
        </Typography>

        <Typography variant="h5" fontWeight={600} mb={1}>
          Description
        </Typography>
        <Typography mb={3} sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
          {exam.description && exam.description.trim().length > 0
            ? exam.description
            : 'Comprehensive assessment requiring continuous webcam, audio, and browser proctoring.'}
        </Typography>

        <Typography variant="h5" fontWeight={600} mb={1}>
          Test Instructions & Proctoring Rules
        </Typography>

        {instructionLines.length > 0 ? (
          <List sx={{ mb: 2 }}>
            <ol style={{ paddingLeft: '20px', margin: 0 }}>
              {instructionLines.map((line, idx) => (
                <li key={idx}>
                  <ListItemText primary={line} />
                </li>
              ))}
            </ol>
          </List>
        ) : (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              • Ensure your webcam and microphone are fully functioning.
              <br />
              • Remain in full-screen mode throughout the exam session.
              <br />
              • Switching tabs, multiple faces, mobile phones, or background voices are flagged.
            </Typography>
          </Box>
        )}

        {!isTeacher && (currentStatus === 'COMPLETED' || exam?.isCompleted || exam?.hasAttempted) ? (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                color="primary"
                variant="contained"
                size="small"
                onClick={() => navigate('/result')}
                sx={{ fontWeight: 700 }}
              >
                View My Result
              </Button>
            }
          >
            <strong>Exam Completed:</strong> You have already submitted this examination. Multiple attempts are not permitted. You can view your detailed report on the Results page.
          </Alert>
        ) : !isTeacher && currentStatus === 'PENDING' ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Enrollment Pending:</strong> Your request to take this exam has been submitted and is currently pending approval by the instructor. You will be able to start once approved.
          </Alert>
        ) : !isTeacher && currentStatus === 'REJECTED' ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Enrollment Rejected:</strong> Your request to take this exam has been rejected by the instructor.
          </Alert>
        ) : !isTeacher && !isEnrolled ? (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="warning"
                variant="contained"
                size="small"
                onClick={handleRequestEnrollment}
                disabled={requestingEnrollment}
                sx={{ fontWeight: 700 }}
              >
                {requestingEnrollment ? 'Submitting...' : 'Request Enrollment'}
              </Button>
            }
          >
            <strong>Enrollment Required:</strong> You are not enrolled in this exam. Only students approved by the instructor can participate. Click "Request Enrollment" to ask for teacher authorization.
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Enrollment Verified:</strong> You are authorized to take this examination. Ensure you enter the exam password provided by your teacher.
          </Alert>
        )}

        <Stack direction="column" alignItems="center" spacing={2} mt={2}>
          {!(currentStatus === 'COMPLETED' || exam?.isCompleted || exam?.hasAttempted) && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={certify}
                  onChange={() => setCertify(!certify)}
                  color="primary"
                  disabled={!isEnrolled}
                />
              }
              label="I certify that I have read the instructions and agree to automated AI proctoring."
            />
          )}

          {!hasConfiguredQuestions && !(currentStatus === 'COMPLETED' || exam?.isCompleted || exam?.hasAttempted) && (
            <Alert severity="warning" sx={{ width: '100%' }}>
              This exam has no questions configured yet. Please contact your teacher before starting.
            </Alert>
          )}

          {(currentStatus === 'COMPLETED' || exam?.isCompleted || exam?.hasAttempted) ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/result')}
              sx={{ px: 4, py: 1.2, fontWeight: 700 }}
            >
              View My Result
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!certify || !isEnrolled || !hasConfiguredQuestions}
              onClick={handleOpenPasswordModal}
              startIcon={<VerifiedUserIcon />}
              sx={{ px: 4, py: 1.2, fontWeight: 700 }}
            >
              Start Test
            </Button>
          )}
        </Stack>

        {/* Exam Password Verification Modal */}
        <Dialog
          open={passwordDialogOpen}
          onClose={() => !verifying && setPasswordDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" /> Exam Access Verification
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter the exam password provided by your teacher for{' '}
              <strong>{exam.examName} ({exam.examId})</strong>.
            </Typography>

            {verifyError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {verifyError}
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              id="exam-password"
              label="Exam Password"
              type="password"
              fullWidth
              variant="outlined"
              value={examPassword}
              onChange={(e) => setExamPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyAndStart();
              }}
              disabled={verifying}
              placeholder="Enter exam password"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPasswordDialogOpen(false)} disabled={verifying}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleVerifyAndStart}
              disabled={verifying || !examPassword.trim()}
              startIcon={verifying && <CircularProgress size={16} />}
            >
              {verifying ? 'Verifying...' : 'Verify & Begin Exam'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const imgUrl =
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

export default function ExamDetails() {
  return (
    <Grid container sx={{ height: '100vh' }}>
      <Grid
        item
        xs={false}
        sm={4}
        md={6}
        sx={{
          backgroundImage: `url(${imgUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Grid item xs={12} sm={8} md={6} component={Paper} elevation={6} square>
        <DescriptionAndInstructions />
      </Grid>
    </Grid>
  );
}