'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StoredFinding {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  source: string;
  target: string;
  status: 'NEW' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
  category?: string;
  cvss?: number;
  cwe?: string;
  owasp?: string;
  remediation?: string;
  evidence?: string;
  url?: string;
  parameter?: string;
  aiExplanation?: string;
  description?: string;
  createdAt: string;
  scanId?: string;
}

export interface StoredScan {
  id: string;
  target: string;
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'CANCELLED';
  score: number;
  findingsCount: number;
  time: string;
  createdAt: string;
  engines: string[];
  findings: StoredFinding[];
}

export interface ActiveScanSession {
  scanId: string;
  target: string;
  mode: string;
  profile: string;
  workspaceId: string;
  engines: string[];
  status: 'idle' | 'queued' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: string;
  findingsCount?: number;
  score?: number;
}

const STORAGE_KEY_SCANS = 'securelens_live_scans';
const STORAGE_KEY_FINDINGS = 'securelens_live_findings';
export const STORAGE_KEY_ACTIVE_SCAN = 'securelens_active_scan_session';
const EVENT_NAME = 'securelens:scan-completed';
export const EVENT_ACTIVE_SCAN_UPDATED = 'securelens:active-scan-updated';

export function getActiveScanSession(): ActiveScanSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SCAN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveScanSession(session: ActiveScanSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SCAN);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCAN, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent(EVENT_ACTIVE_SCAN_UPDATED, { detail: session }));
  } catch (e) {
    console.warn('Failed to set active scan session:', e);
  }
}

export function getStoredLiveScans(): StoredScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCANS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredLiveFindings(): StoredFinding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FINDINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLiveScanRun(params: {
  id: string;
  target: string;
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED' | string;
  engines: string[];
  findings: Array<{
    id?: string;
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string;
    source?: string;
    target?: string;
    category?: string;
    cvss?: number;
    description?: string;
  }>;
  score?: number;
}): StoredScan {
  const now = new Date();
  const scanId = params.id || `scan-live-${now.getTime()}`;
  const targetName = params.target || 'Live Target';
  const scanType = (params.type?.toUpperCase() || 'WEBSITE') as 'WEBSITE' | 'GITHUB' | 'COMBINED';

  // Map findings
  const mappedFindings: StoredFinding[] = params.findings.map((f, idx) => {
    const sev = (f.severity?.toUpperCase() || 'MEDIUM') as StoredFinding['severity'];
    const cvssDefault = sev === 'CRITICAL' ? 9.2 : sev === 'HIGH' ? 7.5 : sev === 'MEDIUM' ? 5.3 : sev === 'LOW' ? 3.2 : 1.5;
    return {
      id: f.id || `f-live-${scanId}-${idx + 1}`,
      title: f.title,
      severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(sev) ? (sev as any) : 'MEDIUM',
      source: f.source || 'SecureLens Engine',
      target: f.target || targetName,
      status: 'NEW',
      category: f.category || 'Vulnerability',
      cvss: f.cvss ?? cvssDefault,
      description: f.description || `Detected during live scan of ${targetName}.`,
      createdAt: now.toISOString().split('T')[0],
      scanId,
    };
  });

  // Calculate score if not provided (100 - weighted severity deduction)
  let calculatedScore = params.score;
  if (calculatedScore === undefined || calculatedScore === null || calculatedScore === 0) {
    let deduction = 0;
    mappedFindings.forEach(f => {
      if (f.severity === 'CRITICAL') deduction += 20;
      else if (f.severity === 'HIGH') deduction += 12;
      else if (f.severity === 'MEDIUM') deduction += 6;
      else if (f.severity === 'LOW') deduction += 2;
    });
    calculatedScore = mappedFindings.length === 0 ? 98 : Math.max(15, 100 - deduction);
  }

  const newScan: StoredScan = {
    id: scanId,
    target: targetName,
    type: scanType,
    status: 'COMPLETED',
    score: calculatedScore,
    findingsCount: mappedFindings.length,
    time: 'Just now',
    createdAt: now.toISOString(),
    engines: params.engines || [],
    findings: mappedFindings,
  };

  if (typeof window !== 'undefined') {
    try {
      const existingScans = getStoredLiveScans();
      const updatedScans = [newScan, ...existingScans.filter(s => s.id !== scanId)].slice(0, 50);
      localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(updatedScans));

      const existingFindings = getStoredLiveFindings();
      const updatedFindings = [...mappedFindings, ...existingFindings.filter(f => f.scanId !== scanId)].slice(0, 200);
      localStorage.setItem(STORAGE_KEY_FINDINGS, JSON.stringify(updatedFindings));

      // Broadcast event
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newScan }));
    } catch (e) {
      console.warn('Failed to save live scan run:', e);
    }
  }

  return newScan;
}

