import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');
  if (!token) {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        const parsed = JSON.parse(userInfoStr);
        token = parsed?.token;
      }
    } catch (e) {
      // ignore
    }
  }
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
