import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { useGetExamsQuery } from 'src/slices/examApiSlice';
import { useGetCheatingLogsQuery } from 'src/slices/cheatingLogApiSlice';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../../../axios';
import { Divider } from '@mui/material';

export default function CheatingTable() {
  const [filter, setFilter] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [cheatingLogs, setCheatingLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [registeredPhotos, setRegisteredPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const { data: examsData, isLoading: examsLoading, error: examsError } = useGetExamsQuery();
  const {
    data: cheatingLogsData,
    isLoading: logsLoading,
    error: logsError,
  } = useGetCheatingLogsQuery(selectedExamId, {
    skip: !selectedExamId,
    pollingInterval: 3000,
  });

  useEffect(() => {
    if (examsData && examsData.length > 0) {
      const firstExam = examsData[0];
      setSelectedExamId(firstExam.examId);
    }
  }, [examsData]);

  useEffect(() => {
    if (cheatingLogsData) {
      setCheatingLogs(Array.isArray(cheatingLogsData) ? cheatingLogsData : []);
    }
  }, [cheatingLogsData]);

  const filteredUsers = cheatingLogs.filter(
    (log) =>
      log.username?.toLowerCase().includes(filter.toLowerCase()) ||
      log.email?.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleViewScreenshots = async (log) => {
    setSelectedLog(log);
    setOpenDialog(true);
    setRegisteredPhotos([]);
    if (log.studentId || log._id) {
      const idToFetch = log.studentId || log._id;
      setPhotosLoading(true);
      try {
        const res = await axiosInstance.get(`/api/proctoring/face-profile/${idToFetch}`, {
          withCredentials: true,
        });
        if (res.data?.registered && res.data?.images) {
          setRegisteredPhotos(res.data.images);
        }
      } catch (err) {
        console.warn('Could not fetch registered face profile:', err.message);
      } finally {
        setPhotosLoading(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLog(null);
    setRegisteredPhotos([]);
  };

  if (examsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (examsError) {
    return (
      <Box p={2}>
        <Typography color="error">
          Error loading exams: {examsError.data?.message || examsError.error || 'Unknown error'}
        </Typography>
      </Box>
    );
  }

  if (!examsData || examsData.length === 0) {
    return (
      <Box p={2}>
        <Typography>No exams available. Please create an exam first.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Select
              label="Select Exam"
              value={selectedExamId || ''}
              onChange={(e) => setSelectedExamId(e.target.value)}
              fullWidth
            >
              {examsData.map((exam) => (
                <MenuItem key={exam.examId} value={exam.examId}>
                  {exam.examName || 'Unnamed Exam'}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Filter by Name or Email"
              variant="outlined"
              fullWidth
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {logsLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : logsError ? (
        <Box p={2}>
          <Typography color="error">
            Error loading logs: {logsError.data?.message || logsError.error || 'Unknown error'}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell><strong>Sno</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell align="center"><strong>Total Violations</strong></TableCell>
                <TableCell align="center"><strong>Integrity Score</strong></TableCell>
                <TableCell align="center"><strong>Face Status</strong></TableCell>
                <TableCell align="center"><strong>Face Mismatch</strong></TableCell>
                <TableCell align="center"><strong>Cell Phone</strong></TableCell>
                <TableCell align="center"><strong>No Face</strong></TableCell>
                <TableCell align="center"><strong>Multiple Faces</strong></TableCell>
                <TableCell align="center"><strong>Prohibited Objects</strong></TableCell>
                <TableCell align="center"><strong>Evidence</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No student cheating records or violations found for this exam.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((log, index) => {
                  const totalV = log.totalViolations ?? (
                    (log.noFaceCount || 0) +
                    (log.multipleFaceCount || 0) +
                    (log.cellPhoneCount || 0) +
                    (log.prohibitedObjectCount || 0)
                  );
                  const integrity = log.integrityScore ?? log.fairnessScore ?? Math.max(0, 100 - (log.cellPhoneCount || 0) * 50 - (log.multipleFaceCount || 0) * 30 - (log.noFaceCount || 0) * 20);
                  return (
                    <TableRow key={index} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="600">
                          {log.username || 'Student'}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.email}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${totalV}`}
                          color={totalV >= 5 ? 'error' : totalV > 0 ? 'warning' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${integrity}/100`}
                          color={integrity >= 70 ? 'success' : integrity >= 30 ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.faceVerificationStatus || 'VERIFIED'}
                          color={log.faceVerificationStatus === 'MISMATCH' || (log.faceMismatchCount || 0) > 0 ? 'error' : 'success'}
                          size="small"
                          icon={log.faceVerificationStatus === 'MISMATCH' ? <WarningAmberIcon /> : <VerifiedUserIcon />}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.faceMismatchCount || 0}
                          color={(log.faceMismatchCount || 0) > 0 ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.cellPhoneCount || 0}
                          color={log.cellPhoneCount > 0 ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.noFaceCount || 0}
                          color={log.noFaceCount > 0 ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.multipleFaceCount || 0}
                          color={log.multipleFaceCount > 0 ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.prohibitedObjectCount || 0}
                          color={log.prohibitedObjectCount > 0 ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={log.screenshots?.length ? `View ${log.screenshots.length} Screenshots` : 'No evidence captured'}>
                          <span>
                            <IconButton
                              onClick={() => handleViewScreenshots(log)}
                              disabled={!log.screenshots?.length}
                              color={log.screenshots?.length ? 'primary' : 'default'}
                              size="small"
                            >
                              <ImageIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Screenshots Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Screenshots - {selectedLog?.username}</Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Section 1: Registered Ground Truth Photos */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <VerifiedUserIcon color="primary" />
              <Typography variant="h6" fontWeight={700} color="primary.main">
                Registered Student Reference Photos (Ground Truth Identity)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Verified photos uploaded by the student during registration. Compare these against violation screenshots below.
            </Typography>

            {photosLoading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={32} />
              </Box>
            ) : registeredPhotos.length > 0 ? (
              <Grid container spacing={2}>
                {registeredPhotos.map((photo, idx) => (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card sx={{ border: '2px solid #1976d2', borderRadius: 2 }}>
                      <CardMedia
                        component="img"
                        height="180"
                        image={photo}
                        alt={`Registered Photo ${idx + 1}`}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} color="primary">
                          Reference Angle {idx + 1}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="textSecondary">
                  No registered reference photos available for this student.
                </Typography>
              </Paper>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Section 2: In-Exam Violation Evidence Screenshots */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <WarningAmberIcon color="warning" />
              <Typography variant="h6" fontWeight={700} color="warning.main">
                Exam Violation Evidence Screenshots
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Screenshots automatically captured during exam anomalies (face mismatch, looking away, unauthorized objects).
            </Typography>

            {selectedLog?.screenshots?.length > 0 ? (
              <Grid container spacing={2}>
                {selectedLog.screenshots.map((screenshot, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ border: screenshot.type?.includes('MISMATCH') ? '2px solid #d32f2f' : '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardMedia
                        component="img"
                        height="180"
                        image={screenshot.url}
                        alt={`Violation - ${screenshot.type}`}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600} color={screenshot.type?.includes('MISMATCH') ? 'error' : 'textPrimary'}>
                          {screenshot.type || 'Proctor Event'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {screenshot.detectedAt ? new Date(screenshot.detectedAt).toLocaleString() : 'Timestamp unavailable'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="textSecondary">
                  No violation screenshots recorded for this session.
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
