import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
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
  Card,
  CardContent,
  Grid,
  Snackbar,
  Stack,
  Button,
} from '@mui/material';
import {
  Visibility as ActiveIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
  NotificationsActive as AlertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetActiveMonitoringQuery } from '../../slices/proctoringApiSlice';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return <Chip label="ACTIVE" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
    case 'flagged':
      return <Chip label="FLAGGED" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
    case 'terminated':
      return <Chip label="TERMINATED" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
    case 'submitted':
      return <Chip label="SUBMITTED" color="info" size="small" sx={{ fontWeight: 'bold' }} />;
    default:
      return <Chip label={status || 'IN_PROGRESS'} size="small" />;
  }
};

const LiveMonitoringPage = () => {
  const { data: sessions, isLoading, error, refetch } = useGetActiveMonitoringQuery(undefined, {
    pollingInterval: 3000, // 3-second live refresh
  });

  const [liveAlert, setLiveAlert] = useState(null);
  const previousViolationsMap = useRef({});

  const activeSessions = sessions || [];

  // Detect newly triggered violations across polling cycles for instant alerts
  useEffect(() => {
    if (!activeSessions || activeSessions.length === 0) return;

    activeSessions.forEach((session) => {
      const studentEmail = session.studentId?.email || session.studentEmail || session._id;
      const prevCount = previousViolationsMap.current[studentEmail];
      const currentCount = session.totalViolations || 0;

      if (prevCount !== undefined && currentCount > prevCount) {
        // Trigger live alert
        const studentName = session.studentId?.name || session.studentName || 'Student';
        const eventName = session.latestViolation?.eventType?.replace(/_/g, ' ') || 'Malpractice Violation';
        setLiveAlert({
          message: `🚨 Malpractice Alert: ${studentName} triggered "${eventName}" in exam ${session.examName || session.examCode}`,
          severity: 'error',
        });
      }

      previousViolationsMap.current[studentEmail] = currentCount;
    });
  }, [activeSessions]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load monitoring data: {error?.data?.message || 'Access Denied'}</Alert>;
  }

  return (
    <PageContainer title="Live Monitoring" description="Monitor active exam sessions in real-time">
      <Box p={2}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={3} gap={2}>
          <div>
            <Typography variant="h3" fontWeight="bold">
              🔴 Real-Time Live Monitoring
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              Live streaming updates of students taking your exams. Updates automatically every 3 seconds.
            </Typography>
          </div>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refetch}>
            Refresh Now
          </Button>
        </Box>

        {/* Live Alert Banner */}
        {liveAlert && (
          <Alert
            severity={liveAlert.severity}
            icon={<AlertIcon />}
            sx={{ mb: 3, fontWeight: 'bold' }}
            onClose={() => setLiveAlert(null)}
          >
            {liveAlert.message}
          </Alert>
        )}

        {/* Summary Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={4}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <ActiveIcon color="success" sx={{ fontSize: 32 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {activeSessions.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Monitored Students
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <WarningIcon color="warning" sx={{ fontSize: 32 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {activeSessions.filter((s) => s.totalViolations > 0).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Flagged with Violations
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <TimerIcon color="info" sx={{ fontSize: 32 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      Real-Time
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Auto-Polling (3s Interval)
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Active Sessions Table */}
        <DashboardCard title="Active & Recent Exam Sessions">
          {activeSessions.length === 0 ? (
            <Box py={6} textAlign="center">
              <ActiveIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No active exam sessions currently
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active students taking your exams will appear here immediately in real time.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Exam</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Time Left</strong></TableCell>
                    <TableCell align="center"><strong>Violations</strong></TableCell>
                    <TableCell align="center"><strong>Fairness Score</strong></TableCell>
                    <TableCell align="center"><strong>Classification</strong></TableCell>
                    <TableCell align="center"><strong>Latest Event</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow
                      key={session._id}
                      hover
                      sx={{
                        bgcolor:
                          session.status === 'terminated'
                            ? '#ffebee'
                            : session.status === 'flagged'
                            ? '#fff8e1'
                            : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight="600">
                          {session.studentId?.name || session.studentName || 'Student'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {session.studentId?.email || session.studentEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {session.examName}
                        </Typography>
                        <Chip label={session.examCode} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        {getStatusBadge(session.status)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<TimerIcon />}
                          label={formatTime(session.timeLeftSeconds || 0)}
                          color={session.timeLeftSeconds < 300 ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${session.totalViolations || 0} / 6`}
                          color={
                            session.totalViolations >= 6
                              ? 'error'
                              : session.totalViolations > 0
                              ? 'warning'
                              : 'success'
                          }
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          fontWeight="bold"
                          color={
                            session.fairnessScore >= 70
                              ? 'success.main'
                              : session.fairnessScore >= 40
                              ? 'warning.main'
                              : 'error.main'
                          }
                        >
                          {session.fairnessScore}/100
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={session.classification || 'SAFE'}
                          color={
                            session.classification === 'SAFE'
                              ? 'success'
                              : session.classification === 'WARNING'
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {session.latestViolation ? (
                          <Box>
                            <Chip
                              label={session.latestViolation.eventType?.replace(/_/g, ' ')}
                              size="small"
                              color={
                                session.latestViolation.severity === 'HIGH' ? 'error' : 'warning'
                              }
                            />
                            <Typography variant="caption" display="block" color="textSecondary">
                              {new Date(session.latestViolation.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            {session.lastEvent || 'Monitoring Active'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default LiveMonitoringPage;
