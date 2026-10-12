import React, { useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Paper,
  Button,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from '../../../components/shared/BlankCard';
import ExamCard from './ExamCard';
import { useGetExamsQuery } from 'src/slices/examApiSlice';
import { useSelector } from 'react-redux';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import RefreshIcon from '@mui/icons-material/Refresh';

const Exams = () => {
  const { data: userExams, isLoading, isError, error, refetch } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);

  const isStudent = (userInfo?.role || '').toLowerCase().includes('student');

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="250px">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        sx={{ my: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Unable to load examinations from server: {error?.data?.message || 'Server connection error.'}
      </Alert>
    );
  }

  const allExams = Array.isArray(userExams) ? userExams : [];
  const enrolledExams = allExams.filter((e) => Boolean(e.isEnrolled));

  // Dynamic exams only: enrolled tab shows strictly enrolled exams, active tab shows all active
  const displayedExams = isStudent && tabValue === 0 ? enrolledExams : allExams;

  return (
    <PageContainer title="Exams" description="Examination Portal">
      {isStudent && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, val) => setTabValue(val)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              icon={<CheckCircleOutlineIcon />}
              iconPosition="start"
              label={`My Enrolled Exams (${enrolledExams.length})`}
            />
            <Tab
              icon={<ListAltIcon />}
              iconPosition="start"
              label={`All Active Exams (${allExams.length})`}
            />
          </Tabs>
        </Box>
      )}

      {displayedExams.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: 3,
            border: '1px dashed #cbd5e1',
          }}
        >
          <Typography variant="h5" fontWeight={700} color="textPrimary" gutterBottom>
            No exams available.
          </Typography>
          <Typography variant="body1" color="textSecondary" mb={2}>
            {isStudent && tabValue === 0
              ? 'You are not currently enrolled in any exams. Your instructor will authorize you when a test session is scheduled.'
              : 'There are currently no active exams configured in the system.'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size="small"
          >
            Refresh Exams
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {displayedExams.map((exam) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={exam._id || exam.examId}>
              <BlankCard>
                <ExamCard exam={exam} />
              </BlankCard>
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  );
};

export default Exams;
