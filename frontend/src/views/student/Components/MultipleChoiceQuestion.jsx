import React, { useEffect, useState } from 'react';
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FlagIcon from '@mui/icons-material/Flag';
import OutlinedFlagIcon from '@mui/icons-material/OutlinedFlag';
import { useNavigate, useParams } from 'react-router';
import axiosInstance from '../../../axios';
import { toast } from 'react-toastify';

export default function MultipleChoiceQuestion({
  questions,
  currentQuestion = 0,
  setCurrentQuestion,
  answers = {},
  setAnswers,
  flaggedQuestions = {},
  toggleFlagQuestion,
  saveUserTestScore,
  submitTest,
  sessionId,
}) {
  const [exam, setExam] = useState(null);
  const navigate = useNavigate();
  const { examId } = useParams();

  const questionList = Array.isArray(questions) ? questions : [];
  const isLastQuestion = currentQuestion === questionList.length - 1;

  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        const res = await axiosInstance.get(`/api/users/exam/${examId}`);
        if (res.data) setExam(res.data);
      } catch (e) {
        console.warn('Could not load exam details:', e);
      }
    };
    if (examId) fetchExamInfo();
  }, [examId]);

  if (questionList.length === 0) {
    const hasCoding = Boolean(exam?.hasCodingRound);
    return (
      <Card sx={{ width: '85%', maxWidth: '500px', p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          {hasCoding ? 'No Multiple-Choice Questions' : 'Exam Ready for Submission'}
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={3}>
          {hasCoding
            ? 'This exam consists of a programming evaluation. Proceed to the Coding Environment.'
            : 'All questions have been evaluated. You can submit your exam.'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (hasCoding) {
              navigate(`/exam/${examId}/codedetails`);
            } else if (submitTest) {
              submitTest(answers);
            } else {
              navigate(`/result`);
            }
          }}
          sx={{ fontWeight: 600 }}
        >
          {hasCoding ? 'Proceed to Coding Section' : 'Submit Exam'}
        </Button>
      </Card>
    );
  }

  const currentQuestionData = questionList[currentQuestion];
  if (!currentQuestionData) {
    return null;
  }

  const qKey = String(currentQuestionData._id || currentQuestionData.id);
  const currentSelectedOption = answers[qKey] !== undefined ? String(answers[qKey]) : '';
  const isFlagged = Boolean(flaggedQuestions[currentQuestion]);

  const handleOptionChange = (event) => {
    const val = event.target.value;
    const updated = {
      ...answers,
      [qKey]: val,
    };
    if (setAnswers) {
      setAnswers(updated);
    }
    if (sessionId) {
      axiosInstance.put(`/api/sessions/${sessionId}/autosave`, { answers: updated }).catch(() => {});
    }
  };

  const handlePrev = () => {
    if (setCurrentQuestion && currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (setCurrentQuestion && currentQuestion < questionList.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmitOrProceed = async () => {
    if (exam?.hasCodingRound) {
      navigate(`/exam/${examId}/codedetails`, { state: { mcqAnswers: answers, sessionId } });
    } else {
      toast.success('MCQ section completed!');
      if (submitTest) {
        submitTest(answers);
      } else {
        navigate(`/result`);
      }
    }
  };

  return (
    <Card sx={{ width: '92%', maxWidth: '750px', m: 2, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header row: Question Number & Flag button */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h4" fontWeight={700}>
              Question {currentQuestion + 1}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              of {questionList.length}
            </Typography>
            <Chip
              size="small"
              label={`${currentQuestionData.marks || 1} mark${(currentQuestionData.marks || 1) > 1 ? 's' : ''}`}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>

          {toggleFlagQuestion && (
            <Button
              variant={isFlagged ? 'contained' : 'outlined'}
              color="warning"
              size="small"
              startIcon={isFlagged ? <FlagIcon /> : <OutlinedFlagIcon />}
              onClick={() => toggleFlagQuestion(currentQuestion)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {isFlagged ? 'Flagged for Review' : 'Flag for Review'}
            </Button>
          )}
        </Box>

        {/* Question Text */}
        <Typography variant="h6" fontWeight={500} mb={3} sx={{ lineHeight: 1.6, color: '#1e293b' }}>
          {currentQuestionData.question || currentQuestionData.questionText}
        </Typography>

        {/* Options */}
        <Box mb={4}>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <RadioGroup
              aria-label="quiz-options"
              name="quiz-options"
              value={currentSelectedOption}
              onChange={handleOptionChange}
            >
              {Array.isArray(currentQuestionData.options) &&
                currentQuestionData.options.map((option, idx) => {
                  const optText =
                    option.optionText ||
                    option.text ||
                    option.option ||
                    (typeof option === 'string' ? option : `Option ${idx + 1}`);
                  const optVal = String(idx);
                  const isChecked = currentSelectedOption === optVal || currentSelectedOption === String(option?.id);

                  return (
                    <Box
                      key={`${optVal}-${idx}`}
                      sx={{
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        border: '1.5px solid',
                        borderColor: isChecked ? 'primary.main' : '#e2e8f0',
                        bgcolor: isChecked ? 'rgba(79, 70, 229, 0.04)' : '#fff',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: isChecked ? 'primary.main' : '#cbd5e1',
                          bgcolor: isChecked ? 'rgba(79, 70, 229, 0.06)' : '#f8fafc',
                        },
                      }}
                    >
                      <FormControlLabel
                        value={optVal}
                        control={<Radio color="primary" />}
                        label={<Typography variant="body1" sx={{ fontWeight: isChecked ? 600 : 400 }}>{optText}</Typography>}
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Box>
                  );
                })}
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Navigation Bar: Previous, Next, Submit */}
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<NavigateBeforeIcon />}
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Previous
          </Button>

          <Box display="flex" gap={1.5}>
            {isLastQuestion ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmitOrProceed}
                sx={{ fontWeight: 700, px: 3, textTransform: 'none' }}
              >
                {exam?.hasCodingRound ? 'Proceed to Coding Round' : 'Submit Exam'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<NavigateNextIcon />}
                onClick={handleNext}
                sx={{ fontWeight: 600, px: 3, textTransform: 'none' }}
              >
                Next Question
              </Button>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
