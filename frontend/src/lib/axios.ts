import axios from 'axios';
import Cookies from 'js-cookie';

const isBrowser = typeof window !== 'undefined';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const axiosClient = axios.create({
  baseURL: isBrowser ? '' : API_URL,
  withCredentials: true,
});

let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

const fetchCsrfToken = async () => {
  if (csrfTokenPromise) return csrfTokenPromise;
  
  csrfTokenPromise = axios.get('/api/auth/csrf-token', { 
    baseURL: isBrowser ? '' : API_URL, 
    withCredentials: true 
  })
    .then(res => {
      cachedCsrfToken = res.data.csrfToken;
      return cachedCsrfToken;
    })
    .catch(() => null);
    
  return csrfTokenPromise;
};

axiosClient.interceptors.request.use(async (config) => {
  // Only add CSRF token to state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    // Try to get from cookie (works locally) or from cache
    let token = Cookies.get('csrf_token') || cachedCsrfToken;
    
    // If neither exists, fetch it from the backend API
    if (!token) {
      token = await fetchCsrfToken();
    }
    
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
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
