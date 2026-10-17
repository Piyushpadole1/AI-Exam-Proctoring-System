import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Quiz';
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PageContainer from '../../components/container/PageContainer';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import axiosInstance from '../../axios';

const TeacherExamsPage = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Exam Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editExamData, setEditExamData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Manage Questions Dialog state
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestionMode, setNewQuestionMode] = useState(false);
  const [questionFormData, setQuestionFormData] = useState({
    question: '',
    marks: 1,
    options: [
      { option: '', isCorrect: true },
      { option: '', isCorrect: false },
      { option: '', isCorrect: false },
      { option: '', isCorrect: false },
    ],
  });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/users/exam');
      if (Array.isArray(response.data)) {
        setExams(response.data);
      } else {
        setExams([]);
      }
    } catch (err) {
      console.error('Failed to load teacher exams:', err);
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Filtered exams
  const filteredExams = exams.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      (e.examName && e.examName.toLowerCase().includes(q)) ||
      (e.examId && e.examId.toLowerCase().includes(q)) ||
      (e.subject && e.subject.toLowerCase().includes(q))
    );
  });

  // Handle Open Delete
  const handleOpenDelete = (exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      const examId = examToDelete._id || examToDelete.id || examToDelete.examId;
      await axiosInstance.delete(`/api/users/exam/${examId}`);
      toast.success(`Exam "${examToDelete.examName}" and all related data deleted.`);
      setDeleteDialogOpen(false);
      setExamToDelete(null);
      fetchExams();
    } catch (err) {
      console.error('Delete exam failed:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to delete exam');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Open Edit
  const handleOpenEdit = async (exam) => {
    let codingDetails = {
      title: '',
      description: '',
      constraints: '',
      difficulty: 'Medium',
      marks: exam.codingMarks || 20,
    };

    if (exam.hasCodingRound) {
      try {
        const idToQuery = exam._id || exam.id || exam.examId;
        const res = await axiosInstance.get(`/api/coding/questions/exam/${idToQuery}`);
        if (res.data?.success && res.data.data) {
          codingDetails = {
            ...codingDetails,
            title: res.data.data.title || res.data.data.question || '',
            description: res.data.data.description || '',
            constraints: res.data.data.constraints || '',
            difficulty: res.data.data.difficulty || 'Medium',
            marks: res.data.data.marks || exam.codingMarks || 20,
          };
        }
      } catch (e) {
        console.warn('Could not load coding details for edit:', e);
      }
    }

    setEditExamData({
      id: exam._id || exam.id,
      examId: exam.examId,
      examName: exam.examName || '',
      subject: exam.subject || '',
      description: exam.description || '',
      examPassword: exam.examPassword || '',
      duration: exam.duration || 30,
      totalQuestions: exam.totalQuestions || 0,
      passingMarks: exam.passingMarks || 40,
      liveDate: exam.liveDate ? exam.liveDate.substring(0, 16) : '',
      deadDate: exam.deadDate ? exam.deadDate.substring(0, 16) : '',
      hasCodingRound: Boolean(exam.hasCodingRound),
      codingMarks: exam.codingMarks || 20,
      codingDetails: codingDetails,
    });
    setEditDialogOpen(true);
  };

  // Submit Edit Exam
  const handleSaveEditExam = async () => {
    if (!editExamData) return;
    setIsUpdating(true);
    try {
      const payload = {
        examName: editExamData.examName,
        subject: editExamData.subject,
        description: editExamData.description,
        duration: Number(editExamData.duration),
        totalQuestions: Number(editExamData.totalQuestions),
        passingMarks: Number(editExamData.passingMarks),
        hasCodingRound: Boolean(editExamData.hasCodingRound),
        codingMarks: editExamData.hasCodingRound ? Number(editExamData.codingMarks || 20) : 0,
        liveDate: editExamData.liveDate,
        deadDate: editExamData.deadDate,
      };

      if (editExamData.examPassword) {
        payload.examPassword = editExamData.examPassword;
      }

      await axiosInstance.put(`/api/users/exam/${editExamData.id}`, payload);

      // If coding round enabled and has details, update coding question as well
      if (editExamData.hasCodingRound && editExamData.codingDetails?.title) {
        await axiosInstance.post('/api/coding/question', {
          examId: editExamData.id,
          title: editExamData.codingDetails.title,
          question: editExamData.codingDetails.title,
          description: editExamData.codingDetails.description,
          constraints: editExamData.codingDetails.constraints,
          difficulty: editExamData.codingDetails.difficulty,
          marks: Number(editExamData.codingMarks || 20),
        });
      }

      toast.success('Exam details updated successfully');
      setEditDialogOpen(false);
      setEditExamData(null);
      fetchExams();
    } catch (err) {
      console.error('Update exam failed:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to update exam');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Questions Manager
  const handleOpenQuestions = async (exam) => {
    setSelectedExamForQuestions(exam);
    setExamQuestions([]);
    setEditingQuestion(null);
    setNewQuestionMode(false);
    setQuestionsDialogOpen(true);
    setLoadingQuestions(true);

    try {
      const examIdentifier = exam.examId || exam._id || exam.id;
      const res = await axiosInstance.get(`/api/users/exam/questions/${examIdentifier}`);
      if (Array.isArray(res.data)) {
        setExamQuestions(res.data);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId) => {
    try {
      await axiosInstance.delete(`/api/users/exam/questions/${questionId}`);
      toast.success('Question deleted');
      setExamQuestions((prev) => prev.filter((q) => q._id !== String(questionId) && q.id !== String(questionId)));
      fetchExams();
    } catch (err) {
      console.error('Failed to delete question:', err);
      toast.error('Failed to delete question');
    }
  };

  // Save new or edited question
  const handleSaveQuestion = async () => {
    if (!questionFormData.question.trim()) {
      toast.warning('Question statement cannot be empty');
      return;
    }

    try {
      if (editingQuestion) {
        // Update existing question
        const qId = editingQuestion._id || editingQuestion.id;
        await axiosInstance.put(`/api/users/exam/questions/${qId}`, {
          question: questionFormData.question,
          marks: Number(questionFormData.marks || 1),
          options: questionFormData.options,
        });
        toast.success('Question updated successfully');
      } else {
        // Create new question
        const examIdentifier = selectedExamForQuestions.examId || selectedExamForQuestions._id;
        await axiosInstance.post('/api/users/exam/questions', {
          examId: examIdentifier,
          question: questionFormData.question,
          marks: Number(questionFormData.marks || 1),
          options: questionFormData.options,
        });
        toast.success('Question added successfully');
      }

      // Reload questions
      const examIdentifier = selectedExamForQuestions.examId || selectedExamForQuestions._id || selectedExamForQuestions.id;
      const res = await axiosInstance.get(`/api/users/exam/questions/${examIdentifier}`);
      if (Array.isArray(res.data)) setExamQuestions(res.data);

      setEditingQuestion(null);
      setNewQuestionMode(false);
      fetchExams();
    } catch (err) {
      console.error('Failed to save question:', err);
      toast.error('Failed to save question');
    }
  };

  return (
    <PageContainer title="My Exams" description="Manage your created exams">
      <Box p={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={3} gap={2}>
          <div>
            <Typography variant="h3" fontWeight="bold">
              My Exams
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              View, edit, configure, and manage only the exams created by you.
            </Typography>
          </div>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchExams}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create-exam')}
            >
              Create New Exam
            </Button>
          </Stack>
        </Box>

        {/* Search Bar */}
        <Box mb={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by Exam Name, Code, or Subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>

        {/* Exams Table / Empty State */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress />
          </Box>
        ) : filteredExams.length === 0 ? (
          <Card sx={{ p: 5, textAlign: 'center' }}>
            <QuizIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {exams.length === 0 ? 'No Exams Created Yet' : 'No Matching Exams Found'}
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              {exams.length === 0
                ? 'You have not created any exams. Click "Create New Exam" to set up your first MCQ and coding test.'
                : 'Try searching with a different keyword.'}
            </Typography>
            {exams.length === 0 && (
              <Button variant="contained" color="primary" onClick={() => navigate('/create-exam')}>
                Create Your First Exam
              </Button>
            )}
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell><strong>Exam Code</strong></TableCell>
                  <TableCell><strong>Exam Name</strong></TableCell>
                  <TableCell><strong>Subject</strong></TableCell>
                  <TableCell align="center"><strong>Duration</strong></TableCell>
                  <TableCell align="center"><strong>Questions</strong></TableCell>
                  <TableCell align="center"><strong>Pass Mark</strong></TableCell>
                  <TableCell align="center"><strong>Coding Round</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam._id || exam.id || exam.examId} hover>
                    <TableCell>
                      <Chip label={exam.examId} color="primary" variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="600">
                        {exam.examName}
                      </Typography>
                      {exam.description && (
                        <Typography variant="caption" color="textSecondary" noWrap display="block" maxWidth={260}>
                          {exam.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{exam.subject || 'General'}</TableCell>
                    <TableCell align="center">{exam.duration} mins</TableCell>
                    <TableCell align="center">
                      <Chip label={`${exam.totalQuestions || 0} MCQs`} size="small" />
                    </TableCell>
                    <TableCell align="center">{exam.passingMarks || 40}%</TableCell>
                    <TableCell align="center">
                      {exam.hasCodingRound ? (
                        <Chip
                          icon={<CodeIcon fontSize="small" />}
                          label={`Enabled (${exam.codingMarks || 20}m)`}
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip label="Skipped" variant="outlined" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Manage Questions">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenQuestions(exam)}
                          >
                            <QuizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Exam Settings">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEdit(exam)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Exam">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(exam)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── Delete Confirmation Dialog ── */}
        <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
          <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
            Delete Exam Confirmation
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete exam <strong>"{examToDelete?.examName}"</strong> ({examToDelete?.examId})?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action will permanently delete this exam and all associated data, including:
              <ul>
                <li>All MCQ questions</li>
                <li>Coding challenges and test cases</li>
                <li>Student exam attempts and score records</li>
                <li>Proctoring events, cheating logs, and evidence screenshots</li>
              </ul>
              This action cannot be undone.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Yes, Delete Exam'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Edit Exam Dialog ── */}
        <Dialog
          open={editDialogOpen}
          onClose={() => !isUpdating && setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            Edit Exam: {editExamData?.examName}
          </DialogTitle>
          <DialogContent dividers>
            {editExamData && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Exam Name"
                    value={editExamData.examName}
                    onChange={(e) => setEditExamData({ ...editExamData, examName: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Subject"
                    value={editExamData.subject}
                    onChange={(e) => setEditExamData({ ...editExamData, subject: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={editExamData.description}
                    onChange={(e) => setEditExamData({ ...editExamData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Duration (minutes)"
                    value={editExamData.duration}
                    onChange={(e) => setEditExamData({ ...editExamData, duration: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Passing Marks (%)"
                    value={editExamData.passingMarks}
                    onChange={(e) => setEditExamData({ ...editExamData, passingMarks: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Exam Password"
                    placeholder="Leave blank to keep current"
                    value={editExamData.examPassword}
                    onChange={(e) => setEditExamData({ ...editExamData, examPassword: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Date and Time"
                    type="datetime-local"
                    value={editExamData.liveDate}
                    onChange={(e) => setEditExamData({ ...editExamData, liveDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Date and Time"
                    type="datetime-local"
                    value={editExamData.deadDate}
                    onChange={(e) => setEditExamData({ ...editExamData, deadDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Coding Round Switch */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center" my={1}>
                    <Typography variant="h6" fontWeight="bold">
                      Coding Round Configuration
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editExamData.hasCodingRound}
                          onChange={(e) =>
                            setEditExamData({ ...editExamData, hasCodingRound: e.target.checked })
                          }
                          color="primary"
                        />
                      }
                      label={editExamData.hasCodingRound ? 'Coding Round Enabled' : 'Skipped / Disabled'}
                    />
                  </Box>
                </Grid>

                {editExamData.hasCodingRound && (
                  <>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="Coding Problem Title"
                        value={editExamData.codingDetails?.title || ''}
                        onChange={(e) =>
                          setEditExamData({
                            ...editExamData,
                            codingDetails: { ...editExamData.codingDetails, title: e.target.value },
                          })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <FormControl fullWidth>
                        <InputLabel>Difficulty</InputLabel>
                        <Select
                          label="Difficulty"
                          value={editExamData.codingDetails?.difficulty || 'Medium'}
                          onChange={(e) =>
                            setEditExamData({
                              ...editExamData,
                              codingDetails: { ...editExamData.codingDetails, difficulty: e.target.value },
                            })
                          }
                        >
                          <MenuItem value="Easy">Easy</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="Hard">Hard</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Coding Marks"
                        value={editExamData.codingMarks}
                        onChange={(e) =>
                          setEditExamData({
                            ...editExamData,
                            codingMarks: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Problem Description"
                        multiline
                        rows={3}
                        value={editExamData.codingDetails?.description || ''}
                        onChange={(e) =>
                          setEditExamData({
                            ...editExamData,
                            codingDetails: { ...editExamData.codingDetails, description: e.target.value },
                          })
                        }
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveEditExam}
              disabled={isUpdating}
            >
              {isUpdating ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Manage Questions Dialog ── */}
        <Dialog
          open={questionsDialogOpen}
          onClose={() => setQuestionsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Manage Questions: {selectedExamForQuestions?.examName}</span>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingQuestion(null);
                setQuestionFormData({
                  question: '',
                  marks: 1,
                  options: [
                    { option: '', isCorrect: true },
                    { option: '', isCorrect: false },
                    { option: '', isCorrect: false },
                    { option: '', isCorrect: false },
                  ],
                });
                setNewQuestionMode(true);
              }}
            >
              Add Question
            </Button>
          </DialogTitle>
          <DialogContent dividers>
            {newQuestionMode ? (
              <Box p={1}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={10}>
                    <TextField
                      fullWidth
                      label="Question Statement"
                      value={questionFormData.question}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                      multiline
                      rows={2}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Marks"
                      value={questionFormData.marks}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, marks: e.target.value })}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      Options (Click the radio to mark the correct option):
                    </Typography>
                    {questionFormData.options.map((opt, idx) => (
                      <Box key={idx} display="flex" alignItems="center" gap={1} mb={1.5}>
                        <Chip
                          label={opt.isCorrect ? 'Correct' : 'Option ' + (idx + 1)}
                          color={opt.isCorrect ? 'success' : 'default'}
                          onClick={() => {
                            const updated = questionFormData.options.map((o, oIdx) => ({
                              ...o,
                              isCorrect: oIdx === idx,
                            }));
                            setQuestionFormData({ ...questionFormData, options: updated });
                          }}
                          sx={{ cursor: 'pointer', minWidth: 90 }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`Option ${idx + 1} text`}
                          value={opt.option}
                          onChange={(e) => {
                            const updated = [...questionFormData.options];
                            updated[idx] = { ...updated[idx], option: e.target.value };
                            setQuestionFormData({ ...questionFormData, options: updated });
                          }}
                        />
                      </Box>
                    ))}
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1} mt={2}>
                  <Button variant="contained" color="primary" onClick={handleSaveQuestion}>
                    Save Question
                  </Button>
                  <Button variant="outlined" onClick={() => setNewQuestionMode(false)}>
                    Cancel
                  </Button>
                </Stack>
              </Box>
            ) : loadingQuestions ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : examQuestions.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary" gutterBottom>
                  No questions added to this exam yet.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNewQuestionMode(true)}
                  sx={{ mt: 1 }}
                >
                  Add First Question
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {examQuestions.map((q, idx) => (
                  <Card key={q._id || q.id || idx} variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Q{idx + 1}. {q.question || q.questionText}
                        </Typography>
                        <Chip
                          label={`${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5, mb: 1 }}
                        />
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditingQuestion(q);
                            setQuestionFormData({
                              question: q.question || q.questionText || '',
                              marks: q.marks || 1,
                              options: Array.isArray(q.options)
                                ? q.options.map((o) =>
                                    typeof o === 'string'
                                      ? { option: o, isCorrect: false }
                                      : { option: o.option || '', isCorrect: Boolean(o.isCorrect) }
                                  )
                                : [
                                    { option: '', isCorrect: true },
                                    { option: '', isCorrect: false },
                                    { option: '', isCorrect: false },
                                    { option: '', isCorrect: false },
                                  ],
                            });
                            setNewQuestionMode(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteQuestion(q._id || q.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Box pl={2}>
                      {Array.isArray(q.options) &&
                        q.options.map((opt, optIdx) => {
                          const optText = typeof opt === 'string' ? opt : opt.option;
                          const isCorrect = typeof opt === 'object' ? opt.isCorrect : optIdx === q.correctOptionIndex;
                          return (
                            <Typography
                              key={optIdx}
                              variant="body2"
                              color={isCorrect ? 'success.main' : 'textSecondary'}
                              sx={{ fontWeight: isCorrect ? 600 : 400 }}
                            >
                              • {optText} {isCorrect && '✓ (Correct)'}
                            </Typography>
                          );
                        })}
                    </Box>
                  </Card>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setQuestionsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default TeacherExamsPage;
