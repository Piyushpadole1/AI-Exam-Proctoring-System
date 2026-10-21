import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  IconUser,
  IconMail,
  IconCalendar,
  IconShieldCheck,
  IconAward,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconBook,
  IconUsers,
  IconClock,
  IconLock,
} from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from 'src/components/shared/DashboardCard';
import { useGetProfileSummaryQuery } from 'src/slices/usersApiSlice';

const UserProfilePage = () => {
  const { data: summary, isLoading, error } = useGetProfileSummaryQuery();

  if (isLoading) {
    return (
      <PageContainer title="My Profile" description="User Profile Details">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error || !summary) {
    return (
      <PageContainer title="My Profile" description="User Profile Details">
        <Box p={3}>
          <Alert severity="error">
            Failed to load profile details. {error?.data?.message || 'Please try again later.'}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  const isStudent = (summary.role || '').toLowerCase() === 'student';
  const hasPhoto = Boolean(summary.photo);
  const initials = summary.initials || 'U';

  const formattedDate = summary.createdAt
    ? new Date(summary.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <PageContainer title="My Profile" description="Read-only view of user details and summary">
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        {/* Profile Header Card */}
        <Card
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(93, 135, 255, 0.08) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm="auto" display="flex" justifyContent="center">
              {hasPhoto ? (
                <Avatar
                  src={summary.photo}
                  alt={summary.name}
                  sx={{
                    width: 104,
                    height: 104,
                    boxShadow: '0 8px 24px rgba(93, 135, 255, 0.25)',
                    border: '3px solid #fff',
                  }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: 104,
                    height: 104,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '2.5rem',
                    boxShadow: '0 8px 24px rgba(93, 135, 255, 0.25)',
                    border: '3px solid #fff',
                  }}
                >
                  {initials}
                </Avatar>
              )}
            </Grid>

            <Grid item xs={12} sm>
              <Box textAlign={{ xs: 'center', sm: 'left' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} mb={1}>
                  <Typography variant="h3" fontWeight={700} color="textPrimary">
                    {summary.name}
                  </Typography>
                  <Chip
                    label={summary.role ? summary.role.toUpperCase() : 'USER'}
                    color={isStudent ? 'primary' : 'secondary'}
                    size="small"
                    sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Chip
                    icon={<IconShieldCheck size={16} />}
                    label="Verified Account"
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 1, sm: 3 }}
                  alignItems={{ xs: 'center', sm: 'center' }}
                  color="textSecondary"
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconMail size={18} />
                    <Typography variant="body1">{summary.email}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconCalendar size={18} />
                    <Typography variant="body1">Joined {formattedDate}</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Card>

        {/* Role-Specific Metric Cards */}
        {isStudent ? (
          <>
            <Typography variant="h4" fontWeight={700} mb={3}>
              Academic & Examination Overview
            </Typography>

            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <DashboardCard title="Exams Taken">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                      <IconBook size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.examsTaken || 0}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Completed Sessions
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardCard title="Average Score">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 48, height: 48 }}>
                      <IconAward size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.averageScore !== undefined ? `${summary.averageScore}%` : '0%'}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Overall Performance
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardCard title="Pass / Fail Results">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      icon={<IconCheck size={16} />}
                      label={`${summary.passedCount || 0} Passed`}
                      color="success"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      icon={<IconX size={16} />}
                      label={`${summary.failedCount || 0} Failed`}
                      color="error"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </DashboardCard>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DashboardCard title="Total Violations">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: (summary.totalViolations || 0) > 0 ? 'warning.light' : 'success.light',
                        color: (summary.totalViolations || 0) > 0 ? 'warning.main' : 'success.main',
                        width: 48,
                        height: 48,
                      }}
                    >
                      <IconAlertTriangle size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.totalViolations || 0}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Flagged AI Warnings
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>

            {/* Registered Biometric Face Photos (strictly read-only) */}
            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <IconLock size={22} color="#5D87FF" />
                <Typography variant="h4" fontWeight={700}>
                  Registered Biometric Face Photos
                </Typography>
              </Stack>
              <Typography variant="body2" color="textSecondary" mb={3}>
                These 3 facial registration photos were captured during enrollment and are securely verified against live AI proctoring camera feeds during exams. They cannot be modified from user settings.
              </Typography>

              {summary.facePhotos && summary.facePhotos.length > 0 ? (
                <Grid container spacing={3}>
                  {summary.facePhotos.map((photoStr, idx) => (
                    <Grid item xs={12} sm={4} key={idx}>
                      <Box
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: idx === 0 ? 'primary.main' : 'divider',
                          backgroundColor: 'background.paper',
                          textAlign: 'center',
                          p: 1.5,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Box
                          component="img"
                          src={photoStr}
                          alt={`Registered Face ${idx + 1}`}
                          sx={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: 1.5,
                            backgroundColor: '#f5f5f5',
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5} px={1}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {idx === 0 ? 'Photo 1 (Primary / Avatar)' : `Photo ${idx + 1}`}
                          </Typography>
                          <Chip
                            label="Verified Biometric"
                            size="small"
                            color={idx === 0 ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  No biometric face registration profiles are recorded for this account.
                </Alert>
              )}
            </Card>
          </>
        ) : (
          /* Teacher Profile Metrics */
          <>
            <Typography variant="h4" fontWeight={700} mb={3}>
              Faculty & Exam Management Overview
            </Typography>

            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={4}>
                <DashboardCard title="Exams Created">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                      <IconBook size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.examsCreated || 0}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Total Published Assessments
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DashboardCard title="Total Students Enrolled">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                      <IconUsers size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.totalStudentsEnrolled || 0}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Across All Classes
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DashboardCard title="Pending Enrollment Requests">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: (summary.pendingEnrollmentRequests || 0) > 0 ? 'warning.light' : 'info.light',
                        color: (summary.pendingEnrollmentRequests || 0) > 0 ? 'warning.main' : 'info.main',
                        width: 48,
                        height: 48,
                      }}
                    >
                      <IconClock size={26} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {summary.pendingEnrollmentRequests || 0}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        Awaiting Authorization
                      </Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </PageContainer>
  );
};

export default UserProfilePage;
