import React, { useState, useEffect } from 'react';
import {
  Grid,
  Avatar,
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import { toast } from 'react-toastify';

const NumberOfQuestions = ({
  questions = [],
  questionLength = 0,
  currentQuestion = 0,
  setCurrentQuestion,
  answers = {},
  flaggedQuestions = {},
  submitTest,
  examDurationInSeconds = 30,
}) => {
  const totalQuestions = questionLength || (Array.isArray(questions) ? questions.length : 0);
  const questionNumbers = Array.from({ length: totalQuestions }, (_, index) => index + 1);

  const [timeLeft, setTimeLeft] = useState(examDurationInSeconds * 60);

  useEffect(() => {
    setTimeLeft(examDurationInSeconds * 60);
  }, [examDurationInSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTimeUp = () => {
    toast.warning('Time is up! Submitting your exam...');
    if (submitTest) submitTest(answers);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleQuestionButtonClick = (index) => {
    if (setCurrentQuestion) {
      setCurrentQuestion(index);
    }
  };

  // Compute status counts
  const qList = Array.isArray(questions) ? questions : [];
  let answeredCount = 0;
  let flaggedCount = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const qKey = qList[i] ? String(qList[i]._id || qList[i].id) : String(i);
    if (answers[qKey] !== undefined) answeredCount++;
    if (flaggedQuestions[i]) flaggedCount++;
  }
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header: Progress & Timer */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" fontWeight={700} color="textPrimary">
            Question {totalQuestions > 0 ? currentQuestion + 1 : 0} of {totalQuestions}
          </Typography>
          <Chip
            label={`Time Left: ${formatTime(timeLeft)}`}
            color={timeLeft < 300 ? 'error' : 'primary'}
            size="small"
            sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
        </Stack>
        <Button
          variant="contained"
          color="error"
          size="small"
          fullWidth
          onClick={() => {
            if (window.confirm('Are you sure you want to finish and submit your exam?')) {
              submitTest(answers);
            }
          }}
          sx={{ mt: 1, fontWeight: 600, textTransform: 'none' }}
        >
          Finish &amp; Submit Test
        </Button>
      </Box>

      {/* Question Palette Grid */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto', maxHeight: '220px' }}>
        <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={1}>
          QUESTION PALETTE
        </Typography>

        <Grid container spacing={1}>
          {questionNumbers.map((num, idx) => {
            const qKey = qList[idx] ? String(qList[idx]._id || qList[idx].id) : String(idx);
            const isCurrent = idx === currentQuestion;
            const isAnswered = answers[qKey] !== undefined;
            const isFlagged = Boolean(flaggedQuestions[idx]);

            let bg = '#94a3b8'; // Default Unanswered: Slate
            let textColor = '#ffffff';

            if (isFlagged) {
              bg = '#f59e0b'; // Flagged: Amber
            } else if (isAnswered) {
              bg = '#10b981'; // Answered: Emerald Green
            }

            return (
              <Grid item xs={2.4} sm={2} key={num}>
                <Avatar
                  variant="rounded"
                  onClick={() => handleQuestionButtonClick(idx)}
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: '14px',
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    bgcolor: bg,
                    color: textColor,
                    border: isCurrent ? '2.5px solid #2563eb' : '1px solid transparent',
                    boxShadow: isCurrent ? '0 0 0 2px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    '&:hover': {
                      transform: 'scale(1.08)',
                      opacity: 0.9,
                    },
                  }}
                >
                  {num}
                  {isFlagged && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 1,
                        right: 1,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#fff',
                      }}
                    />
                  )}
                </Avatar>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider />

      {/* Palette Legend */}
      <Box sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#10b981' }} />
              <Typography variant="caption" color="textSecondary">
                Answered ({answeredCount})
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#94a3b8' }} />
              <Typography variant="caption" color="textSecondary">
                Unanswered ({unansweredCount})
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#f59e0b' }} />
              <Typography variant="caption" color="textSecondary">
                Flagged ({flaggedCount})
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', border: '2px solid #2563eb', bgcolor: '#fff' }} />
              <Typography variant="caption" color="textSecondary">
                Current
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default NumberOfQuestions;
