import type { DashboardOverview } from '@/types/dashboard';
import api from '@/lib/api';

/**
 * Returns Authorization header with the stored JWT token, if available.
 * Called at request time so it always reflects the current token in localStorage.
 */
function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Dashboard service – thin wrapper around backend API endpoints.
 * Each method returns a typed promise. No business logic is embedded
 * here; the service only forwards the request and returns the data.
 */
export const dashboardService = {
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await api.get<DashboardOverview>('/dashboard/overview', {
      headers: authHeaders(),
    });
    return response.data;
  },
  // Additional methods can be added later following the same pattern.
};
