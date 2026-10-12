import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Grid,
} from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CodingQuestionForm from './CodingQuestionForm';

const CreateExam = ({ formik, title, subtitle, subtext }) => {
  const { values, errors, touched, handleBlur, handleChange, handleSubmit } = formik;

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <CustomTextField
              id="examName"
              name="examName"
              label="Exam Name"
              variant="outlined"
              fullWidth
              value={values.examName}
              onChange={handleChange}
              error={touched.examName && Boolean(errors.examName)}
              helperText={touched.examName && errors.examName}
              placeholder="e.g. Advanced Java & Spring Boot"
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              id="subject"
              name="subject"
              label="Subject / Domain"
              variant="outlined"
              fullWidth
              value={values.subject || ''}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              id="examId"
              name="examId"
              label="Exam Code (Unique Identifier)"
              variant="outlined"
              fullWidth
              value={values.examId || ''}
              onChange={handleChange}
              placeholder="e.g. JAVA501 (Auto-generated if empty)"
              helperText="Unique code students use to identify this exam"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              id="examPassword"
              name="examPassword"
              label="Exam Password"
              type="text"
              variant="outlined"
              fullWidth
              value={values.examPassword || ''}
              onChange={handleChange}
              placeholder="e.g. JAVA2026"
              helperText="Required by enrolled students to enter the exam session"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <CustomTextField
              id="totalQuestions"
              name="totalQuestions"
              label="Total Questions"
              variant="outlined"
              fullWidth
              value={values.totalQuestions}
              onChange={handleChange}
              error={touched.totalQuestions && Boolean(errors.totalQuestions)}
              helperText={touched.totalQuestions && errors.totalQuestions}
              placeholder="e.g. 20"
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              id="duration"
              name="duration"
              label="Duration (minutes)"
              variant="outlined"
              fullWidth
              value={values.duration}
              onChange={handleChange}
              error={touched.duration && Boolean(errors.duration)}
              helperText={touched.duration && errors.duration}
              placeholder="e.g. 45"
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              id="passingMarks"
              name="passingMarks"
              label="Passing Marks (%)"
              variant="outlined"
              fullWidth
              value={values.passingMarks || ''}
              onChange={handleChange}
              placeholder="e.g. 40"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              id="liveDate"
              name="liveDate"
              label="Start Date and Time"
              type="datetime-local"
              variant="outlined"
              fullWidth
              value={values.liveDate}
              onChange={handleChange}
              error={touched.liveDate && Boolean(errors.liveDate)}
              helperText={touched.liveDate && errors.liveDate}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              id="deadDate"
              name="deadDate"
              label="End Date and Time"
              type="datetime-local"
              variant="outlined"
              fullWidth
              value={values.deadDate}
              onChange={handleChange}
              error={touched.deadDate && Boolean(errors.deadDate)}
              helperText={touched.deadDate && errors.deadDate}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
        </Grid>

        <Box mt={3} mb={2}>
          <CodingQuestionForm formik={formik} />
        </Box>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={formik.isSubmitting}
          onClick={handleSubmit}
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          Create Exam & Add Question
        </Button>
      </Box>

      {subtitle}
    </>
  );
};

export default CreateExam;
