import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
} from '@mui/material';
import {
  IconCheck,
  IconArrowRight,
  IconClock,
  IconAlertCircle,
  IconBook,
  IconAward,
  IconUsers,
  IconShieldExclamation,
  IconInbox,
  IconCalendar,
} from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import { useGetUserTasksQuery } from 'src/slices/usersApiSlice';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'READY_EXAM':
      return <IconBook size={24} color="#5D87FF" />;
    case 'PENDING_ENROLLMENT':
      return <IconClock size={24} color="#FFAE1F" />;
    case 'RECENT_RESULT':
      return <IconAward size={24} color="#13DEB9" />;
    case 'PENDING_APPROVALS':
      return <IconUsers size={24} color="#FA896B" />;
    case 'ONGOING_EXAM':
      return <IconCalendar size={24} color="#5D87FF" />;
    case 'FLAGGED_VIOLATIONS':
      return <IconShieldExclamation size={24} color="#FFAE1F" />;
    default:
      return <IconAlertCircle size={24} color="#5D87FF" />;
  }
};

const UserTasksPage = () => {
  const { data, isLoading, error, refetch } = useGetUserTasksQuery(undefined, {
    pollingInterval: 15000,
  });

  if (isLoading) {
    return (
      <PageContainer title="My Tasks" description="Active user tasks and actionable alerts">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="My Tasks" description="Active user tasks and actionable alerts">
        <Box p={3}>
          <Alert severity="error">
            Failed to load tasks. {error?.data?.message || 'Please try again later.'}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  const tasks = data?.tasks || [];

  return (
    <PageContainer title="My Tasks" description="Real-time Actionable items for exams and proctoring">
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h3" fontWeight={700}>
              My Tasks
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={0.5}>
              Real-time actionable items, approvals, and examination notifications.
            </Typography>
          </Box>
          {tasks.length > 0 && (
            <Chip
              label={`${tasks.length} Action${tasks.length > 1 ? 's' : ''} Pending`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {tasks.length === 0 ? (
          /* Empty State */
          <Card
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'success.light',
                color: 'success.main',
                width: 72,
                height: 72,
                mx: 'auto',
                mb: 2,
              }}
            >
              <IconCheck size={40} />
            </Avatar>
            <Typography variant="h3" fontWeight={700} color="textPrimary" mb={1}>
              No tasks right now
            </Typography>
            <Typography variant="body1" color="textSecondary" maxWidth={480} mx="auto" mb={3}>
              You are all caught up! There are no pending enrollments, upcoming exams, or proctoring alerts requiring your attention right now.
            </Typography>
            <Button variant="outlined" color="primary" onClick={() => refetch()} startIcon={<IconClock size={18} />}>
              Refresh Tasks
            </Button>
          </Card>
        ) : (
          /* Task List */
          <Grid container spacing={2}>
            {tasks.map((task) => (
              <Grid item xs={12} key={task.id}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 4px 16px rgba(93, 135, 255, 0.12)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs="auto">
                      <Avatar
                        sx={{
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                          width: 48,
                          height: 48,
                        }}
                      >
                        {getCategoryIcon(task.category)}
                      </Avatar>
                    </Grid>

                    <Grid item xs>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={0.5}>
                        <Typography variant="h6" fontWeight={700}>
                          {task.title}
                        </Typography>
                        {task.badge && (
                          <Chip
                            label={task.badge}
                            color={task.badgeColor || 'primary'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="textSecondary">
                        {task.description}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm="auto">
                      <Button
                        component={Link}
                        to={task.actionLink || '/dashboard'}
                        variant="contained"
                        color={task.badgeColor === 'error' ? 'error' : 'primary'}
                        endIcon={<IconArrowRight size={18} />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 2,
                          px: 2.5,
                        }}
                      >
                        {task.actionText || 'Open'}
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </PageContainer>
  );
};

export default UserTasksPage;
