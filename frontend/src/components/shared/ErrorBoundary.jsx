import React from 'react';
import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="70vh"
          p={3}
        >
          <Card elevation={6} sx={{ maxWidth: 600, width: '100%', borderRadius: 3, p: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom color="textPrimary">
                Something went wrong
              </Typography>
              <Typography variant="body1" color="textSecondary" mb={3}>
                An unexpected error occurred while rendering this component. The rest of the application remains safe.
              </Typography>
              {this.state.error?.message && (
                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'error.main',
                    overflowX: 'auto',
                    border: '1px solid #ffcdd2',
                  }}
                >
                  {this.state.error.message}
                </Box>
              )}
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  Return Home
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
