import React, { useState } from 'react';
import {
  Grid,
  Box,
  Card,
  Typography,
  Button,
  Avatar,
  Stack,
  IconButton,
  InputAdornment,
  Alert,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material';
// import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useUpdateUserMutation,
  useGetProfilePhotoQuery,
  useUpdateProfilePhotoMutation,
} from '../../slices/usersApiSlice';
import { setCredentials } from '../../slices/authSlice';
import PasswordRequirementsChecklist from '../../components/forms/PasswordRequirementsChecklist';
import {
  IconEye,
  IconEyeOff,
  IconUpload,
  IconLock,
  IconCheck,
} from '@tabler/icons-react';

const userValidationSchema = yup.object({
  name: yup.string().min(2, 'Name must be at least 2 characters').max(50).required('Please enter your name'),
  email: yup.string().email('Enter a valid email address').required('Email is required'),
  current_password: yup.string().when('password', {
    is: (val) => val && val.length > 0,
    then: () => yup.string().required('Current password is required to change your password'),
    otherwise: () => yup.string().notRequired(),
  }),
  password: yup
    .string()
    .nullable()
    .optional()
    .test(
      'strong-password',
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      (value) => {
        if (!value || value.trim().length === 0) return true;
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
      },
    ),
  confirm_password: yup
    .string()
    .nullable()
    .optional()
    .when('password', {
      is: (val) => val && val.length > 0,
      then: () =>
        yup
          .string()
          .required('Please confirm your new password')
          .oneOf([yup.ref('password')], 'Passwords must match'),
      otherwise: () => yup.string().notRequired(),
    }),
});

