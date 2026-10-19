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

export default function CheatingTable() {
  const [filter, setFilter] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [cheatingLogs, setCheatingLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

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

  const handleViewScreenshots = (log) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLog(null);
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
                  <TableCell colSpan={10} align="center">
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
          <Grid container spacing={2}>
            {selectedLog?.screenshots?.map((screenshot, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={screenshot.url}
                    alt={`Violation - ${screenshot.type}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Type: {screenshot.type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Detected: {new Date(screenshot.detectedAt).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
