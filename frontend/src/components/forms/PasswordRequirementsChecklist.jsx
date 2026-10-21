import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';

export const checkPasswordCriteria = (password = '') => {
  const pwd = password || '';
  return {
    hasMinLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  };
};

export const isPasswordStrong = (password = '') => {
  const c = checkPasswordCriteria(password);
  return c.hasMinLength && c.hasUpper && c.hasLower && c.hasNumber && c.hasSpecial;
};

const ChecklistItem = ({ passed, text }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    {passed ? (
      <IconCheck size={16} color="#13DEB9" style={{ strokeWidth: 3 }} />
    ) : (
      <IconX size={16} color="#FA896B" style={{ strokeWidth: 2.5 }} />
    )}
    <Typography
      variant="caption"
      sx={{
        color: passed ? 'success.main' : 'text.secondary',
        fontWeight: passed ? 600 : 500,
        transition: 'color 0.2s',
      }}
    >
      {text}
    </Typography>
  </Stack>
);

const PasswordRequirementsChecklist = ({ password = '', showAlways = false }) => {
  const criteria = checkPasswordCriteria(password);

  if (!showAlways && (!password || password.length === 0)) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 1.5,
        mt: 1,
        borderRadius: 2,
        backgroundColor: 'rgba(93, 135, 255, 0.04)',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" fontWeight={700} color="textPrimary" display="block" mb={0.75}>
        Password Requirements:
      </Typography>
      <Stack spacing={0.5}>
        <ChecklistItem passed={criteria.hasMinLength} text="At least 8 characters" />
        <ChecklistItem passed={criteria.hasUpper} text="At least 1 uppercase letter (A-Z)" />
        <ChecklistItem passed={criteria.hasLower} text="At least 1 lowercase letter (a-z)" />
        <ChecklistItem passed={criteria.hasNumber} text="At least 1 number (0-9)" />
        <ChecklistItem passed={criteria.hasSpecial} text="At least 1 special character (@, #, $, %, !, etc.)" />
      </Stack>
    </Box>
  );
};

export default PasswordRequirementsChecklist;