export function useLiveScanSync(pollIntervalMs: number = 2000) {
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [backendScans, setBackendScans] = useState<StoredScan[]>([]);
  const [backendFindings, setBackendFindings] = useState<StoredFinding[]>([]);

  const handleUpdate = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  // Poll backend for real database updates in real time
  useEffect(() => {
    let isMounted = true;

    const fetchBackendData = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [scansRes, findingsRes] = await Promise.all([
          fetch('/api/scans', { headers }).catch(() => null),
          fetch('/api/findings?limit=150', { headers }).catch(() => null),
        ]);

        if (isMounted && scansRes && scansRes.ok) {
          const scansJson = await scansRes.json();
          if (Array.isArray(scansJson)) {
            const mapped: StoredScan[] = scansJson.map(s => {
              let score = s.riskScore;
              if (score === null || score === undefined || score === 0) {
                score = Math.max(15, 100 - ((s.findingsCount || 0) * 6));
              }
              return {
                id: s.id,
                target: s.target,
                type: s.type || 'WEBSITE',
                status: s.status || 'COMPLETED',
                score,
                findingsCount: s.findingsCount || 0,
                time: s.createdAt,
                createdAt: s.createdAt,
                engines: s.engines || [],
                findings: [],
              };
            });
            setBackendScans(mapped);
          }
        }

        if (isMounted && findingsRes && findingsRes.ok) {
          const fJson = await findingsRes.json();
          const items = Array.isArray(fJson) ? fJson : (fJson?.findings || fJson?.items || []);
          if (Array.isArray(items)) {
            const mappedF: StoredFinding[] = items.map(f => ({
              id: f.id,
              title: f.title,
              severity: f.severity || 'MEDIUM',
              source: f.source || 'SecureLens Engine',
              target: f.target,
              status: f.status || 'NEW',
              category: f.category || 'Vulnerability',
              cvss: f.cvss,
              cwe: f.cwe,
              owasp: f.owasp,
              remediation: f.remediation,
              evidence: f.evidence,
              description: f.description,
              createdAt: f.createdAt,
              scanId: f.scanId,
            }));
            setBackendFindings(mappedF);
          }
        }
      } catch {
        // quiet fallback to local store
      }
    };

    fetchBackendData();
    const interval = setInterval(() => {
      fetchBackendData();
      handleUpdate();
    }, pollIntervalMs);

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [handleUpdate, pollIntervalMs]);

  const localScans = getStoredLiveScans();
  const localFindings = getStoredLiveFindings();

  // Merge unique by ID
  const allScansMap = new Map<string, StoredScan>();
  backendScans.forEach(s => allScansMap.set(s.id, s));
  localScans.forEach(s => {
    if (!allScansMap.has(s.id)) allScansMap.set(s.id, s);
  });

  const allFindingsMap = new Map<string, StoredFinding>();
  backendFindings.forEach(f => allFindingsMap.set(f.id, f));
  localFindings.forEach(f => {
    if (!allFindingsMap.has(f.id)) allFindingsMap.set(f.id, f);
  });

  const combinedScans = Array.from(allScansMap.values());
  const combinedFindings = Array.from(allFindingsMap.values());

  return {
    lastUpdated,
    scans: combinedScans,
    findings: combinedFindings,
    liveScans: combinedScans,
    liveFindings: combinedFindings,
  };
}
