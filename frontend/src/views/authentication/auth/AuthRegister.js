import React from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

const AuthRegister = ({ formik, title, subtitle, subtext }) => {
  const { values, errors, touched, handleBlur, handleChange, setFieldValue } = formik;

  const handleRoleTabChange = (event, newRole) => {
    if (newRole) {
      setFieldValue('role', newRole);
    }
  };

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box component="form" onSubmit={formik.handleSubmit}>
        {/* Role Selector Tabs: Student vs Teacher */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={values.role}
            onChange={handleRoleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              icon={<SchoolIcon />}
              iconPosition="start"
              label="Student"
              value="student"
              sx={{ fontWeight: 600 }}
            />
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label="Teacher"
              value="teacher"
              sx={{ fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        <Stack mb={2} spacing={2}>
          {/* Name */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="name" mb="5px" display="block">
              Full Name
            </Typography>
            <CustomTextField
              id="name"
              name="name"
              placeholder={values.role === 'teacher' ? 'e.g. Prof. Alan Turing' : 'e.g. Alice Johnson'}
              variant="outlined"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.name && Boolean(errors.name)}
              helperText={touched.name && errors.name}
              fullWidth
              required
            />
          </Box>

          {/* Email */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" mb="5px" display="block">
              Email Address
            </Typography>
            <CustomTextField
              id="email"
              name="email"
              type="email"
              variant="outlined"
              placeholder="e.g. user@institution.edu"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email && Boolean(errors.email)}
              helperText={touched.email && errors.email}
              required
              fullWidth
            />
          </Box>

          {/* Student ID / Roll Number (for students) */}
          {values.role === 'student' && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="studentId" mb="5px" display="block">
                Student ID / Roll Number (Optional)
              </Typography>
              <CustomTextField
                id="studentId"
                name="studentId"
                variant="outlined"
                placeholder="e.g. STU-2026-042"
                value={values.studentId || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
              />
            </Box>
          )}

          {/* Institution / College */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="institution" mb="5px" display="block">
              Institution / College Name (Optional)
            </Typography>
            <CustomTextField
              id="institution"
              name="institution"
              variant="outlined"
              placeholder="e.g. Engineering Institute"
              value={values.institution || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
            />
          </Box>

          {/* Password */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="password" mb="5px" display="block">
              Password
            </Typography>
            <CustomTextField
              id="password"
              name="password"
              type="password"
              variant="outlined"
              placeholder="Minimum 6 characters"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password && Boolean(errors.password)}
              helperText={touched.password && errors.password}
              required
              fullWidth
            />
          </Box>

          {/* Confirm Password */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="confirm_password" mb="5px" display="block">
              Confirm Password
            </Typography>
            <CustomTextField
              id="confirm_password"
              name="confirm_password"
              type="password"
              variant="outlined"
              placeholder="Repeat your password"
              value={values.confirm_password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirm_password && Boolean(errors.confirm_password)}
              helperText={touched.confirm_password && errors.confirm_password}
              fullWidth
              required
            />
          </Box>
        </Stack>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          onClick={formik.handleSubmit}
          sx={{ mt: 1, py: 1.2, fontWeight: 700, fontSize: '1rem' }}
        >
          {values.role === 'teacher' ? 'Create Teacher Account' : 'Create Student Account'}
        </Button>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthRegister;