const UserAccount = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
// const navigate = useNavigate();

  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateUserMutation();
  const { data: photoData, refetch: refetchPhoto } = useGetProfilePhotoQuery();
  const [updatePhotoMutation, { isLoading: isUploadingPhoto }] = useUpdateProfilePhotoMutation();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [formError, setFormError] = useState('');

  const isStudent = (userInfo?.role || '').toLowerCase() === 'student';
  const isTeacher = !isStudent;

  const formik = useFormik({
    initialValues: {
      name: userInfo?.name || '',
      email: userInfo?.email || '',
      current_password: '',
      password: '',
      confirm_password: '',
    },
    validationSchema: userValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      setFormError('');
      try {
        const payload = {
          _id: userInfo?._id,
          name: values.name.trim(),
          email: values.email.trim(),
        };

        if (values.password && values.password.trim()) {
          payload.currentPassword = values.current_password;
          payload.password = values.password.trim();
        }

        const res = await updateProfile(payload).unwrap();
        dispatch(setCredentials({ ...userInfo, ...res }));
        toast.success('Account information updated successfully!');

        // Reset password fields
        resetForm({
          values: {
            name: values.name,
            email: values.email,
            current_password: '',
            password: '',
            confirm_password: '',
          },
        });
      } catch (err) {
        const errMsg = err?.data?.message || err?.error || 'Failed to update account information.';
        setFormError(errMsg);
        toast.error(errMsg);
      }
    },
  });

  const handleFileChange = (e) => {
    setPhotoError('');
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size must be less than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!photoPreview) return;
    setPhotoError('');
    try {
      await updatePhotoMutation({ photo: photoPreview }).unwrap();
      toast.success('Profile photo uploaded and updated successfully!');
      setPhotoPreview(null);
      refetchPhoto();
    } catch (err) {
      const msg = err?.data?.message || err?.error || 'Failed to upload profile photo.';
      setPhotoError(msg);
      toast.error(msg);
    }
  };

  const handleCancelPhoto = () => {
    setPhotoPreview(null);
    setPhotoError('');
  };

  const currentPhoto = photoPreview || (photoData?.hasPhoto ? photoData.photo : null);
  const initials = photoData?.initials || (userInfo?.name ? userInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U');

  return (
    <PageContainer title="My Account" description="Update Account Information">
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        <Typography variant="h3" fontWeight={700} mb={1}>
          Account Settings
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={4}>
          Manage your personal details, secure login password, and profile image.
        </Typography>

        <Grid container spacing={3}>
          {/* Left Column: Profile Photo Card */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" fontWeight={700} mb={2}>
                Profile Photo
              </Typography>

              <Box display="flex" justifyContent="center" mb={2}>
                {currentPhoto ? (
                  <Avatar
                    src={currentPhoto}
                    alt={userInfo?.name || 'User'}
                    sx={{
                      width: 120,
                      height: 120,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      border: '3px solid',
                      borderColor: 'primary.light',
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 20px rgba(93,135,255,0.25)',
                    }}
                  >
                    {initials}
                  </Avatar>
                )}
              </Box>

              <Typography variant="subtitle1" fontWeight={700}>
                {userInfo?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={2}>
                {userInfo?.email}
              </Typography>

              <Chip
                label={isStudent ? 'STUDENT' : 'FACULTY / TEACHER'}
                color={isStudent ? 'primary' : 'secondary'}
                size="small"
                sx={{ fontWeight: 'bold', mb: 3 }}
              />

              <Divider sx={{ my: 2 }} />

              {/* Photo Upload Controls */}
              {isTeacher ? (
                <Box>
                  {photoError && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
                      {photoError}
                    </Alert>
                  )}

                  {photoPreview ? (
                    <Stack spacing={1.5}>
                      <Typography variant="caption" color="textSecondary">
                        Preview ready to save:
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSavePhoto}
                        disabled={isUploadingPhoto}
                        startIcon={isUploadingPhoto ? <CircularProgress size={16} /> : <IconCheck size={18} />}
                        fullWidth
                      >
                        {isUploadingPhoto ? 'Saving Photo…' : 'Save Photo'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        onClick={handleCancelPhoto}
                        disabled={isUploadingPhoto}
                        fullWidth
                      >
                        Cancel
                      </Button>
                    </Stack>
                  ) : (
                    <Box>
                      <Button
                        variant="outlined"
                        color="primary"
                        component="label"
                        startIcon={<IconUpload size={18} />}
                        fullWidth
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Upload Profile Photo
                        <input
                          type="file"
                          hidden
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleFileChange}
                        />
                      </Button>
                      <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                        JPG, PNG, or WEBP up to 5 MB
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  p={2}
                  bgcolor="rgba(93, 135, 255, 0.05)"
                  borderRadius={2}
                  border="1px dashed"
                  borderColor="primary.light"
                >
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={0.5}>
                    <IconLock size={18} color="#5D87FF" />
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      Biometric Face Locked
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Your face photos are verified at registration for AI exam proctoring identity verification and cannot be modified.
                  </Typography>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Right Column: Account Details & Password Form */}
          <Grid item xs={12} md={8}>
            <Card
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h4" fontWeight={700} mb={1}>
                Personal Information & Security
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={3}>
                Update your account credentials and change your password.
              </Typography>

              {formError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {formError}
                </Alert>
              )}

              <Box component="form" onSubmit={formik.handleSubmit}>
                <Stack spacing={3}>
                  {/* Name Field */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb="6px">
                      Full Name
                    </Typography>
                    <CustomTextField
                      id="name"
                      name="name"
                      placeholder="Enter your full name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.name && Boolean(formik.errors.name)}
                      helperText={formik.touched.name && formik.errors.name}
                      fullWidth
                    />
                  </Box>

                  {/* Email Field */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb="6px">
                      Email Address
                    </Typography>
                    <CustomTextField
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.email && Boolean(formik.errors.email)}
                      helperText={formik.touched.email && formik.errors.email}
                      fullWidth
                    />
                  </Box>

                  <Divider sx={{ my: 1 }}>
                    <Chip label="Change Password (Optional)" size="small" />
                  </Divider>

                  {/* Current Password Field */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb="6px">
                      Current Password
                    </Typography>
                    <CustomTextField
                      id="current_password"
                      name="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Required only to change password"
                      value={formik.values.current_password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.current_password && Boolean(formik.errors.current_password)}
                      helperText={
                        (formik.touched.current_password && formik.errors.current_password) ||
                        'Enter your current password to verify your identity before setting a new password.'
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              edge="end"
                              size="small"
                              aria-label="Toggle current password visibility"
                            >
                              {showCurrentPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Box>

                  {/* New Password Field */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb="6px">
                      New Password
                    </Typography>
                    <CustomTextField
                      id="password"
                      name="password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Leave blank to keep existing password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.password && Boolean(formik.errors.password)}
                      helperText={
                        (formik.touched.password && formik.errors.password) ||
                        'Minimum 8 characters with upper, lower, number & special character. Leave blank if not changing.'
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                              size="small"
                              aria-label="Toggle new password visibility"
                            >
                              {showNewPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                    <PasswordRequirementsChecklist
                      password={formik.values.password}
                      showAlways={Boolean(formik.values.password && formik.values.password.length > 0)}
                    />
                  </Box>

                  {/* Confirm New Password Field */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} mb="6px">
                      Confirm New Password
                    </Typography>
                    <CustomTextField
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={formik.values.confirm_password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.confirm_password && Boolean(formik.errors.confirm_password)}
                      helperText={formik.touched.confirm_password && formik.errors.confirm_password}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size="small"
                              aria-label="Toggle confirm password visibility"
                            >
                              {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Box>

                  <Box pt={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      disabled={isUpdatingProfile}
                      startIcon={isUpdatingProfile ? <CircularProgress size={18} color="inherit" /> : null}
                      sx={{
                        px: 4,
                        py: 1.2,
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: 'none',
                      }}
                    >
                      {isUpdatingProfile ? 'Saving Changes…' : 'Save Account Changes'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default UserAccount;
