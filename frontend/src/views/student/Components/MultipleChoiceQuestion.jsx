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

export default function MultipleChoiceQuestion({ questions, saveUserTestScore, submitTest }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState(new Map());
  const navigate = useNavigate();
  const { examId } = useParams();

  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [isFinishTest, setisFinishTest] = useState(false);

  const questionList = Array.isArray(questions) ? questions : [];

  useEffect(() => {
    setIsLastQuestion(currentQuestion === questionList.length - 1);
  }, [currentQuestion, questionList.length]);

  if (questionList.length === 0) {
    return (
      <Card sx={{ width: '85%', maxWidth: '500px', p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          No Multiple-Choice Questions
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={3}>
          This exam focuses on practical programming evaluation. You can now proceed to the Coding Environment.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(`/exam/${examId}/codedetails`)}
          sx={{ fontWeight: 600 }}
        >
          Proceed to Coding Section
        </Button>
      </Card>
    );
  }

  const currentQuestionData = questionList[currentQuestion];
  if (!currentQuestionData) {
    return null;
  }

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleNextQuestion = async () => {
    let isCorrect = false;

    if (currentQuestionData && currentQuestionData.options) {
      const correctOption = currentQuestionData.options.find((option) => option.isCorrect);
      if (correctOption && selectedOption) {
        isCorrect = correctOption.id === selectedOption;
      }
    }

    // Add answer to answers Map
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(currentQuestionData._id, selectedOption);
      return newAnswers;
    });

    if (isCorrect) {
      setScore(score + 1);
      saveUserTestScore();
    }

    if (isLastQuestion) {
      try {
        const answersObject = Object.fromEntries(answers);
        if (selectedOption) {
          answersObject[currentQuestionData._id] = selectedOption;
        }

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

        navigate(`/exam/${examId}/codedetails`);
      } catch (error) {
        console.error('Error saving results:', error);
        toast.error('Failed to save results');
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
              value={selectedOption || ''}
              onChange={handleOptionChange}
            >
              {Array.isArray(currentQuestionData.options) &&
                currentQuestionData.options.map((option) => (
                  <FormControlLabel
                    key={option._id || option.id || option.optionText}
                    value={option._id || option.id || option.optionText}
                    control={<Radio />}
                    label={option.optionText || option.text}
                  />
                ))}
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
            {isLastQuestion ? 'Proceed to Coding' : 'Next Question'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
