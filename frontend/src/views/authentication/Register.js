import React, { useEffect, useState } from 'react';
import { Grid, Box, Card, Typography, Stack } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import AuthRegister from './auth/AuthRegister';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useRegisterMutation } from './../../slices/usersApiSlice';
import { setCredentials } from './../../slices/authSlice';
import Loader from './Loader';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const userValidationSchema = yup.object({
  name: yup.string().min(2, 'Name must be at least 2 characters').required('Please enter your name'),
  email: yup.string().email('Enter a valid email address').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .matches(
      passwordRegex,
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
    ),
  confirm_password: yup
    .string()
    .required('Confirm Password is required')
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
  role: yup.string().oneOf(['student', 'teacher'], 'Invalid role').required('Role is required'),
  studentId: yup.string(),
  institution: yup.string(),
});

const initialUserValues = {
  name: '',
  email: '',
  password: '',
  confirm_password: '',
  role: 'student',
  studentId: '',
  institution: '',
};

const Register = () => {
  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [register, { isLoading }] = useRegisterMutation();
  const [faceData, setFaceData] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      const role = (userInfo.role || '').toLowerCase();
      if (role.includes('teacher') || role.includes('admin')) {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [navigate, userInfo]);

  // Immediate registration without OTP or blocking
  const handleSubmit = async ({ name, email, password, confirm_password, role, studentId, institution }) => {
    if (password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (role === 'student') {
      if (!consentAgreed) {
        toast.error('You must agree to the face verification consent to register as a student.');
        return;
      }
      if (!faceData || !faceData.isVerified || !faceData.faceImages || faceData.faceImages.length !== 3) {
        toast.error('Please provide and verify all 3 face photos before completing registration.');
        return;
      }
    }

    try {
      const payload = {
        name,
        email,
        password,
        role,
        studentId,
        clientCode: institution,
      };

      if (role === 'student' && faceData) {
        payload.faceConsent = consentAgreed;
        payload.faceImages = faceData.faceImages;
        payload.faceEmbeddings = faceData.faceEmbeddings;
        payload.averageEmbedding = faceData.averageEmbedding;
      }

      const res = await register(payload).unwrap();

      formik.resetForm();

      // Persist credentials immediately
      dispatch(setCredentials({ ...res }));
      toast.success(`Account registered successfully as ${role.toUpperCase()}!`);

      // Role-based routing
      const userRole = (res.role || role || '').toLowerCase();
      if (userRole.includes('teacher') || userRole.includes('admin')) {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Registration failed');
    }
  };

  return (
    <PageContainer title="Register" description="Register for AI Exam Proctoring">
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          py: 4,
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            opacity: '0.3',
            zIndex: 0,
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" alignItems="center" sx={{ minHeight: '100vh' }}>
          <Grid
            item
            xs={12}
            sm={10}
            md={8}
            lg={6}
            xl={5}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', borderRadius: 3 }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#1976d2',
                    textAlign: 'center',
                    letterSpacing: '-0.5px',
                  }}
                >
                  AI_Evalu8
                </Typography>
                <Typography variant="body2" color="textSecondary" textAlign="center" mt={0.5}>
                  Autonomous AI-Powered Exam Proctoring & Assessment
                </Typography>
              </Box>

              <AuthRegister
                formik={formik}
                faceData={faceData}
                setFaceData={setFaceData}
                consentAgreed={consentAgreed}
                setConsentAgreed={setConsentAgreed}
                subtext={
                  <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={2} fontWeight={500}>
                    Create your account to participate or manage exams
                  </Typography>
                }
                subtitle={
                  <Stack direction="row" justifyContent="center" spacing={1} mt={3}>
                    <Typography color="textSecondary" variant="body1">
                      Already have an account?
                    </Typography>
                    <Typography
                      component={Link}
                      to="/auth/login"
                      fontWeight="600"
                      sx={{
                        textDecoration: 'none',
                        color: 'primary.main',
                      }}
                    >
                      Sign In
                    </Typography>
                    {isLoading && <Loader />}
                  </Stack>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Register;
