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
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import TimelineIcon from '@mui/icons-material/Timeline';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAnalyticsQuery } from '../../slices/proctoringApiSlice';

const severityColors = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#9c27b0',
};

const AnalyticsPage = () => {
  const { data, isLoading, error } = useGetAnalyticsQuery(undefined, {
    pollingInterval: 10000,
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
      <Alert severity="error">Failed to load analytics: {error?.data?.message || 'Access Denied'}</Alert>
    );
  }

  const {
    violationsByType = [],
    violationsBySeverity = [],
    classificationDist = [],
    scoresByExam = [],
    violationsTimeline = [],
    confidenceByType = [],
    topViolators = [],
    totalAttempts = 0,
    passedCount = 0,
    failedCount = 0,
    averageScore = 0,
    highestScore = 0,
    lowestScore = 0,
    scoreDistribution = [],
  } = data || {};

  const totalViolations = violationsByType.reduce((sum, v) => sum + (v.count || 0), 0);
  const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(1) : '0.0';

  return (
    <PageContainer title="Exam & Proctoring Analytics" description="Real-time exam and integrity analytics">
      <Box p={2}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          📊 Exam Performance & Integrity Analytics
        </Typography>
        <Typography variant="subtitle2" color="textSecondary" mb={3}>
          Real-time aggregates of student exam attempts, scores, score distributions, and proctoring violations.
        </Typography>

        {/* Top KPI Cards: Academic Score & Exam Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <AssignmentTurnedInIcon color="primary" sx={{ fontSize: 36 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {totalAttempts}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Exam Attempts
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <TrendingUpIcon color="secondary" sx={{ fontSize: 36 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {averageScore}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average Score (High: {highestScore})
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <CheckCircleOutlineIcon color="success" sx={{ fontSize: 36 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {passRate}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pass Rate ({passedCount} Passed)
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <HighlightOffIcon color="error" sx={{ fontSize: 36 }} />
                  <div>
                    <Typography variant="h4" fontWeight="bold">
                      {totalViolations}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Violations Logged
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Score Distribution & Classification */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={7}>
            <DashboardCard title="Score Distribution Across All Attempts">
              <Box p={2}>
                {scoreDistribution.length === 0 || totalAttempts === 0 ? (
                  <Typography color="textSecondary" py={2}>
                    No completed student scores yet to display distribution.
                  </Typography>
                ) : (
                  scoreDistribution.map((dist) => {
                    const pct = totalAttempts > 0 ? (dist.count / totalAttempts) * 100 : 0;
                    return (
                      <Box key={dist.range} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight="600">
                            Score Range: {dist.range}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {dist.count} student{dist.count !== 1 ? 's' : ''} ({pct.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 10, borderRadius: 5 }}
                          color={
                            dist.range.includes('80-100')
                              ? 'success'
                              : dist.range.includes('60-80')
                              ? 'primary'
                              : dist.range.includes('40-60')
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </Box>
                    );
                  })
                )}
              </Box>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <DashboardCard title="Integrity Classification">
              <Box p={2}>
                {classificationDist.map((c) => (
                  <Box
                    key={c._id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Chip
                      label={c._id}
                      color={
                        c._id === 'SAFE' ? 'success' : c._id === 'WARNING' ? 'warning' : 'error'
                      }
                      sx={{ fontWeight: 'bold', minWidth: 100 }}
                    />
                    <Typography variant="h5" fontWeight="bold">
                      {c.count} session{c.count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                ))}
                {classificationDist.length === 0 && (
                  <Typography color="textSecondary">No classified sessions yet</Typography>
                )}
              </Box>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Violations by Type & Severity */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations Breakdown by Type">
              {violationsByType.length === 0 ? (
                <Typography color="textSecondary" p={3}>
                  No proctoring violations recorded yet.
                </Typography>
              ) : (
                <Box p={2}>
                  {violationsByType.map((v) => {
                    const pct = totalViolations > 0 ? (v.count / totalViolations) * 100 : 0;
                    return (
                      <Box key={v._id} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight="500">
                            {v._id?.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {v.count} ({pct.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 8, borderRadius: 4 }}
                          color={pct > 30 ? 'error' : pct > 15 ? 'warning' : 'primary'}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations by Severity">
              <Grid container spacing={2} p={2}>
                {violationsBySeverity.map((v) => (
                  <Grid item xs={6} key={v._id}>
                    <Card
                      sx={{
                        bgcolor: `${severityColors[v._id]}15`,
                        borderLeft: `4px solid ${severityColors[v._id]}`,
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          {v._id} Severity
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {v.count}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Scores & Violations by Exam */}
        <Box mb={3}>
          <DashboardCard title="Performance by Exam">
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Exam Name</strong></TableCell>
                    <TableCell><strong>Exam Code</strong></TableCell>
                    <TableCell align="center"><strong>Total Sessions</strong></TableCell>
                    <TableCell align="center"><strong>Avg Fairness Score</strong></TableCell>
                    <TableCell align="center"><strong>Total Violations</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scoresByExam.map((e) => (
                    <TableRow key={e._id} hover>
                      <TableCell>{e.examName}</TableCell>
                      <TableCell>
                        <Chip label={e._id} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{e.totalSessions}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${Math.round(e.avgFairness || 0)}/100`}
                          color={e.avgFairness >= 70 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={e.totalViolations}
                          color={e.totalViolations > 5 ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {scoresByExam.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No exam data found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DashboardCard>
        </Box>

        {/* Violations Timeline in Time Order */}
        <DashboardCard title="Violations Timeline (Chronological Activity)">
          {violationsTimeline.length === 0 ? (
            <Typography color="textSecondary" p={3}>
              No violation activity logged in the recording period.
            </Typography>
          ) : (
            <Box p={3}>
              <Box display="flex" alignItems="flex-end" gap={1.5} height={140} overflow="auto" pb={1}>
                {violationsTimeline.map((day) => {
                  const maxCount = Math.max(...violationsTimeline.map((d) => d.count), 1);
                  const heightPct = Math.max(10, (day.count / maxCount) * 100);
                  return (
                    <Box
                      key={day._id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: '0 0 45px',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '10px', mb: 0.5, fontWeight: 'bold' }}>
                        {day.count}
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          height: `${heightPct}%`,
                          bgcolor: day.count > 5 ? 'error.main' : day.count > 2 ? 'warning.main' : 'primary.main',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 },
                        }}
                        title={`${day._id}: ${day.count} violations`}
                      />
                      <Typography variant="caption" sx={{ fontSize: '10px', mt: 0.5, color: '#666' }} noWrap>
                        {day._id?.substring(5)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Chronological daily breakdown of recorded malpractice and AI anomalies.
              </Typography>
            </Box>
          )}
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default AnalyticsPage;
