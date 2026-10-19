import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      let token = localStorage.getItem('token');
      if (!token) {
        try {
          const userInfoStr = localStorage.getItem('userInfo');
          if (userInfoStr) {
            const parsed = JSON.parse(userInfoStr);
            token = parsed?.token;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      if (token && token !== 'null' && token !== 'undefined') {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ['User', 'PendingUsers', 'Exam'],
  // it like a prent to other api
  // it a build in builder
  endpoints: (builder) => ({}),
});
