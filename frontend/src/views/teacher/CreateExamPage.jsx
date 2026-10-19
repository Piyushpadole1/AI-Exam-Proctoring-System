import React from 'react';
import { Grid, Box, Card, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import ExamForm from './components/ExamForm';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCreateExamMutation } from '../../slices/examApiSlice.js';
import axiosInstance from '../../axios';

const examValidationSchema = yup.object({
  examName: yup.string().required('Exam Name is required'),
  totalMarks: yup
    .number()
    .typeError('Total Marks must be a number')
    .positive('Total Marks must be positive')
    .required('Total Marks is required'),
  passingMarks: yup
    .number()
    .typeError('Passing Marks must be a number')
    .positive('Passing Marks must be positive')
    .max(yup.ref('totalMarks'), 'Passing Marks cannot exceed Total Marks')
    .required('Passing Marks is required'),
  totalQuestions: yup
    .number()
    .typeError('Total Number of Questions must be a number')
    .integer('Total Number of Questions must be an integer')
    .positive('Total Number of Questions must be positive')
    .required('Total Number of Questions is required'),
  duration: yup
    .number()
    .typeError('Exam Duration must be a number')
    .integer('Exam Duration must be an integer')
    .min(1, 'Exam Duration must be at least 1 minute')
    .required('Exam Duration is required'),
  liveDate: yup.date().required('Live Date and Time is required'),
  deadDate: yup.date().required('Dead Date and Time is required'),
  hasCodingRound: yup.boolean(),
  codingQuestion: yup.object().when('hasCodingRound', {
    is: true,
    then: () =>
      yup.object({
        title: yup.string().required('Coding Question Title is required'),
        description: yup.string().required('Question Description is required'),
      }),
    otherwise: () => yup.object().nullable().notRequired(),
  }),
});

const CreateExamPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [createExam] = useCreateExamMutation();

  const initialExamValues = {
    examName: '',
    examId: '',
    examPassword: '',
    subject: '',
    totalMarks: 100,
    passingMarks: 40,
    totalQuestions: '',
    duration: '30',
    liveDate: '',
    deadDate: '',
    hasCodingRound: false,
    codingMarks: 20,
    codingQuestion: {
      title: '',
      question: '',
      description: '',
      constraints: '',
      difficulty: 'Medium',
      marks: 20,
      allowedLanguages: 'javascript,python,java,c,cpp',
      sampleTestCases: [{ input: '', expectedOutput: '', explanation: '' }],
      hiddenTestCases: [{ input: '', expectedOutput: '' }],
    },
  };

  const handleSubmit = async (values) => {
    try {
      const examPayload = {
        ...values,
        totalMarks: Number(values.totalMarks || 100),
        passingMarks: Number(values.passingMarks || 40),
        hasCodingRound: Boolean(values.hasCodingRound),
        codingMarks: values.hasCodingRound ? Number(values.codingQuestion?.marks || 20) : 0,
        userId: userInfo?._id || userInfo?.id,
        email: userInfo?.email,
        teacherId: userInfo?._id || userInfo?.id,
      };
      // First create the exam
      const examResponse = await createExam(examPayload).unwrap();
      console.log('Exam Response:', examResponse);

      if (examResponse) {
        // Get exam ID from response (handle different possible formats)
        const examId = examResponse.examId || examResponse._id || examResponse.id;

        if (!examId) {
          console.error('No exam ID found in response:', examResponse);
          toast.error('Failed to get exam ID');
          return;
        }

        // If coding round is enabled, create the coding question
        if (values.hasCodingRound && (values.codingQuestion?.title || values.codingQuestion?.question)) {
          const codingQuestionData = {
            title: values.codingQuestion.title || values.codingQuestion.question,
            question: values.codingQuestion.title || values.codingQuestion.question,
            description: values.codingQuestion.description || '',
            constraints: values.codingQuestion.constraints || '',
            difficulty: values.codingQuestion.difficulty || 'Medium',
            marks: values.codingQuestion.marks || 20,
            allowedLanguages: values.codingQuestion.allowedLanguages || 'javascript,python,java,c,cpp',
            sampleTestCases: values.codingQuestion.sampleTestCases || [],
            hiddenTestCases: values.codingQuestion.hiddenTestCases || [],
            examId: examId,
          };

          try {
            const codingResponse = await axiosInstance.post(
              '/api/coding/question',
              codingQuestionData,
              { withCredentials: true }
            );
            if (!codingResponse.data.success) {
              console.warn('Coding question API warning:', codingResponse.data);
            }
          } catch (codingError) {
            console.error('Coding Question Error:', codingError.response?.data || codingError);
            toast.error(codingError.response?.data?.message || 'Failed to create coding question');
          }
        }

        toast.success(values.hasCodingRound ? 'Exam and coding question created successfully' : 'Exam created successfully');
        formik.resetForm();
      }
    } catch (err) {
      console.error('Exam Creation Error:', err);
      toast.error(err?.data?.message || err.error || 'Failed to create exam');
    }
  };

  const formik = useFormik({
    initialValues: initialExamValues,
    validationSchema: examValidationSchema,
    onSubmit: handleSubmit,
  });

  return (
    <PageContainer title="Create Exam" description="Create a new exam">
      <Box
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" sx={{ height: '100vh' }}>
          <Grid
            item
            xs={12}
            sm={12}
            lg={12}
            xl={6}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '800px' }}>
              <ExamForm
                formik={formik}
                title={
                  <Typography variant="h3" textAlign="center" color="textPrimary" mb={1}>
                    Create Exam
                  </Typography>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default CreateExamPage;
