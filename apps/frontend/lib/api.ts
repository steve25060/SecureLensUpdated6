import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * API Client Configuration
 *
 * DEVELOPMENT: Uses NEXT_PUBLIC_BACKEND_URL or defaults to /api (proxied via Next.js)
 * PRODUCTION: Uses NEXT_PUBLIC_BACKEND_URL (direct calls to Render backend)
 *
 * Environment Variables:
 * - NEXT_PUBLIC_API_URL: Full URL to API endpoints (e.g., http://localhost:4000/api)
 * - NEXT_PUBLIC_BACKEND_URL: Backend base URL (e.g., http://localhost:4000)
 */

// Always use Next.js rewrite proxy for API calls
// This ensures all requests go through the configured rewrites in next.config.js
const BASE_URL = '/api';

console.log('[API Client] Configured with BASE_URL:', BASE_URL);
console.log('[API Client] NODE_ENV:', process.env.NODE_ENV);
console.log('[API Client] Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for cross-origin requests (cookies, auth headers)
  withCredentials: process.env.NODE_ENV === 'production',
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
