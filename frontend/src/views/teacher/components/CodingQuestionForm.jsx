import React, { useState } from 'react';
import {
  TextField,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Divider,
  Chip,
  Alert,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CodeIcon from '@mui/icons-material/Code';

const CodingQuestionForm = ({ formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  const hasCoding = Boolean(values.hasCodingRound);

  const sampleTestCases = values.codingQuestion?.sampleTestCases || [
    { input: '2 3', expectedOutput: '5', explanation: '2 + 3 = 5' },
  ];
  const hiddenTestCases = values.codingQuestion?.hiddenTestCases || [
    { input: '10 20', expectedOutput: '30' },
  ];

  const handleToggle = (e) => {
    setFieldValue('hasCodingRound', e.target.checked);
  };

  const handleAddSampleCase = () => {
    const updated = [...sampleTestCases, { input: '', expectedOutput: '', explanation: '' }];
    setFieldValue('codingQuestion.sampleTestCases', updated);
  };

  const handleRemoveSampleCase = (index) => {
    const updated = sampleTestCases.filter((_, idx) => idx !== index);
    setFieldValue('codingQuestion.sampleTestCases', updated);
  };

  const handleSampleCaseChange = (index, field, value) => {
    const updated = sampleTestCases.map((tc, idx) => {
      if (idx === index) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    setFieldValue('codingQuestion.sampleTestCases', updated);
  };

  const handleAddHiddenCase = () => {
    const updated = [...hiddenTestCases, { input: '', expectedOutput: '' }];
    setFieldValue('codingQuestion.hiddenTestCases', updated);
  };

  const handleRemoveHiddenCase = (index) => {
    const updated = hiddenTestCases.filter((_, idx) => idx !== index);
    setFieldValue('codingQuestion.hiddenTestCases', updated);
  };

  const handleHiddenCaseChange = (index, field, value) => {
    const updated = hiddenTestCases.map((tc, idx) => {
      if (idx === index) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    setFieldValue('codingQuestion.hiddenTestCases', updated);
  };

  return (
    <Card variant="outlined" sx={{ mt: 3, p: 1, borderRadius: 2, bgcolor: hasCoding ? '#fcfdff' : '#f9f9f9' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <CodeIcon color={hasCoding ? 'primary' : 'disabled'} />
            <Typography variant="h5" fontWeight="bold">
              LeetCode-Style Coding Round
            </Typography>
            <Chip
              label={hasCoding ? 'Enabled' : 'Optional / Disabled'}
              color={hasCoding ? 'primary' : 'default'}
              size="small"
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={hasCoding}
                onChange={handleToggle}
                color="primary"
              />
            }
            label={hasCoding ? 'Coding Round Enabled' : 'Enable Coding Round'}
          />
        </Box>

        {!hasCoding ? (
          <Alert severity="info" variant="outlined">
            The coding round is currently <b>skipped</b> for this exam. Students will only take MCQ questions, and results/scores will calculate without coding. Toggle the switch above if you want to add a programming problem.
          </Alert>
        ) : (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Configure problem statements, constraints, marks, allowed languages, sample test cases (visible to student), and hidden test cases (for grading).
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  id="codingQuestion.title"
                  name="codingQuestion.title"
                  label="Problem Title"
                  placeholder="e.g. Two Sum / Reverse String / Valid Parentheses"
                  value={values.codingQuestion?.title || values.codingQuestion?.question || ''}
                  onChange={(e) => {
                    setFieldValue('codingQuestion.title', e.target.value);
                    setFieldValue('codingQuestion.question', e.target.value);
                  }}
                  required={hasCoding}
                />
              </Grid>

              <Grid item xs={12} sm={2}>
                <FormControl fullWidth>
                  <InputLabel id="difficulty-label">Difficulty</InputLabel>
                  <Select
                    labelId="difficulty-label"
                    label="Difficulty"
                    value={values.codingQuestion?.difficulty || 'Medium'}
                    onChange={(e) => setFieldValue('codingQuestion.difficulty', e.target.value)}
                  >
                    <MenuItem value="Easy">Easy</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Coding Marks"
                  value={values.codingQuestion?.marks ?? 20}
                  onChange={(e) => setFieldValue('codingQuestion.marks', Math.max(1, Number(e.target.value)))}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="codingQuestion.description"
                  name="codingQuestion.description"
                  label="Problem Description"
                  placeholder="Detailed description of the problem, input format, and output format..."
                  multiline
                  rows={4}
                  value={values.codingQuestion?.description || ''}
                  onChange={(e) => setFieldValue('codingQuestion.description', e.target.value)}
                  required={hasCoding}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="codingQuestion.constraints"
                  name="codingQuestion.constraints"
                  label="Constraints"
                  placeholder="e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9"
                  value={values.codingQuestion?.constraints || ''}
                  onChange={(e) => setFieldValue('codingQuestion.constraints', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="codingQuestion.allowedLanguages"
                  name="codingQuestion.allowedLanguages"
                  label="Allowed Languages (comma-separated)"
                  value={values.codingQuestion?.allowedLanguages || 'javascript,python,java,c,cpp'}
                  onChange={(e) => setFieldValue('codingQuestion.allowedLanguages', e.target.value)}
                  helperText="Supported: javascript, python, java, c, cpp"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Sample Test Cases (Visible) */}
            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="h6" fontWeight="600">
                  Visible Sample Test Cases ({sampleTestCases.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddSampleCase}
                >
                  Add Sample Case
                </Button>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                These test cases will be visible to students and evaluated when they click "Run Code".
              </Typography>

              {sampleTestCases.map((tc, idx) => (
                <Card key={idx} variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: '#ffffff' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="600">
                      Sample Case #{idx + 1}
                    </Typography>
                    {sampleTestCases.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => handleRemoveSampleCase(idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        label="Standard Input (stdin)"
                        placeholder="e.g. 2 3"
                        value={tc.input || ''}
                        onChange={(e) => handleSampleCaseChange(idx, 'input', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        label="Expected Output"
                        placeholder="e.g. 5"
                        value={tc.expectedOutput || ''}
                        onChange={(e) => handleSampleCaseChange(idx, 'expectedOutput', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Explanation (optional)"
                        placeholder="e.g. 2+3=5"
                        value={tc.explanation || ''}
                        onChange={(e) => handleSampleCaseChange(idx, 'explanation', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Hidden Test Cases (Grading) */}
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="h6" fontWeight="600">
                  Hidden Test Cases for Grading ({hiddenTestCases.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddHiddenCase}
                >
                  Add Hidden Case
                </Button>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                Hidden cases are tested when the student clicks "Submit Solution" to prevent hardcoding. Partial marks are awarded based on total passed cases.
              </Typography>

              {hiddenTestCases.map((tc, idx) => (
                <Card key={idx} variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: '#ffffff' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="600">
                      Hidden Case #{idx + 1}
                    </Typography>
                    {hiddenTestCases.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => handleRemoveHiddenCase(idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        label="Standard Input (stdin)"
                        placeholder="e.g. 10 20"
                        value={tc.input || ''}
                        onChange={(e) => handleHiddenCaseChange(idx, 'input', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        label="Expected Output"
                        placeholder="e.g. 30"
                        value={tc.expectedOutput || ''}
                        onChange={(e) => handleHiddenCaseChange(idx, 'expectedOutput', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CodingQuestionForm;
