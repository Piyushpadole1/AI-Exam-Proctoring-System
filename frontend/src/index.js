import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset stale browser data for clean database build
const FRESH_BUILD_ID = 'fresh_build_20261021_clean';
try {
  if (localStorage.getItem('app_build_version') !== FRESH_BUILD_ID) {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('app_build_version', FRESH_BUILD_ID);
  }
} catch (e) {
  // ignore storage errors
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Suspense>
    <>
      <App />
    </>
  </Suspense>,
);
