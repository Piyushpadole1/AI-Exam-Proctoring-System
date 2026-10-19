import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Grid, Box, Card, Stack, Typography, Alert, Button } from '@mui/material';

import PageContainer from 'src/components/container/PageContainer';
import AuthLogin from './auth/AuthLogin';

import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';

import { useLoginMutation } from './../../slices/usersApiSlice';

import { setCredentials, logout } from './../../slices/authSlice';
import { toast } from 'react-toastify';
import Loader from './Loader';

const userValidationSchema = yup.object({
  email: yup.string('Enter your email').email('Enter a valid email').required('Email is required'),
  password: yup
    .string('Enter your password')
    .min(2, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
});
const initialUserValues = {
  email: '',
  password: '',
};

const Login = () => {
  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values, action) => {
      handleSubmit(values);
    },
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading }] = useLoginMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const handleSubmit = async ({ email, password }) => {
    try {
      const res = await login({ email, password }).unwrap();

      dispatch(setCredentials({ ...res }));
      formik.resetForm();

      const userRole = (res.role || '').toLowerCase();
      toast.success(`Welcome back, ${res.name || 'User'}!`);
      if (userRole.includes('teacher') || userRole.includes('admin')) {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Login failed');
    }
  };

  return (
    <PageContainer title="Login" description="this is Login page">
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
            lg={4}
            xl={3}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '500px' }}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Typography
                  variant="h4"
                  component="h1"
                  style={{
                    fontWeight: 'bold',
                    color: '#1976d2',
                    margin: '15px 0',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  AI_Evalu8
                </Typography>
              </Box>

              {userInfo && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Currently signed in as: {userInfo.name || userInfo.email} ({userInfo.role})
                  </Typography>
                  <Box mt={1} display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        const role = (userInfo.role || '').toLowerCase();
                        navigate(role.includes('teacher') || role.includes('admin') ? '/admin-dashboard' : '/dashboard');
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        dispatch(logout());
                        localStorage.clear();
                        sessionStorage.clear();
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Sign Out / Switch
                    </Button>
                  </Box>
                </Alert>
              )}

              <AuthLogin
                formik={formik}
                subtext={
                  <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={1}>
                    CONDUCT SECURE ONLINE EXAMS NOW
                  </Typography>
                }
                subtitle={
                  <Box mt={3} textAlign="center">
                    <Typography color="textSecondary" variant="body2" mb={1}>
                      Don't have an account yet?
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                      <Typography
                        component={Link}
                        to="/auth/register"
                        fontWeight="600"
                        sx={{
                          textDecoration: 'none',
                          color: 'primary.main',
                        }}
                      >
                        Register as Student
                      </Typography>
                      <Typography color="textSecondary">|</Typography>
                      <Typography
                        component={Link}
                        to="/auth/register"
                        fontWeight="600"
                        sx={{
                          textDecoration: 'none',
                          color: 'secondary.main',
                        }}
                      >
                        Register as Teacher
                      </Typography>
                    </Stack>
                    {isLoading && <Loader />}
                  </Box>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Login;
