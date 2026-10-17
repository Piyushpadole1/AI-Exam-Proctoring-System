import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Select,
  MenuItem,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
  Alert,
  InputLabel,
  FormControl,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useCreateQuestionMutation, useGetExamsQuery } from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';
import axiosInstance from '../../../axios';

const AddQuestionForm = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState([true, false, false, false]);
  const [marks, setMarks] = useState(1);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const [createQuestion] = useCreateQuestionMutation();
  const { data: examsData, isLoading: examsLoading } = useGetExamsQuery();

  // Pre-select first exam when available
  useEffect(() => {
    if (examsData && examsData.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].examId);
    }
  }, [examsData, selectedExamId]);

  // Fetch existing questions whenever selectedExamId changes
  useEffect(() => {
    if (!selectedExamId) {
      setQuestions([]);
      return;
    }
    const fetchExistingQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const res = await axiosInstance.get(`/api/users/exam/questions/${selectedExamId}`, {
          withCredentials: true,
        });
        if (Array.isArray(res.data)) {
          setQuestions(res.data);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.warn('Could not fetch existing questions:', err);
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchExistingQuestions();
  }, [selectedExamId]);

  const handleOptionCorrectToggle = (index) => {
    const updated = [...correctOptions];
    updated[index] = !updated[index];
    setCorrectOptions(updated);
  };

  const handleAddQuestion = async () => {
    setValidationError('');

    if (!selectedExamId) {
      setValidationError('Please select an exam first.');
      toast.error('Please select an exam first.');
      return;
    }

    if (!newQuestion.trim()) {
      setValidationError('Please enter the question statement.');
      toast.error('Question text cannot be empty.');
      return;
    }

    if (newOptions.some((opt) => !opt.trim())) {
      setValidationError('Please fill out all 4 option fields.');
      toast.error('All 4 options are required.');
      return;
    }

    if (!correctOptions.some(Boolean)) {
      setValidationError('Please check at least one correct option.');
      toast.error('At least one option must be marked as correct.');
      return;
    }

    const payload = {
      examId: selectedExamId,
      question: newQuestion.trim(),
      marks: Number(marks) || 1,
      options: newOptions.map((text, idx) => ({
        optionText: text.trim(),
        text: text.trim(),
        isCorrect: Boolean(correctOptions[idx]),
      })),
    };

    try {
      setSubmitting(true);
      const res = await createQuestion(payload).unwrap();
      toast.success('Question added successfully!');

      // Safely append to questions state
      const createdObj = {
        _id: res._id || String(Date.now()),
        question: payload.question,
        options: payload.options,
        marks: payload.marks,
      };
      setQuestions((prev) => [...prev, createdObj]);

      // Reset input form
      setNewQuestion('');
      setNewOptions(['', '', '', '']);
      setCorrectOptions([true, false, false, false]);
      setMarks(1);
      setValidationError('');
    } catch (err) {
      console.error('Failed to create question:', err);
      const msg = err?.data?.message || err?.data?.error || err?.error || 'Failed to add question. Please try again.';
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    try {
      await axiosInstance.delete(`/api/users/exam/questions/${questionId}`, {
        withCredentials: true,
      });
      toast.success('Question deleted.');
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete question');
    }
  };

  if (examsLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!examsData || examsData.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No exams found. Please create an exam first from the <b>Create Exam</b> page before adding questions.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Exam Selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="select-exam-label">Select Exam</InputLabel>
        <Select
          labelId="select-exam-label"
          label="Select Exam"
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
        >
          {examsData.map((exam) => (
            <MenuItem key={exam.examId} value={exam.examId}>
              {exam.examName} ({exam.examId}) — {exam.subject || 'General'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError('')}>
          {validationError}
        </Alert>
      )}

      {/* New Question Form Card */}
      <Card variant="outlined" sx={{ mb: 4, bgcolor: '#fafafa', p: 1 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="600" mb={2}>
            Add New MCQ Question
          </Typography>

          <TextField
            label="Question Statement"
            placeholder="e.g. Which data structure uses FIFO ordering?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2, bgcolor: '#ffffff' }}
            required
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Marks for this question"
              type="number"
              value={marks}
              onChange={(e) => setMarks(Math.max(1, Number(e.target.value)))}
              sx={{ width: 200, bgcolor: '#ffffff' }}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Stack>

          <Typography variant="subtitle2" color="textSecondary" mb={1}>
            Options (fill all 4 and check the correct answer):
          </Typography>

          {newOptions.map((opt, idx) => (
            <Stack
              key={idx}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <TextField
                label={`Option ${idx + 1}`}
                placeholder={`Option ${idx + 1} text`}
                value={opt}
                onChange={(e) => {
                  const updated = [...newOptions];
                  updated[idx] = e.target.value;
                  setNewOptions(updated);
                }}
                fullWidth
                sx={{ bgcolor: '#ffffff' }}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(correctOptions[idx])}
                    onChange={() => handleOptionCorrectToggle(idx)}
                    color="success"
                  />
                }
                label="Correct"
                sx={{ minWidth: 100 }}
              />
            </Stack>
          ))}

          <Button
            variant="contained"
            color="primary"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddCircleOutlineIcon />}
            onClick={handleAddQuestion}
            disabled={submitting}
            sx={{ mt: 1, px: 3, py: 1 }}
          >
            {submitting ? 'Saving Question...' : 'Save Question to Exam'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Questions List */}
      <Box>
        <Typography variant="h6" fontWeight="600" mb={2}>
          Configured Questions for this Exam ({questions.length})
        </Typography>

        {loadingQuestions ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={28} />
          </Box>
        ) : questions.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 2 }}>
            No questions added yet for this exam. Use the form above to add your first question.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {questions.map((qObj, qIdx) => {
              const opts = Array.isArray(qObj.options) ? qObj.options : [];
              return (
                <Card key={qObj._id || qIdx} variant="outlined" sx={{ p: 1 }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          {qIdx + 1}. {qObj.question}
                        </Typography>
                        <Chip
                          label={`${qObj.marks || 1} mark${(qObj.marks || 1) !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ mt: 0.5, mb: 1.5 }}
                        />
                      </Box>
                      {qObj._id && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteQuestion(qObj._id)}
                          title="Delete question"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Stack spacing={0.5} sx={{ pl: 2 }}>
                      {opts.map((opt, oIdx) => {
                        const optText =
                          typeof opt === 'string'
                            ? opt
                            : opt?.optionText || opt?.text || opt?.option || `Option ${oIdx + 1}`;
                        const isCorrect = Boolean(opt?.isCorrect);

                        return (
                          <Box
                            key={oIdx}
                            display="flex"
                            alignItems="center"
                            gap={1}
                            sx={{
                              p: 0.5,
                              borderRadius: 1,
                              bgcolor: isCorrect ? '#e8f5e9' : 'transparent',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isCorrect ? 600 : 400,
                                color: isCorrect ? 'success.dark' : 'text.primary',
                              }}
                            >
                              {String.fromCharCode(65 + oIdx)}. {optText}
                            </Typography>
                            {isCorrect && (
                              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AddQuestionForm;
