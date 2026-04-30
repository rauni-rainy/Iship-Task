import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const axiosClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const csrfToken = Cookies.get('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only attempt refresh once for a 401 response and if we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid intercepting the refresh call itself to prevent loops
      if (originalRequest.url === '/api/auth/refresh' || originalRequest.url === '/api/auth/login') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await axiosClient.post('/api/auth/refresh');
        // Refresh succeeded, retry original request
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        if (typeof window !== 'undefined') {
          const publicPaths = ['/login', '/register', '/'];
          if (!publicPaths.includes(window.location.pathname)) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
