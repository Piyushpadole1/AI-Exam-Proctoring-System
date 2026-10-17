// Theme Provider
import { CssBaseline, ThemeProvider } from '@mui/material';
import { baselightTheme } from './theme/DefaultColors';
// Router Provider
import { RouterProvider } from 'react-router-dom';
import Router from './routes/Router';

// Redux Provider
import { Provider } from 'react-redux';
import store from './store';
// Tostify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Cheating Log Provider
import { CheatingLogProvider } from './context/CheatingLogContext';
import ErrorBoundary from './components/shared/ErrorBoundary';

function App() {
  const theme = baselightTheme;
  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <CheatingLogProvider>
          <ErrorBoundary>
            <ToastContainer />
            <CssBaseline />
            <RouterProvider router={Router} />
          </ErrorBoundary>
        </CheatingLogProvider>
      </Provider>
    </ThemeProvider>
  );
}

export default App;
