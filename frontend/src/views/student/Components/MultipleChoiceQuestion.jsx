import React, { useEffect, useState } from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Container } from '@mui/material';
import { useGetQuestionsQuery } from 'src/slices/examApiSlice';
import { useNavigate, useParams } from 'react-router';
import axiosInstance from '../../../axios';
import { toast } from 'react-toastify';

export default function MultipleChoiceQuestion({ questions, saveUserTestScore, submitTest, sessionId }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState(new Map());
  const [exam, setExam] = useState(null);
  const navigate = useNavigate();
  const { examId } = useParams();

  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [isFinishTest, setisFinishTest] = useState(false);

  const questionList = Array.isArray(questions) ? questions : [];

  useEffect(() => {
    setIsLastQuestion(currentQuestion === questionList.length - 1);
  }, [currentQuestion, questionList.length]);

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
              submitTest();
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

  const handleOptionChange = (event) => {
    const val = event.target.value;
    setSelectedOption(val);
    if (sessionId && currentQuestionData) {
      try {
        const qKey = String(currentQuestionData._id || currentQuestionData.id);
        const currentMap = Object.fromEntries(answers);
        currentMap[qKey] = val;
        axiosInstance.put(`/api/sessions/${sessionId}/autosave`, { answers: currentMap }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleNextQuestion = async () => {
    let isCorrect = false;

    if (currentQuestionData && currentQuestionData.options) {
      const correctOption = currentQuestionData.options.find((option) => option.isCorrect);
      if (correctOption && selectedOption !== null) {
        const correctVal = String(
          correctOption.id !== undefined ? correctOption.id : (correctOption.index !== undefined ? correctOption.index : correctOption.optionText)
        );
        isCorrect = correctVal === String(selectedOption);
      }
    }

    const qKey = String(currentQuestionData._id || currentQuestionData.id);
    const updatedAnswers = new Map(answers);
    if (selectedOption !== null) {
      updatedAnswers.set(qKey, selectedOption);
    }
    setAnswers(updatedAnswers);

    if (isCorrect) {
      setScore(score + 1);
      if (saveUserTestScore) saveUserTestScore();
    }

    if (isLastQuestion) {
      const answersObject = Object.fromEntries(updatedAnswers);
      if (selectedOption !== null) {
        answersObject[qKey] = selectedOption;
      }

      try {
        await axiosInstance.post(
          '/api/users/results',
          {
            examId,
            answers: answersObject,
          },
          {
            withCredentials: true,
          },
        );
      } catch (error) {
        console.warn('Error recording result in legacy endpoint:', error);
      }

      if (exam?.hasCodingRound) {
        navigate(`/exam/${examId}/codedetails`);
      } else {
        toast.success('Exam completed successfully!');
        if (submitTest) {
          submitTest(answersObject);
        } else {
          navigate(`/result`);
        }
      }
    }

    setSelectedOption(null);
    if (currentQuestion < questionList.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setisFinishTest(true);
    }
  };

  return (
    <Card
      style={{
        width: '50%',
        boxShadow: '2px',
      }}
    >
      <CardContent
        style={{
          boxShadow: '4px',
          padding: '2px',
          paddingRight: '4px',
          margin: '3px',
        }}
      >
        <Typography variant="h4" mb={3}>
          Question {currentQuestion + 1}:
        </Typography>
        <Typography variant="body1" mb={3}>
          {currentQuestionData.question}
        </Typography>
        <Box mb={10}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="quiz"
              name="quiz"
              value={selectedOption !== null ? String(selectedOption) : ''}
              onChange={handleOptionChange}
            >
              {Array.isArray(currentQuestionData.options) &&
                currentQuestionData.options.map((option, idx) => {
                  const optText =
                    option.optionText ||
                    option.text ||
                    option.option ||
                    (typeof option === 'string' ? option : `Option ${idx + 1}`);
                  const optVal = String(
                    option.id !== undefined && option.id !== null
                      ? option.id
                      : option._id !== undefined && option._id !== null
                        ? option._id
                        : option.index !== undefined && option.index !== null
                          ? option.index
                          : idx
                  );
                  return (
                    <FormControlLabel
                      key={optVal + '-' + idx}
                      value={optVal}
                      control={<Radio />}
                      label={optText}
                    />
                  );
                })}
            </RadioGroup>
          </FormControl>
        </Box>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextQuestion}
            disabled={selectedOption === null}
            style={{ marginLeft: 'auto' }}
          >
            {isLastQuestion ? (exam?.hasCodingRound ? 'Proceed to Coding' : 'Submit Exam') : 'Next Question'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
