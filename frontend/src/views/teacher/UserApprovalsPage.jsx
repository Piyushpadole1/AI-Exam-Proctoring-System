import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  CircularProgress,
  TextField,
  Avatar,
  Stack,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';
import { useGetExamsQuery } from '../../slices/examApiSlice';
import { toast } from 'react-toastify';

const UserApprovalsPage = () => {
  const { data: exams, isLoading: examsLoading } = useGetExamsQuery();

  const [selectedExamId, setSelectedExamId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [emailToEnroll, setEmailToEnroll] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Set default selected exam once exams load
  useEffect(() => {
    if (exams && exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].examId);
    }
  }, [exams, selectedExamId]);

  // Fetch all registered students
  const fetchAllStudents = async () => {
    try {
      setLoadingAllStudents(true);
      const res = await axiosInstance.get('/api/users/students');
      setAllStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingAllStudents(false);
    }
  };

  // Fetch enrolled students for selected exam
  const fetchEnrolledStudents = async (examCode) => {
    if (!examCode) return;
    try {
      setLoadingEnrollments(true);
      const res = await axiosInstance.get(`/api/users/exam/${examCode}/enrolled-students`);
      setEnrolledStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching enrolled students:', err);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  useEffect(() => {
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchEnrolledStudents(selectedExamId);
    }
  }, [selectedExamId]);

  // Handle Quick Enroll by Email
  const handleEnrollByEmail = async () => {
    if (!emailToEnroll.trim()) {
      toast.error('Please enter student email.');
      return;
    }
    try {
      setActionLoading(true);
      const res = await axiosInstance.post(`/api/users/exam/${selectedExamId}/enroll-student`, {
        email: emailToEnroll.trim(),
      });
      toast.success(res.data.message || 'Student enrolled successfully!');
      setEmailToEnroll('');
      fetchEnrolledStudents(selectedExamId);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to enroll student');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Enroll from Table
  const handleEnrollStudent = async (student) => {
    try {
      setActionLoading(true);
      const res = await axiosInstance.post(`/api/users/exam/${selectedExamId}/enroll-student`, {
        studentId: student.id || student._id,
        email: student.email,
      });
      toast.success(`Enrolled ${student.name} in exam!`);
      fetchEnrolledStudents(selectedExamId);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to enroll student');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unenroll
  const handleUnenrollStudent = async (studentId, studentName) => {
    try {
      setActionLoading(true);
      await axiosInstance.delete(`/api/users/exam/${selectedExamId}/unenroll-student/${studentId}`);
      toast.info(`Removed ${studentName} from exam.`);
      fetchEnrolledStudents(selectedExamId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unenroll student');
    } finally {
      setActionLoading(false);
    }
  };

  const enrolledStudentIds = new Set(enrolledStudents.map((s) => String(s.studentId)));

  const availableToEnroll = allStudents.filter(
    (s) =>
      !enrolledStudentIds.has(String(s.id)) &&
      !enrolledStudentIds.has(String(s._id)) &&
      (s.name?.toLowerCase().includes(studentFilter.toLowerCase()) ||
        s.email?.toLowerCase().includes(studentFilter.toLowerCase()) ||
        s.studentIdNumber?.toLowerCase().includes(studentFilter.toLowerCase())),
  );

  const filteredEnrolled = enrolledStudents.filter(
    (s) =>
      s.name?.toLowerCase().includes(studentFilter.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentFilter.toLowerCase()) ||
      s.studentIdNumber?.toLowerCase().includes(studentFilter.toLowerCase()),
  );

  return (
    <PageContainer title="Student Enrollment" description="Manage Exam Student Authorizations">
      <DashboardCard title="Exam-Wise Student Enrollment & Authorization">
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Strict Exam Authorization:</strong> Only students explicitly enrolled below are
            permitted to participate in the selected exam. Even with the exam credentials, unenrolled
            students are denied access.
          </Alert>

          {/* Exam Selector & Quick Enroll */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 260 }} size="small">
                <InputLabel id="exam-select-label">Select Exam to Manage</InputLabel>
                <Select
                  labelId="exam-select-label"
                  id="exam-select"
                  value={selectedExamId}
                  label="Select Exam to Manage"
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  disabled={examsLoading || !exams?.length}
                >
                  {(exams || []).map((ex) => (
                    <MenuItem key={ex._id} value={ex.examId}>
                      {ex.examName} ({ex.examId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Student Email to Enroll"
                placeholder="student@demo.edu"
                value={emailToEnroll}
                onChange={(e) => setEmailToEnroll(e.target.value)}
                sx={{ flexGrow: 1 }}
              />

              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleEnrollByEmail}
                disabled={actionLoading || !emailToEnroll.trim() || !selectedExamId}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Enroll Student
              </Button>
            </Stack>
          </Paper>

          {/* Search Bar & Tabs */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={2}>
            <Tabs
              value={tabValue}
              onChange={(e, val) => setTabValue(val)}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                icon={<HowToRegIcon />}
                iconPosition="start"
                label={`Enrolled Students (${enrolledStudents.length})`}
              />
              <Tab
                icon={<SchoolIcon />}
                iconPosition="start"
                label={`Available Students (${availableToEnroll.length})`}
              />
            </Tabs>

            <TextField
              size="small"
              placeholder="Search by name, email, roll number..."
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              sx={{ minWidth: 280, mt: { xs: 2, sm: 0 } }}
            />
          </Stack>

          {/* Tab 0: Enrolled Students */}
          {tabValue === 0 && (
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
              {loadingEnrollments ? (
                <Box display="flex" justifyContent="center" py={6}>
                  <CircularProgress />
                </Box>
              ) : filteredEnrolled.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography variant="body1" color="text.secondary">
                    No students currently enrolled in this exam.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Switch to the "Available Students" tab or enter an email above to authorize students.
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell><strong>Student</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Roll / Student ID</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Attempts</strong></TableCell>
                      <TableCell align="right"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEnrolled.map((row) => (
                      <TableRow key={row._id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 32, height: 32 }}>
                              {row.name ? row.name.charAt(0).toUpperCase() : 'S'}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {row.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.studentIdNumber || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label={row.status || 'ENROLLED'}
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {row.attemptsUsed || 0} / {row.attemptLimit || 1}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove student from this exam">
                            <IconButton
                              color="error"
                              size="small"
                              disabled={actionLoading}
                              onClick={() => handleUnenrollStudent(row.studentId, row.name)}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}

          {/* Tab 1: Available Platform Students */}
          {tabValue === 1 && (
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
              {loadingAllStudents ? (
                <Box display="flex" justifyContent="center" py={6}>
                  <CircularProgress />
                </Box>
              ) : availableToEnroll.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography variant="body1" color="text.secondary">
                    All registered platform students are already enrolled in this exam!
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell><strong>Student</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Roll / Student ID</strong></TableCell>
                      <TableCell><strong>Institution</strong></TableCell>
                      <TableCell align="right"><strong>Enrollment Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableToEnroll.map((s) => (
                      <TableRow key={s._id || s.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 32, height: 32 }}>
                              {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {s.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.studentIdNumber || '—'}</TableCell>
                        <TableCell>{s.institution || 'Engineering Institute'}</TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PersonAddIcon />}
                            disabled={actionLoading}
                            onClick={() => handleEnrollStudent(s)}
                          >
                            Authorize
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}
        </Box>
      </DashboardCard>
    </PageContainer>
  );
};

export default UserApprovalsPage;
