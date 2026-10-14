import axios from 'axios';

// When deployed separately, set VITE_API_URL (e.g. https://api.yourdomain.com)
// When deployed as single service or in local dev, defaults to '/api'
const rawApiUrl = import.meta.env.VITE_API_URL || '';
const baseURL = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('money_tracker_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('money_tracker_token');
      localStorage.removeItem('money_tracker_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
