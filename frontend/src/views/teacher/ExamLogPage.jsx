import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
} from '@mui/material';
import {
  Image as ImageIcon,
  Close as CloseIcon,
  Stream as StreamIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import CheatingTable from './components/CheatingTable';
import { useGetAdminLogsQuery } from '../../slices/proctoringApiSlice';
import { useGetExamsQuery } from '../../slices/examApiSlice';

const getSeverityChip = (severity) => {
  const map = {
    CRITICAL: { color: 'error', label: 'CRITICAL' },
    HIGH: { color: 'error', label: 'HIGH' },
    MEDIUM: { color: 'warning', label: 'MEDIUM' },
    LOW: { color: 'info', label: 'LOW' },
    INFO: { color: 'default', label: 'INFO' },
  };
  const config = map[severity] || { color: 'default', label: severity || 'EVENT' };
  return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 'bold' }} />;
};

const getEventTypeChip = (eventType) => {
  const t = (eventType || '').toUpperCase();
  if (t.includes('PHONE') || t.includes('OBJECT')) {
    return <Chip label={eventType} color="error" size="small" variant="filled" />;
  }
  if (t.includes('FACE') || t.includes('LOOKING')) {
    return <Chip label={eventType} color="warning" size="small" variant="filled" />;
  }
  if (t.includes('VOICE') || t.includes('AUDIO') || t.includes('SPEECH') || t.includes('NOISE')) {
    return <Chip label={eventType} color="info" size="small" variant="filled" />;
  }
  if (t.includes('TAB') || t.includes('BLUR') || t.includes('FULLSCREEN')) {
    return <Chip label={eventType} color="secondary" size="small" variant="filled" />;
  }
  if (t.includes('START')) {
    return <Chip label={eventType} color="info" size="small" variant="outlined" />;
  }
  if (t.includes('SUBMIT')) {
    return <Chip label={eventType} color="success" size="small" variant="outlined" />;
  }
  if (t.includes('TERMINAT') || t.includes('DISQUALIF')) {
    return <Chip label={eventType} color="error" size="small" variant="outlined" />;
  }
  return <Chip label={eventType} size="small" variant="outlined" />;
};

const ExamLogPage = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState('all');
  const [previewEvidence, setPreviewEvidence] = useState(null);

  const { data: examsData } = useGetExamsQuery();

  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useGetAdminLogsQuery(selectedExamId === 'all' ? '' : selectedExamId, {
    pollingInterval: 3000, // Real-time short polling every 3 seconds
  });

  const logs = Array.isArray(logsData) ? logsData : [];

  return (
    <PageContainer title="Exam Logs & Proctoring Evidence" description="Real-time examination activity and cheating logs">
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          🛡️ Exam Logs & Proctoring Center
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Live stream of all exam activities, proctoring violations, and photographic evidence for your exams.
        </Typography>
      </Box>

      {/* Exam Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Exam</InputLabel>
              <Select
                value={selectedExamId}
                label="Filter by Exam"
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                <MenuItem value="all">
                  <em>All Exams</em>
                </MenuItem>
                {examsData &&
                  examsData.map((exam) => (
                    <MenuItem key={exam.examId || exam.id} value={exam.examId || exam.id}>
                      {exam.examName || exam.examId} ({exam.examId})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={8} display="flex" justifyContent="flex-end" alignItems="center">
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              size="small"
              onClick={() => refetchLogs()}
            >
              Refresh Stream
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)}>
          <Tab
            icon={<StreamIcon />}
            iconPosition="start"
            label={`Live Activity & Violation Stream (${logs.length})`}
          />
          <Tab
            icon={<SecurityIcon />}
            iconPosition="start"
            label="Cheating Summary by Student"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Live Activity & Violation Stream */}
      {currentTab === 0 && (
        <DashboardCard title="Live Proctoring Activity Stream">
          {logsLoading && logs.length === 0 ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : logsError ? (
            <Alert severity="error">
              Failed to load activity logs: {logsError?.data?.message || 'Server error'}
            </Alert>
          ) : logs.length === 0 ? (
            <Box textAlign="center" py={5}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No exam activity or proctoring logs recorded yet.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                When students start exams, answer questions, or trigger proctoring violations, events will appear here in real time.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Exam</strong></TableCell>
                    <TableCell><strong>Event / Violation</strong></TableCell>
                    <TableCell><strong>Severity</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Penalty</strong></TableCell>
                    <TableCell align="center"><strong>Score After</strong></TableCell>
                    <TableCell align="center"><strong>Evidence</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {log.studentName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {log.studentEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {log.examName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                          {log.examCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{getEventTypeChip(log.eventType)}</TableCell>
                      <TableCell>{getSeverityChip(log.severity)}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2">{log.description || 'Proctoring milestone / event'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {log.penaltyPoints > 0 ? (
                          <Chip label={`-${log.penaltyPoints}`} color="error" size="small" />
                        ) : (
                          <Chip label="0" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${log.integrityScoreAfter !== undefined ? log.integrityScoreAfter : 100}/100`}
                          size="small"
                          color={
                            (log.integrityScoreAfter ?? 100) >= 70
                              ? 'success'
                              : (log.integrityScoreAfter ?? 100) >= 30
                              ? 'warning'
                              : 'error'
                          }
                          variant="outlined"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {log.evidenceUrl ? (
                          <Tooltip title="View Photographic Evidence">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => setPreviewEvidence(log)}
                            >
                              <ImageIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            None
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
      )}

      {/* Tab 1: Cheating Summary by Student */}
      {currentTab === 1 && (
        <DashboardCard title="Student Cheating Aggregate Summary">
          <CheatingTable />
        </DashboardCard>
      )}

      {/* Screenshot / Evidence Preview Dialog */}
      <Dialog
        open={Boolean(previewEvidence)}
        onClose={() => setPreviewEvidence(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              📷 Violation Evidence - {previewEvidence?.studentName}
            </Typography>
            <IconButton onClick={() => setPreviewEvidence(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {previewEvidence && (
            <Box>
              <Card sx={{ mb: 2 }}>
                <CardMedia
                  component="img"
                  image={previewEvidence.evidenceUrl}
                  alt={`Evidence for ${previewEvidence.eventType}`}
                  sx={{ maxHeight: 450, objectFit: 'contain', bgcolor: '#000' }}
                />
              </Card>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Student
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {previewEvidence.studentName} ({previewEvidence.studentEmail})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Exam
                  </Typography>
                  <Typography variant="body1">
                    {previewEvidence.examName} ({previewEvidence.examCode})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Violation Type & Severity
                  </Typography>
                  <Box display="flex" gap={1} mt={0.5}>
                    {getEventTypeChip(previewEvidence.eventType)}
                    {getSeverityChip(previewEvidence.severity)}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {new Date(previewEvidence.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Details
                  </Typography>
                  <Typography variant="body1">
                    {previewEvidence.description || 'Automated AI visual violation detection'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewEvidence(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ExamLogPage;
