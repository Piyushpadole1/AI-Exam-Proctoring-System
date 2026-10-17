import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { CardActionArea, IconButton, Stack, Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '../../teacher/components/DeleteIcon';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const defaultImg =
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId, subject, isEnrolled, enrollmentStatus, teacherName, totalMarks } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isTeacher = (userInfo?.role || '').toLowerCase().includes('teacher');
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/exam/${examId}`);
  };

  const getStatusChip = () => {
    if (isTeacher) {
      return <Chip label="Faculty Mode" size="small" color="secondary" />;
    }
    if (isEnrolled || enrollmentStatus === 'ENROLLED') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Enrolled"
          size="small"
          color="success"
          sx={{ fontWeight: 600 }}
        />
      );
    }
    if (enrollmentStatus === 'PENDING') {
      return (
        <Chip
          label="Pending Approval"
          size="small"
          color="warning"
          sx={{ fontWeight: 600 }}
        />
      );
    }
    if (enrollmentStatus === 'REJECTED') {
      return (
        <Chip
          label="Rejected"
          size="small"
          color="error"
          sx={{ fontWeight: 600 }}
        />
      );
    }
    return (
      <Chip
        icon={<LockIcon />}
        label="Not Enrolled"
        size="small"
        sx={{ fontWeight: 600, bgcolor: 'grey.300' }}
      />
    );
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
      <CardActionArea onClick={handleCardClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ position: 'relative' }}>
          <CardMedia component="img" height="140" image={defaultImg} alt="Exam" />
          <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
            {getStatusChip()}
          </Box>
        </Box>

        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography gutterBottom variant="h5" component="div" fontWeight={700}>
                {examName}
              </Typography>
              {isTeacher && (
                <IconButton
                  aria-label="delete"
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                >
                  <DeleteIcon examId={examId} />
                </IconButton>
              )}
            </Stack>

            <Typography variant="body2" color="primary" fontWeight={600} mb={1}>
              {subject || 'General Assessment'} &nbsp;•&nbsp; Code: {examId}
            </Typography>
            {teacherName && (
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Instructor: {teacherName}
              </Typography>
            )}
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2} pt={1} sx={{ borderTop: '1px solid #f0f0f0' }}>
            <Typography variant="body2" color="textSecondary" fontWeight={500}>
              {totalQuestions || 0} Questions
            </Typography>
            <Typography variant="body2" color="textSecondary" fontWeight={500}>
              {duration ? `${duration} mins` : '30 mins'}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
