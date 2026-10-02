import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Central browser API client.
 *
 * Browser requests use the same-origin /api path. Next.js rewrites /api/* to
 * the NestJS backend, which keeps auth and routing consistent in development
 * and on Railway.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for cross-origin requests (cookies, auth headers)
  withCredentials: true,
});

/* ── Request interceptor: attach JWT ─────────────────────────── */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // localStorage is only available on the client
    if (typeof window !== 'undefined') {
      // Check both token keys for compatibility
      const token = localStorage.getItem('sl_token') || localStorage.getItem('access_token');
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/* ── Response interceptor: handle 401 ───────────────────────── */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear stale credentials
      localStorage.removeItem('sl_token');
      localStorage.removeItem('access_token');
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
// Debug: 1785054433
