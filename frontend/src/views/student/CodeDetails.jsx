import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../axios';

const CodeDetailsMore = () => {
  const navigate = useNavigate();
  const { examId } = useParams();

  const [certify, setCertify] = useState(false);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axiosInstance.get('/api/users/exam', { withCredentials: true });
        const found = res.data?.find((e) => e.examId === examId || e._id === examId || e.id === examId);
        if (found && !found.hasCodingRound) {
          toast.info('This exam does not include a coding round.');
          navigate('/result');
          return;
        }
        setExam(found || null);
      } catch (err) {
        console.error('Failed to fetch exam:', err);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchExam();
  }, [examId, navigate]);

  const handleCodeTest = () => {
    if (!exam) {
      toast.error('Exam not found.');
      return;
    }
    navigate(`/exam/${examId}/code`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!exam) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">Exam not found. Please return to your dashboard.</Alert>
        </CardContent>
      </Card>
    );
  }

  const instructionLines = Array.isArray(exam.codingInstructions)
    ? exam.codingInstructions.filter((line) => line && line.trim().length > 0)
    : typeof exam.codingInstructions === 'string'
      ? exam.codingInstructions
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [];

  return (
    <Card>
      <CardContent>
        <Typography variant="h3" mb={2}>
          {exam.examName ? `${exam.examName} — Coding Section` : 'Coding Section'}
        </Typography>

        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          Subject: {exam.subject || '—'}
          {exam.codingDuration ? ` | Duration: ${exam.codingDuration} minutes` : ''}
          {exam.codingMarks ? ` | Marks: ${exam.codingMarks}` : ''}
        </Typography>

        <Typography variant="h5" mb={2}>
          Description
        </Typography>
        <Typography mb={4} sx={{ whiteSpace: 'pre-wrap' }}>
          {exam.codingDescription && exam.codingDescription.trim().length > 0
            ? exam.codingDescription
            : 'No description provided by the teacher.'}
        </Typography>

        <Typography variant="h5" mb={2}>
          Test Instructions
        </Typography>

        {instructionLines.length > 0 ? (
          <List>
            <ol>
              {instructionLines.map((line, idx) => (
                <li key={idx}>
                  <ListItemText>
                    <Typography variant="body1">{line}</Typography>
                  </ListItemText>
                </li>
              ))}
            </ol>
          </List>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your teacher has not added specific instructions for the coding section yet.
          </Alert>
        )}

        <Typography variant="h5" mb={2} mt={3}>
          Confirmation
        </Typography>
        <Typography mb={3}>
          Your actions will be proctored. Any signs of misconduct may lead to suspension or
          cancellation of your exam.
        </Typography>

        <Stack direction="column" alignItems="center" spacing={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={certify}
                onChange={() => setCertify(!certify)}
                color="primary"
              />
            }
            label="I certify that I have read and agree to the exam instructions above."
          />
          <div style={{ display: 'flex', padding: '2px', margin: '10px' }}>
            <Button
              variant="contained"
              color="primary"
              disabled={!certify}
              onClick={handleCodeTest}
            >
              Coding Test
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
};

const imgUrl =
  'https://cdn-api.elice.io/api-attachment/attachment/61bd920a02e1497b8f9fab92d566e103/image.jpeg';

export function CodeDetails() {
  return (
    <Grid container sx={{ height: '100vh' }}>
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage: `url(${imgUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <CodeDetailsMore />
      </Grid>
    </Grid>
  );
}

export default CodeDetails;