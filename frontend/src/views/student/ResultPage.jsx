import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Tooltip,
  CardMedia,
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Cancel,
  RemoveCircleOutline,
  Visibility,
  VisibilityOff,
  Assessment,
  Close,
  Warning,
  Image as ImageIcon,
  CheckCircleOutline,
  School,
  Grade,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ResultPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [exams, setExams] = useState([]);

  // Detailed Report State
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [detailedReport, setDetailedReport] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);

  const fetchResultsData = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      // Fetch exams list
      const examsResponse = await axiosInstance.get('/api/users/exam');
      setExams(Array.isArray(examsResponse.data) ? examsResponse.data : []);

      // Fetch results
      const role = (userInfo?.role || '').toLowerCase();
      if (role.includes('teacher') || role.includes('admin')) {
        const resultsResponse = await axiosInstance.get('/api/users/results/all');
        setResults(Array.isArray(resultsResponse.data?.data) ? resultsResponse.data.data : []);
      } else {
        const resultsResponse = await axiosInstance.get('/api/users/results/user');
        setResults(Array.isArray(resultsResponse.data?.data) ? resultsResponse.data.data : []);
      }
    } catch (err) {
      console.error('Error fetching results data:', err);
      if (!isBackground) {
        setError(err.response?.data?.message || 'Failed to load results');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchResultsData();
    const pollInterval = setInterval(() => {
      fetchResultsData(true);
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [userInfo]);

  const handleToggleVisibility = async (resultId) => {
    try {
      await axiosInstance.put(`/api/users/results/${resultId}/toggle-visibility`);
      toast.success('Visibility updated successfully');
      fetchResultsData();
    } catch (err) {
      toast.error('Failed to update visibility');
    }
  };

  const handleOpenDetailedReport = async (attemptId) => {
    if (!attemptId) return;
    try {
      setReportLoading(true);
      setReportDialogOpen(true);
      const res = await axiosInstance.get(`/api/users/results/${attemptId}/detailed-report`);
      setDetailedReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load detailed report');
      setReportDialogOpen(false);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExamChange = async (examId) => {
    setSelectedExam(examId);
    if (examId === 'all') {
      fetchResultsData();
      return;
    }
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/users/results/exam/${examId}`);
      setResults(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      toast.error('Failed to fetch exam results');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter((result) => {
    const studentName = result.userId?.name || result.studentName || '';
    const studentEmail = result.userId?.email || result.studentEmail || '';
    const matchesSearch =
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const resultExamId = result.examCode || result.examId || result.exam?.examId || '';
    const matchesExam = selectedExam === 'all' || resultExamId === selectedExam;
    return matchesSearch && matchesExam;
  });

  const getStatusChip = (status, passed) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISQUALIFIED') {
      return <Chip label="DISQUALIFIED" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
    }
    if (passed) {
      return <Chip label="PASSED" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
    }
    return <Chip label="FAILED" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Render Detailed Report Dialog
  const renderDetailedReportModal = () => (
    <Dialog
      open={reportDialogOpen}
      onClose={() => setReportDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            📋 Detailed Exam & Proctoring Report
          </Typography>
          <IconButton onClick={() => setReportDialogOpen(false)}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {reportLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : !detailedReport ? (
          <Alert severity="info">No report data found for this attempt.</Alert>
        ) : (
          <Box>
            {/* Exam & Student Overview Header */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Exam
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {detailedReport.exam?.examName || 'Exam'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Code: {detailedReport.exam?.examCode} | Passing Marks: {detailedReport.exam?.passingMarks}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Student
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {detailedReport.student?.name || 'Student'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {detailedReport.student?.email}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Performance Summary Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1, bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" color="textSecondary">Score</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {detailedReport.score} / {detailedReport.totalMarks}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1, bgcolor: '#e8f5e9' }}>
                  <Typography variant="caption" color="textSecondary">Percentage</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {Number(detailedReport.percentage || 0).toFixed(1)}%
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1, bgcolor: detailedReport.passed ? '#e8f5e9' : '#ffebee' }}>
                  <Typography variant="caption" color="textSecondary">Result</Typography>
                  <Box mt={0.5}>
                    {getStatusChip(detailedReport.status, detailedReport.passed)}
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', p: 1, bgcolor: '#fff3e0' }}>
                  <Typography variant="caption" color="textSecondary">Violations</Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {detailedReport.summary?.totalViolations ?? (detailedReport.violations?.length || 0)}
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Questions Detailed Breakdown */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              📝 Questions & Answers Breakdown
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell width="6%"><strong>#</strong></TableCell>
                    <TableCell width="44%"><strong>Question</strong></TableCell>
                    <TableCell width="22%"><strong>Your Answer</strong></TableCell>
                    <TableCell width="18%"><strong>Correct Answer</strong></TableCell>
                    <TableCell width="10%" align="center"><strong>Marks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailedReport.questions?.map((q, idx) => (
                    <TableRow key={q.questionId || idx} hover sx={{ bgcolor: q.isCorrect ? '#f1f8e9' : '#fff5f5' }}>
                      <TableCell>{q.questionNumber || idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {q.questionText}
                        </Typography>
                        {/* Options preview */}
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <Box mt={0.5}>
                            {q.options.map((opt, oIdx) => (
                              <Typography
                                key={oIdx}
                                variant="caption"
                                display="block"
                                sx={{
                                  color: opt.isCorrect ? 'success.dark' : 'text.secondary',
                                  fontWeight: opt.isCorrect ? 'bold' : 'normal',
                                }}
                              >
                                • {opt.text || opt.optionText} {opt.isCorrect ? '✓ (Correct)' : ''}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {q.isCorrect ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : q.studentAnswer === 'Not Answered' ? (
                            <RemoveCircleOutline color="disabled" fontSize="small" />
                          ) : (
                            <Cancel color="error" fontSize="small" />
                          )}
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={q.isCorrect ? 'success.main' : q.studentAnswer === 'Not Answered' ? 'text.secondary' : 'error.main'}
                          >
                            {q.studentAnswer || 'Not Answered'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="success.dark">
                          {q.correctAnswer || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${q.marksObtained ?? (q.isCorrect ? q.marks : 0)} / ${q.marks}`}
                          color={q.isCorrect ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Proctoring Violations Summary at the Bottom */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              🛡️ Proctoring Violations & Integrity Log
            </Typography>
            {(!detailedReport.violations || detailedReport.violations.length === 0) ? (
              <Alert severity="success" icon={<CheckCircleOutline fontSize="inherit" />}>
                Zero proctoring violations recorded during this exam session. Excellent integrity!
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell><strong>Time</strong></TableCell>
                      <TableCell><strong>Violation Type</strong></TableCell>
                      <TableCell><strong>Severity</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell align="center"><strong>Penalty</strong></TableCell>
                      <TableCell align="center"><strong>Evidence</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedReport.violations.map((v, vIdx) => (
                      <TableRow key={v.id || vIdx} hover>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Chip label={v.eventType} color="error" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={v.severity}
                            color={v.severity === 'CRITICAL' || v.severity === 'HIGH' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{v.description || 'Proctoring violation detected'}</TableCell>
                        <TableCell align="center">
                          <Chip label={`-${v.penaltyPoints || 0}`} color="error" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          {v.evidenceUrl ? (
                            <Tooltip title="View Photographic Evidence">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => setEvidencePreview(v.evidenceUrl)}
                              >
                                <ImageIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="textSecondary">None</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // Evidence Dialog
  const renderEvidenceDialog = () => (
    <Dialog open={Boolean(evidencePreview)} onClose={() => setEvidencePreview(null)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">📷 Photographic Evidence</Typography>
          <IconButton onClick={() => setEvidencePreview(null)}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {evidencePreview && (
          <CardMedia
            component="img"
            image={evidencePreview}
            alt="Violation Evidence"
            sx={{ maxHeight: 400, objectFit: 'contain', bgcolor: '#000' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEvidencePreview(null)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // Student View
  const userRole = (userInfo?.role || '').toLowerCase();
  const isStudent = userRole.includes('student') || !userRole.includes('teacher');
  if (isStudent) {
    const totalExamsTaken = results.length;
    const avgScore = totalExamsTaken > 0
      ? (results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalExamsTaken).toFixed(1)
      : 0;
    const passedCount = results.filter((r) => r.passed).length;
    const passRate = totalExamsTaken > 0 ? ((passedCount / totalExamsTaken) * 100).toFixed(0) : 0;

    return (
      <PageContainer title="My Exam Results" description="View your exam results and reports">
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Total Exams Taken
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {totalExamsTaken}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {avgScore}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Pass Rate
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {passRate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Results Table */}
          <Grid item xs={12}>
            <DashboardCard title="My Examination Results">
              <TableContainer component={Paper}>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell><strong>Exam Name</strong></TableCell>
                      <TableCell><strong>Score</strong></TableCell>
                      <TableCell><strong>Percentage</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Submission Date</strong></TableCell>
                      <TableCell align="center"><strong>Detailed Report</strong></TableCell>
                      <TableCell align="center"><strong>Proctoring</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body1" color="textSecondary" py={4}>
                            No exam results available yet. Once you complete an exam, your scores and reports will appear here.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((result) => {
                        const examDisplayName =
                          result.examName ||
                          result.exam?.examName ||
                          result.examCode ||
                          result.examId ||
                          'Exam';
                        const attemptId = result.attemptId || result.id || result._id;

                        return (
                          <TableRow key={attemptId} hover>
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {examDisplayName}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                                {result.examCode || result.examId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600">
                                {result.score ?? result.obtainedMarks ?? 0} / {result.totalMarks ?? 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${Number(result.percentage || 0).toFixed(1)}%`}
                                color={result.percentage >= 70 ? 'success' : result.percentage >= 40 ? 'warning' : 'error'}
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </TableCell>
                            <TableCell>{getStatusChip(result.status, result.passed)}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>
                              {new Date(result.submittedAt || result.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<Assessment />}
                                onClick={() => handleOpenDetailedReport(attemptId)}
                              >
                                Detailed Report
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              {result.sessionId ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                  onClick={() => navigate(`/exam/${result.examId}/report/${result.sessionId}`)}
                                >
                                  Proctoring
                                </Button>
                              ) : (
                                <Typography variant="caption" color="textSecondary">-</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>
        </Grid>

        {renderDetailedReportModal()}
        {renderEvidenceDialog()}
      </PageContainer>
    );
  }

  // Teacher View
  const totalSubmissions = filteredResults.length;
  const avgTeacherScore = totalSubmissions > 0
    ? (filteredResults.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalSubmissions).toFixed(1)
    : 0;
  const teacherPassedCount = filteredResults.filter((r) => r.passed).length;
  const teacherPassRate = totalSubmissions > 0 ? ((teacherPassedCount / totalSubmissions) * 100).toFixed(0) : 0;

  return (
    <PageContainer title="Results Dashboard" description="View and manage exam results">
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Total Submissions
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {totalSubmissions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {avgTeacherScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Pass Rate
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {teacherPassRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Table */}
        <Grid item xs={12}>
          <DashboardCard title="Student Examination Results">
            {/* Exam Filter and Search */}
            <Box mb={3} display="flex" gap={2} flexWrap="wrap">
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel>Select Exam</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => handleExamChange(e.target.value)}
                  label="Select Exam"
                >
                  <MenuItem value="all">
                    <em>All Exams</em>
                  </MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam._id || exam.id} value={exam.examId || exam.id}>
                      {exam.examName} ({exam.examId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Search Students"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Student Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Exam</strong></TableCell>
                    <TableCell><strong>Score</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Submission Date</strong></TableCell>
                    <TableCell align="center"><strong>Detailed Report</strong></TableCell>
                    <TableCell align="center"><strong>Visibility</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body1" color="textSecondary" py={4}>
                          No examination submissions or results recorded yet for this selection.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResults.map((result) => {
                      const attemptId = result.attemptId || result.id || result._id;
                      const examDisplayName =
                        result.examName ||
                        result.exam?.examName ||
                        exams.find((e) => (e.examId || e.id) === (result.examCode || result.examId))?.examName ||
                        result.examCode ||
                        result.examId;

                      return (
                        <TableRow key={attemptId} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {result.userId?.name || result.studentName || 'Student'}
                            </Typography>
                          </TableCell>
                          <TableCell>{result.userId?.email || result.studentEmail || '-'}</TableCell>
                          <TableCell>{examDisplayName}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {result.score ?? result.obtainedMarks ?? 0} / {result.totalMarks ?? 0}
                            </Typography>
                            <Chip
                              label={`${Number(result.percentage || 0).toFixed(1)}%`}
                              color={result.percentage >= 70 ? 'success' : result.percentage >= 40 ? 'warning' : 'error'}
                              size="small"
                              sx={{ ml: 1, fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell>{getStatusChip(result.status, result.passed)}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {new Date(result.submittedAt || result.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Assessment />}
                              onClick={() => handleOpenDetailedReport(attemptId)}
                            >
                              Detailed Report
                            </Button>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={result.showToStudent ? 'Visible to Student' : 'Hidden from Student'}>
                              <IconButton
                                onClick={() => handleToggleVisibility(attemptId)}
                                color={result.showToStudent ? 'success' : 'default'}
                                size="small"
                              >
                                {result.showToStudent ? <Visibility /> : <VisibilityOff />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DashboardCard>
        </Grid>
      </Grid>

      {renderDetailedReportModal()}
      {renderEvidenceDialog()}
    </PageContainer>
  );
};

export default ResultPage;
