import React from 'react';
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
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as ExamIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as SafeIcon,
  Error as DangerIcon,
  TrendingUp as TrendIcon,
  Visibility as ActiveIcon,
  School as EnrolledIcon,
  FactCheck as SubmissionIcon,
  Assessment as ScoreIcon,
  Percent as PassRateIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetDashboardStatsQuery } from '../../slices/proctoringApiSlice';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const getClassificationChip = (classification) => {
  const map = {
    SAFE: { color: 'success', icon: <SafeIcon fontSize="small" /> },
    WARNING: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
    MALPRACTICE: { color: 'error', icon: <DangerIcon fontSize="small" /> },
    PENDING: { color: 'default', icon: null },
  };
  const config = map[classification] || map.PENDING;
  return (
    <Chip
      icon={config.icon}
      label={classification}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
};

const AdminDashboard = () => {
  const { data, isLoading, error } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: 3000, // Real-time 3s short polling
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load dashboard: {error?.data?.message || 'Unknown error'}</Alert>
    );
  }

  const stats = data?.stats || {};
  const recentSessions = data?.recentSessions || [];

  return (
    <PageContainer title="Teacher Dashboard" description="AI_Evalu8 Teacher Proctoring Dashboard">
      <Box>
        <Typography variant="h4" mb={3} fontWeight="bold">
          📊 Teacher Dashboard
        </Typography>

        {/* Primary Exam & Student Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Exams"
              value={stats.totalExams || 0}
              icon={<ExamIcon sx={{ color: 'primary.main' }} />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Exams"
              value={stats.activeExams || 0}
              icon={<ActiveIcon sx={{ color: 'success.main' }} />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Enrolled Students"
              value={stats.enrolledStudents || stats.totalStudents || 0}
              icon={<EnrolledIcon sx={{ color: 'info.main' }} />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Students Taking Exam"
              value={stats.studentsCurrentlyTakingExams ?? stats.activeSessions ?? 0}
              icon={<PeopleIcon sx={{ color: 'warning.main' }} />}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Performance & Academic Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Submissions"
              value={stats.submissions ?? stats.totalSessions ?? 0}
              icon={<SubmissionIcon sx={{ color: 'info.main' }} />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Average Score"
              value={`${stats.averageScore ?? 0}%`}
              icon={<ScoreIcon sx={{ color: 'primary.main' }} />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pass Rate"
              value={`${stats.passRate ?? 0}%`}
              icon={<PassRateIcon sx={{ color: 'success.main' }} />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Avg Fairness Score"
              value={`${stats.avgFairnessScore ?? stats.averageIntegrity ?? 100}%`}
              icon={<SecurityIcon sx={{ color: 'warning.main' }} />}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Proctoring & Integrity Classification Distribution */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Safe Sessions
                </Typography>
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  {stats.safeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Warning Sessions
                </Typography>
                <Typography variant="h3" color="warning.main" fontWeight="bold">
                  {stats.warningSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Malpractice Cases
                </Typography>
                <Typography variant="h3" color="error.main" fontWeight="bold">
                  {stats.malpracticeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fce4ec', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Flagged / Terminated
                </Typography>
                <Typography variant="h3" color="error.dark" fontWeight="bold">
                  {stats.flaggedCount ?? stats.terminatedSessions ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Violation & Risk Overview */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Total Proctoring Violations"
              value={stats.totalViolations || 0}
              icon={<WarningIcon sx={{ color: 'error.main' }} />}
              color="error"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Terminated / Disqualified"
              value={stats.terminatedSessions || 0}
              icon={<DangerIcon sx={{ color: 'error.main' }} />}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Recent Sessions Table */}
        <DashboardCard title="Recent Exam Sessions">
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Exam ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Fairness</TableCell>
                  <TableCell>Violations</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No exam sessions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSessions.map((session) => (
                    <TableRow key={session._id} hover>
                      <TableCell>{session.studentId?.name || 'Unknown'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {session.examId?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.status}
                          color={
                            session.status === 'ACTIVE'
                              ? 'success'
                              : session.status === 'TERMINATED'
                                ? 'error'
                                : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{session.fairnessScore}/100</TableCell>
                      <TableCell>{session.totalViolations}</TableCell>
                      <TableCell>{getClassificationChip(session.classification)}</TableCell>
                      <TableCell>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default AdminDashboard;
