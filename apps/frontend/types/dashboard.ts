/**
 * Types for Dashboard API responses — matches the NestJS DashboardService shape.
 */

export interface SecurityScore {
  name: string;
  score: number;
  label: string;       // e.g. 'Great', 'Poor', 'Excellent'
  color: string;       // 'green' | 'red' | 'yellow'
  change: string;      // e.g. '+12 pts vs last 7 days'
}

export interface RiskOverview {
  total: number;
  critical: { count: number; pct: number };
  high:     { count: number; pct: number };
  medium:   { count: number; pct: number };
  low:      { count: number; pct: number };
}

export interface FindingTimelineEntry {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VulnerabilityType {
  name: string;
  count: number;
}

export interface RecentScan {
  id: string;
  target: string;
  targetUrl?: string | null;
  repoUrl?: string | null;
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  status: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'PENDING' | 'QUEUED';
  score: number | null;
  findingsCount: number;
  time: string;        // human-readable e.g. 'Just now', '2h ago'
}

export interface ScanActivity {
  message: string;
  detail: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
  scanType?: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  targetUrl?: string | null;
  repoUrl?: string | null;
}

export interface DashboardOverview {
  securityScores: SecurityScore[];
  riskOverview: RiskOverview;
  findingsOverTime: FindingTimelineEntry[];
  topVulnerabilityTypes: VulnerabilityType[];
  recentScans: RecentScan[];
  scanActivity: ScanActivity[];
}
