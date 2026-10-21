import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import {
  School as StudentIcon,
  EventNote as UpcomingIcon,
  PlayCircleOutline as AppearedIcon,
  Score as ScoreIcon,
  ThumbUpAlt as PassIcon,
  Warning as ViolationIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Business as InstitutionIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="textSecondary" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ color: `${color}.main`, my: 0.5 }}>
            {value}
          </Typography>
          {subtext && (
            <Typography variant="caption" color="textSecondary">
              {subtext}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            color: `${color}.main`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon fontSize="medium" />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await axiosInstance.get('/api/student/dashboard', { withCredentials: true });
      setDashboardData(res.data);
      setError(null);
    } catch (err) {
      // Fallback try legacy route if needed
      try {
        const fallbackRes = await axiosInstance.get('/api/users/student/dashboard', { withCredentials: true });
        setDashboardData(fallbackRes.data);
        setError(null);
      } catch (fErr) {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch student dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Real-time polling every 5 seconds
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <PageContainer title="Student Dashboard" description="Student Overview">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="350px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  const student = dashboardData?.student || {};
  const recentResults = dashboardData?.recentResults || [];
  const upcomingExams = dashboardData?.upcomingExams || [];

  return (
    <PageContainer title="Student Dashboard" description="Overview of your exams, results and academic standing">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchDashboardData}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Student Profile Banner */}
      <Card sx={{ mb: 3, p: 3, borderRadius: 2, background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: '#fff' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm="auto">
            <Avatar sx={{ width: 72, height: 72, bgcolor: '#ffffff', color: '#4f46e5', fontSize: '1.75rem', fontWeight: 700 }}>
              {(student.name || 'Student').charAt(0).toUpperCase()}
            </Avatar>
          </Grid>
          <Grid item xs={12} sm>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#fff' }}>
              Welcome back, {student.name || 'Student'}!
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 0.5 }}>
              Candidate Overview &amp; Real-Time Examination Dashboard
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>{student.email || 'N/A'}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <BadgeIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>Roll / ID: {student.studentId || 'N/A'}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <InstitutionIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                <Typography variant="body2" sx={{ color: '#fff' }}>{student.institution || 'Evaluation Portal'}</Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button
              variant="contained"
              sx={{ bgcolor: '#fff', color: '#4f46e5', fontWeight: 600, '&:hover': { bgcolor: '#f1f5f9' } }}
              onClick={() => navigate('/exam')}
              endIcon={<ArrowForwardIcon />}
            >
              Browse Exams
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Real-time Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Enrolled Exams"
            value={dashboardData?.enrolledExamsCount ?? 0}
            icon={StudentIcon}
            color="primary"
            subtext={`${dashboardData?.eligibleExamsCount ?? 0} total active exams`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Upcoming Exams"
            value={dashboardData?.upcomingExamsCount ?? 0}
            icon={UpcomingIcon}
            color="info"
            subtext="Ready to take"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Exams Appeared"
            value={dashboardData?.examsAppearedCount ?? 0}
            icon={AppearedIcon}
            color="warning"
            subtext={`${dashboardData?.examsCompletedCount ?? 0} completed`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Score"
            value={`${dashboardData?.averageScore ?? 0}%`}
            icon={ScoreIcon}
            color="success"
            subtext={`${dashboardData?.passCount ?? 0} Passed / ${dashboardData?.failCount ?? 0} Failed`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard
            title="Pass / Fail Count"
            value={`${dashboardData?.passCount ?? 0} / ${dashboardData?.failCount ?? 0}`}
            icon={PassIcon}
            color="secondary"
            subtext="Pass / Fail status across submitted exams"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard
            title="Total Proctoring Violations"
            value={dashboardData?.totalViolations ?? 0}
            icon={ViolationIcon}
            color={dashboardData?.totalViolations > 0 ? "error" : "success"}
            subtext="Live recorded proctoring infractions"
          />
        </Grid>
      </Grid>

      {/* Upcoming & Enrolled Exams Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <DashboardCard
            title="Enrolled & Upcoming Exams"
            action={
              <Button size="small" onClick={() => navigate('/exam')} endIcon={<ArrowForwardIcon />}>
                View All In Exams Page
              </Button>
            }
          >
            {upcomingExams.length === 0 ? (
              <Box p={3} textAlign="center">
                <Typography color="textSecondary" mb={2}>
                  No enrolled upcoming exams scheduled right now. Check the Exams page to enroll in active exams.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate('/exam')}>
                  Explore Available Exams
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Exam Code</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Exam Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Marks</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Coding Round</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingExams.map((ex) => (
                      <TableRow key={ex.examId} hover>
                        <TableCell><Chip size="small" label={ex.examId} /></TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{ex.examName}</TableCell>
                        <TableCell>{ex.subject || 'General'}</TableCell>
                        <TableCell>{ex.duration} mins</TableCell>
                        <TableCell>{ex.totalMarks} pts</TableCell>
                        <TableCell>
                          {ex.hasCodingRound ? (
                            <Chip size="small" color="secondary" label="Included" />
                          ) : (
                            <Chip size="small" variant="outlined" label="MCQ Only" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color="success" label={ex.status || 'ENROLLED'} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/exam/${ex.examId}`)}
                          >
                            Go to Exam
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Recent Results Section */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DashboardCard
            title="Recent Exam Results"
            action={
              <Button size="small" onClick={() => navigate('/result')} endIcon={<ArrowForwardIcon />}>
                View Full Results History
              </Button>
            }
          >
            {recentResults.length === 0 ? (
              <Box p={3} textAlign="center">
                <Typography color="textSecondary" mb={2}>
                  No completed exam attempts or scores recorded yet. Complete an exam to see your performance summary and proctoring breakdown here.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate('/exam')}>
                  Take an Exam
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Exam</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Submitted At</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Verdict</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Violations</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentResults.map((r) => (
                      <TableRow key={r.attemptId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{r.examName}</Typography>
                          <Typography variant="caption" color="textSecondary">{r.examId}</Typography>
                        </TableCell>
                        <TableCell>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'Recent'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {r.score} / {r.totalMarks}
                        </TableCell>
                        <TableCell>{r.percentage}%</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={r.passed ? 'success' : 'error'}
                            label={r.passed ? 'PASSED' : (r.status === 'DISQUALIFIED' ? 'DISQUALIFIED' : 'FAILED')}
                            sx={{ fontWeight: 'bold' }}
                          />
                          {!r.passed && (
                            <Typography
                              variant="caption"
                              color="error.main"
                              display="block"
                              sx={{ mt: 0.5, fontWeight: 500, maxWidth: 200, lineHeight: 1.2 }}
                            >
                              {r.failReason || (r.status === 'DISQUALIFIED' || r.terminationReason ? 'Failed: exam terminated due to violations.' : 'Failed: marks below passing score.')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={r.violationsCount > 0 ? 'warning' : 'success'}
                            label={`${r.violationsCount} violations`}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => navigate('/result')}
                          >
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DashboardCard>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default StudentDashboard;
