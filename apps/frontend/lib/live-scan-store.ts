'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventBus, EventType } from './event-bus';

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
  userKey?: string;
  workspaceId?: string;
  targetType?: 'WEBSITE' | 'GITHUB' | 'COMBINED';
}

export interface StoredScan {
  id: string;
  target: string;
  targetUrl?: string | null;
  repoUrl?: string | null;
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'CANCELLED';
  score: number;
  findingsCount: number;
  time: string;
  createdAt: string;
  engines: string[];
  findings: StoredFinding[];
  userKey?: string;
  workspaceId?: string;
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
  userKey?: string;
}

const STORAGE_KEY_SCANS_GLOBAL = 'securelens_live_scans';
const STORAGE_KEY_FINDINGS_GLOBAL = 'securelens_live_findings';
export const STORAGE_KEY_ACTIVE_SCAN = 'securelens_active_scan_session';
const EVENT_NAME = 'securelens:scan-completed';
export const EVENT_ACTIVE_SCAN_UPDATED = 'securelens:active-scan-updated';

/**
 * Calculates a standard non-linear DevSecOps Security Posture Score (0 - 100).
 * Uses sub-linear diminishing severity deduction with density scaling.
 */
export function calculateSecurityScore(findings: Array<{ severity?: string }>): number {
  if (!findings || findings.length === 0) return 100;

  let critCount = 0;
  let highCount = 0;
  let medCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  findings.forEach(f => {
    const sev = (f.severity || '').toUpperCase();
    if (sev === 'CRITICAL') critCount++;
    else if (sev === 'HIGH') highCount++;
    else if (sev === 'MEDIUM') medCount++;
    else if (sev === 'LOW') lowCount++;
    else infoCount++;
  });

  let critDeduction = 0;
  for (let i = 0; i < critCount; i++) critDeduction += 14 * Math.pow(0.85, i);

  let highDeduction = 0;
  for (let i = 0; i < highCount; i++) highDeduction += 7.5 * Math.pow(0.88, i);

  let medDeduction = 0;
  for (let i = 0; i < medCount; i++) medDeduction += 3.2 * Math.pow(0.90, i);

  let lowDeduction = 0;
  for (let i = 0; i < lowCount; i++) lowDeduction += 1.0 * Math.pow(0.92, i);

  const infoDeduction = Math.min(3, infoCount * 0.2);
  const totalDeduction = critDeduction + highDeduction + medDeduction + lowDeduction + infoDeduction;
  const dampedDeduction = Math.min(88, totalDeduction * (100 / (100 + totalDeduction * 0.15)));

  const finalScore = Math.round(100 - dampedDeduction);
  return Math.max(12, Math.min(99, finalScore));
}

/**
 * Gets the current active user key to ensure user-scoped data isolation & persistence
 */
export function getCurrentUserKey(): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const email = localStorage.getItem('user_email');
    if (email) return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.email) return u.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (u.userId) return String(u.userId).replace(/[^a-z0-9]/g, '_');
      if (u.id) return String(u.id).replace(/[^a-z0-9]/g, '_');
    }
  } catch {
    // fallback
  }
  return 'default';
}

function getUserScansKey(userKey?: string): string {
  const k = userKey || getCurrentUserKey();
  return `securelens_scans_${k}`;
}

function getUserFindingsKey(userKey?: string): string {
  const k = userKey || getCurrentUserKey();
  return `securelens_findings_${k}`;
}

function getUserActiveScanKey(userKey?: string): string {
  const k = userKey || getCurrentUserKey();
  return `securelens_active_scan_${k}`;
}

/**
 * Hydrate and switch active localStorage data when a user logs in or switches accounts
 */
export function hydrateUserScanStorage(userIdentifier?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const userKey = userIdentifier
      ? userIdentifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      : getCurrentUserKey();

    const userScansRaw = localStorage.getItem(getUserScansKey(userKey));
    const userFindingsRaw = localStorage.getItem(getUserFindingsKey(userKey));
    const userActiveScanRaw = localStorage.getItem(getUserActiveScanKey(userKey));

    let scansCount = 0;
    let findingsCount = 0;

    if (userScansRaw) {
      localStorage.setItem(STORAGE_KEY_SCANS_GLOBAL, userScansRaw);
      try {
        const parsed = JSON.parse(userScansRaw);
        scansCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY_SCANS_GLOBAL);
    }

    if (userFindingsRaw) {
      localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, userFindingsRaw);
      try {
        const parsed = JSON.parse(userFindingsRaw);
        findingsCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY_FINDINGS_GLOBAL);
    }

    if (userActiveScanRaw) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCAN, userActiveScanRaw);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SCAN);
    }

    // Workspaces scoped hydration
    const userWorkspacesRaw = localStorage.getItem(`securelens_workspaces_${userKey}`);
    if (userWorkspacesRaw) {
      localStorage.setItem('securelens_workspaces_global', userWorkspacesRaw);
    } else {
      localStorage.removeItem('securelens_workspaces_global');
    }

    // Reports scoped hydration
    const userReportsRaw = localStorage.getItem(`securelens_reports_${userKey}`);
    if (userReportsRaw) {
      localStorage.setItem('securelens_reports_global', userReportsRaw);
    } else {
      localStorage.removeItem('securelens_reports_global');
    }

    // Broadcast user hydration event
    EventBus.publish('USER_STORAGE_HYDRATED', {
      userKey,
      scansCount,
      findingsCount,
      hasActiveScan: !!userActiveScanRaw,
      timestamp: new Date().toISOString(),
    }, 'live-scan-store');

    // Broadcast update across the app
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    window.dispatchEvent(new CustomEvent(EVENT_ACTIVE_SCAN_UPDATED));
    window.dispatchEvent(new CustomEvent('userProfileUpdated'));
  } catch (e) {
    console.warn('Failed to hydrate user scan storage:', e);
  }
}

export function getActiveScanSession(): ActiveScanSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const userKey = getCurrentUserKey();
    const userRaw = localStorage.getItem(getUserActiveScanKey(userKey));
    if (userRaw) return JSON.parse(userRaw);

    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SCAN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveScanSession(session: ActiveScanSession | null) {
  if (typeof window === 'undefined') return;
  try {
    const userKey = getCurrentUserKey();
    const sessionWithUser = session ? { ...session, userKey } : null;

    if (!sessionWithUser) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SCAN);
      localStorage.removeItem(getUserActiveScanKey(userKey));
      // Broadcast ACTIVE_SCAN_CLEARED event
      EventBus.publish('ACTIVE_SCAN_CLEARED', { timestamp: new Date().toISOString() }, 'live-scan-store');
    } else {
      const serialized = JSON.stringify(sessionWithUser);
      localStorage.setItem(STORAGE_KEY_ACTIVE_SCAN, serialized);
      localStorage.setItem(getUserActiveScanKey(userKey), serialized);
      // Broadcast ACTIVE_SCAN_UPDATED event
      EventBus.publish('ACTIVE_SCAN_UPDATED', sessionWithUser, 'live-scan-store');
    }
    window.dispatchEvent(new CustomEvent(EVENT_ACTIVE_SCAN_UPDATED, { detail: sessionWithUser }));
  } catch (e) {
    console.warn('Failed to set active scan session:', e);
  }
}

export function getStoredLiveScans(): StoredScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const userKey = getCurrentUserKey();
    const userRaw = localStorage.getItem(getUserScansKey(userKey));
    let list: StoredScan[] = [];
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (Array.isArray(parsed)) list = parsed;
    } else if (userKey === 'default') {
      const raw = localStorage.getItem(STORAGE_KEY_SCANS_GLOBAL);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
    }

    return list.map(s => {
      let score = s.score;
      if (s.findings && s.findings.length > 0) {
        if (score === undefined || score === null || score === 0 || score === 15) {
          score = calculateSecurityScore(s.findings);
        }
      } else if (score === undefined || score === null || score === 0 || score === 15) {
        const count = s.findingsCount || 0;
        const deduction = Math.min(85, count * 4.2 * (100 / (100 + count * 2.8)));
        score = Math.max(15, Math.min(99, Math.round(100 - deduction)));
      }
      return { ...s, score };
    });
  } catch {
    return [];
  }
}

export function getStoredLiveFindings(): StoredFinding[] {
  if (typeof window === 'undefined') return [];
  try {
    const userKey = getCurrentUserKey();
    const userRaw = localStorage.getItem(getUserFindingsKey(userKey));
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (Array.isArray(parsed)) return parsed;
    }

    if (userKey === 'default') {
      const raw = localStorage.getItem(STORAGE_KEY_FINDINGS_GLOBAL);
      return raw ? JSON.parse(raw) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLiveScanRun(params: {
  id: string;
  target: string;
  targetUrl?: string | null;
  repoUrl?: string | null;
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
    cwe?: string;
    owasp?: string;
    remediation?: string;
    evidence?: string;
  }>;
  score?: number;
  workspaceId?: string;
}): StoredScan {
  const now = new Date();
  const scanId = params.id || `scan-live-${now.getTime()}`;
  let targetName = params.target || 'Live Target';
  const scanType = (params.type?.toUpperCase() || 'WEBSITE') as 'WEBSITE' | 'GITHUB' | 'COMBINED';
  const userKey = getCurrentUserKey();

  let targetUrl = params.targetUrl;
  let repoUrl = params.repoUrl;

  // For combined scans, extract both website and repo if present in target string
  if (scanType === 'COMBINED') {
    if (targetName.includes(' + ')) {
      const parts = targetName.split(' + ');
      targetUrl = targetUrl || parts[0].trim();
      repoUrl = repoUrl || parts[1].trim();
    } else if (targetName.includes(' & ')) {
      const parts = targetName.split(' & ');
      targetUrl = targetUrl || parts[0].trim();
      repoUrl = repoUrl || parts[1].trim();
    } else {
      targetUrl = targetUrl || targetName;
      repoUrl = repoUrl || 'https://github.com/uptoskills/core';
      targetName = `${targetUrl} + ${repoUrl}`;
    }
  }

  // Broadcast SCAN_STARTED event
  EventBus.publish('SCAN_STARTED', {
    id: scanId,
    target: targetName,
    targetUrl,
    repoUrl,
    type: scanType,
    engines: params.engines || [],
    timestamp: now.toISOString(),
  }, 'live-scan-store');

  // Map findings
  const mappedFindings: StoredFinding[] = params.findings.map((f, idx) => {
    const sev = (f.severity?.toUpperCase() || 'MEDIUM') as StoredFinding['severity'];
    const cvssDefault = sev === 'CRITICAL' ? 9.2 : sev === 'HIGH' ? 7.5 : sev === 'MEDIUM' ? 5.3 : sev === 'LOW' ? 3.2 : 1.5;
    const finding: StoredFinding = {
      id: f.id || `f-live-${scanId}-${idx + 1}`,
      title: f.title,
      severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(sev) ? (sev as any) : 'MEDIUM',
      source: f.source || 'SecureLens Engine',
      target: f.target || targetName,
      status: 'NEW',
      category: f.category || 'Vulnerability',
      cvss: f.cvss ?? cvssDefault,
      cwe: f.cwe,
      owasp: f.owasp,
      remediation: f.remediation,
      evidence: f.evidence,
      description: f.description || `Detected during live scan of ${targetName}.`,
      createdAt: now.toISOString().split('T')[0],
      scanId,
      userKey,
      workspaceId: params.workspaceId || (f as any).workspaceId,
      targetType: (f as any).targetType || scanType,
    };

    // Broadcast FINDING_ADDED event for each finding
    EventBus.publish('FINDING_ADDED', finding, 'live-scan-store');

    return finding;
  });

  // Calculate score dynamically based on findings
  let calculatedScore = params.score;
  const hasCriticalOrHigh = mappedFindings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'MEDIUM');
  
  if (
    calculatedScore === undefined || 
    calculatedScore === null || 
    calculatedScore === 0 || 
    (hasCriticalOrHigh && calculatedScore >= 98)
  ) {
    calculatedScore = calculateSecurityScore(mappedFindings);
  }

  const newScan: StoredScan = {
    id: scanId,
    target: targetName,
    targetUrl,
    repoUrl,
    type: scanType,
    status: 'COMPLETED',
    score: calculatedScore,
    findingsCount: mappedFindings.length,
    time: 'Just now',
    createdAt: now.toISOString(),
    engines: params.engines || [],
    findings: mappedFindings,
    userKey,
    workspaceId: params.workspaceId,
  };

  if (typeof window !== 'undefined') {
    try {
      // 1. Update Global Active Key
      const existingScans = getStoredLiveScans();
      const updatedScans = [newScan, ...existingScans.filter(s => s.id !== scanId)].slice(0, 50);
      localStorage.setItem(STORAGE_KEY_SCANS_GLOBAL, JSON.stringify(updatedScans));

      const existingFindings = getStoredLiveFindings();
      const updatedFindings = [...mappedFindings, ...existingFindings.filter(f => f.scanId !== scanId)].slice(0, 250);
      localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(updatedFindings));

      // 2. Update User-Scoped Key for Multi-User Isolation
      localStorage.setItem(getUserScansKey(userKey), JSON.stringify(updatedScans));
      localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(updatedFindings));

      // Broadcast SCAN_ADDED event (new scan added to storage)
      EventBus.publish('SCAN_ADDED', newScan, 'live-scan-store');

      // 3. Persist to Backend Server / Database in Background
      const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

      fetch(`${backendUrl}/api/scans/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: scanId,
          target: targetName,
          type: scanType,
          mode: scanType.toLowerCase(),
          engines: params.engines || [],
          riskScore: calculatedScore,
          findingsCount: mappedFindings.length,
          workspaceId: params.workspaceId || 'default-workspace',
          findings: mappedFindings,
        }),
      }).then(response => {
        if (response.ok) {
          // Broadcast successful backend sync
          EventBus.publish('SCAN_SYNCED', { scanId, target: targetName }, 'live-scan-store');
        } else {
          // Broadcast sync failure (non-critical)
          EventBus.publish('SCAN_SYNC_FAILED', { scanId, target: targetName }, 'live-scan-store');
        }
      }).catch(() => {
        // Fallback: silent catch, local storage holds the state safely
        EventBus.publish('SCAN_SYNC_FAILED', { scanId, target: targetName }, 'live-scan-store');
      });

      // Broadcast events
      EventBus.publish('SCAN_COMPLETED', newScan, 'live-scan-store');
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newScan }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_SCANS_GLOBAL }));
    } catch (e) {
      console.warn('Failed to save scan run locally:', e);
      // Broadcast SCAN_FAILED event on error
      EventBus.publish('SCAN_FAILED', {
        scanId,
        target: targetName,
        error: e instanceof Error ? e.message : 'Unknown error',
        timestamp: now.toISOString(),
      }, 'live-scan-store');
    }
  }

  return newScan;
}

export function clearStoredLiveScans(): void {
  if (typeof window === 'undefined') return;
  try {
    const userKey = getCurrentUserKey();
    const existingScans = getStoredLiveScans();
    const existingFindings = getStoredLiveFindings();
    const deletedScansCount = existingScans.length;
    const deletedFindingsCount = existingFindings.length;

    localStorage.removeItem(STORAGE_KEY_SCANS_GLOBAL);
    localStorage.removeItem(STORAGE_KEY_FINDINGS_GLOBAL);
    localStorage.removeItem(getUserScansKey(userKey));
    localStorage.removeItem(getUserFindingsKey(userKey));

    // Broadcast multiple events for comprehensive tracking
    EventBus.publish('SCANS_CLEARED', { count: deletedScansCount }, 'live-scan-store');
    EventBus.publish('FINDINGS_CLEARED', { count: deletedFindingsCount }, 'live-scan-store');
    EventBus.publish('DATA_REFRESHED', { 
      action: 'clear', 
      scansCleared: deletedScansCount,
      findingsCleared: deletedFindingsCount,
      timestamp: new Date().toISOString() 
    }, 'live-scan-store');
    
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch (e) {
    console.warn('Failed to clear live scan store:', e);
  }
}

/**
 * Add a finding to stored findings and broadcast event
 */
export function addStoredFinding(finding: StoredFinding): StoredFinding {
  if (typeof window === 'undefined') return finding;
  
  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    
    // Avoid duplicates
    if (existingFindings.some(f => f.id === finding.id)) {
      return finding;
    }

    const findingWithUser = { ...finding, userKey };
    const updatedFindings = [findingWithUser, ...existingFindings].slice(0, 250);

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(updatedFindings));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(updatedFindings));

    // Broadcast FINDING_ADDED event
    EventBus.publish('FINDING_ADDED', findingWithUser, 'live-scan-store');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return findingWithUser;
  } catch (e) {
    console.warn('Failed to add finding:', e);
    return finding;
  }
}

/**
 * Delete a finding by ID and broadcast event
 */
export function deleteStoredFinding(findingId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const filtered = existingFindings.filter(f => f.id !== findingId);

    if (filtered.length === existingFindings.length) {
      return false; // Finding not found
    }

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(filtered));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(filtered));

    // Broadcast FINDING_DELETED event
    EventBus.publish('FINDING_DELETED', { id: findingId }, 'live-scan-store');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return true;
  } catch (e) {
    console.warn('Failed to delete finding:', e);
    return false;
  }
}

/**
 * Bulk delete findings and broadcast event
 */
export function deleteStoredFindings(findingIds: string[]): number {
  if (typeof window === 'undefined') return 0;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const idSet = new Set(findingIds);
    const filtered = existingFindings.filter(f => !idSet.has(f.id));
    const deletedCount = existingFindings.length - filtered.length;

    if (deletedCount === 0) {
      return 0; // No findings deleted
    }

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(filtered));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(filtered));

    // Broadcast FINDINGS_BULK_DELETED event
    EventBus.publish('FINDINGS_BULK_DELETED', { ids: findingIds, count: deletedCount }, 'live-scan-store');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return deletedCount;
  } catch (e) {
    console.warn('Failed to delete findings:', e);
    return 0;
  }
}

/**
 * Update scan status and broadcast event
 */
export function updateScanStatus(
  scanId: string,
  status: StoredScan['status'],
  additionalData?: Partial<StoredScan>
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existingScans = getStoredLiveScans();
    const scan = existingScans.find(s => s.id === scanId);

    if (!scan) {
      return false;
    }

    const updatedScan = { ...scan, status, ...additionalData };
    const updated = existingScans.map(s => s.id === scanId ? updatedScan : s);

    localStorage.setItem(STORAGE_KEY_SCANS_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserScansKey(userKey), JSON.stringify(updated));

    // Broadcast appropriate events based on status
    if (status === 'COMPLETED') {
      EventBus.publish('SCAN_COMPLETED', updatedScan, 'live-scan-store');
    } else if (status === 'FAILED') {
      EventBus.publish('SCAN_FAILED', updatedScan, 'live-scan-store');
    } else if (status === 'CANCELLED') {
      EventBus.publish('SCAN_CANCELLED', updatedScan, 'live-scan-store');
    } else if (status === 'RUNNING') {
      EventBus.publish('SCAN_RUNNING', updatedScan, 'live-scan-store');
    }

    // Always broadcast SCAN_UPDATED for any status change
    EventBus.publish('SCAN_UPDATED', updatedScan, 'live-scan-store');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_SCANS_GLOBAL }));

    return true;
  } catch (e) {
    console.warn('Failed to update scan status:', e);
    return false;
  }
}

/**
 * Delete a scan by ID and broadcast event
 */
export function deleteStoredScan(scanId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existingScans = getStoredLiveScans();
    const filtered = existingScans.filter(s => s.id !== scanId);

    if (filtered.length === existingScans.length) {
      return false; // Scan not found
    }

    localStorage.setItem(STORAGE_KEY_SCANS_GLOBAL, JSON.stringify(filtered));
    localStorage.setItem(getUserScansKey(userKey), JSON.stringify(filtered));

    // Also remove associated findings
    const existingFindings = getStoredLiveFindings();
    const filteredFindings = existingFindings.filter(f => f.scanId !== scanId);
    const deletedFindingsCount = existingFindings.length - filteredFindings.length;

    if (deletedFindingsCount > 0) {
      localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(filteredFindings));
      localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(filteredFindings));
    }

    // Broadcast SCAN_DELETED event
    EventBus.publish('SCAN_DELETED', { 
      id: scanId, 
      deletedFindingsCount 
    }, 'live-scan-store');
    
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_SCANS_GLOBAL }));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));

    return true;
  } catch (e) {
    console.warn('Failed to delete scan:', e);
    return false;
  }
}

/**
 * Bulk delete scans and broadcast event
 */
export function deleteStoredScans(scanIds: string[]): number {
  if (typeof window === 'undefined') return 0;

  try {
    const userKey = getCurrentUserKey();
    const existingScans = getStoredLiveScans();
    const idSet = new Set(scanIds);
    const filtered = existingScans.filter(s => !idSet.has(s.id));
    const deletedCount = existingScans.length - filtered.length;

    if (deletedCount === 0) {
      return 0; // No scans deleted
    }

    localStorage.setItem(STORAGE_KEY_SCANS_GLOBAL, JSON.stringify(filtered));
    localStorage.setItem(getUserScansKey(userKey), JSON.stringify(filtered));

    // Also remove associated findings
    const existingFindings = getStoredLiveFindings();
    const filteredFindings = existingFindings.filter(f => !f.scanId || !idSet.has(f.scanId));
    const deletedFindingsCount = existingFindings.length - filteredFindings.length;

    if (deletedFindingsCount > 0) {
      localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(filteredFindings));
      localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(filteredFindings));
    }

    // Broadcast SCANS_BULK_DELETED event
    EventBus.publish('SCANS_BULK_DELETED', { 
      ids: scanIds, 
      count: deletedCount,
      deletedFindingsCount 
    }, 'live-scan-store');
    
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_SCANS_GLOBAL }));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));

    return deletedCount;
  } catch (e) {
    console.warn('Failed to delete scans:', e);
    return 0;
  }
}

/**
 * Update finding status and broadcast event
 */
export function updateFindingStatus(findingId: string, status: StoredFinding['status']): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const finding = existingFindings.find(f => f.id === findingId);

    if (!finding) {
      return false;
    }

    const updatedFinding = { ...finding, status };
    const updated = existingFindings.map(f => f.id === findingId ? updatedFinding : f);

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(updated));

    // Broadcast FINDING_UPDATED event
    EventBus.publish('FINDING_UPDATED', updatedFinding, 'live-scan-store');
    EventBus.publish('FINDING_STATUS_CHANGED', { 
      id: findingId, 
      oldStatus: finding.status, 
      newStatus: status 
    }, 'live-scan-store');
    
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return true;
  } catch (e) {
    console.warn('Failed to update finding status:', e);
    return false;
  }
}

/**
 * Update finding fields and broadcast event
 */
export function updateStoredFinding(findingId: string, updates: Partial<StoredFinding>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const finding = existingFindings.find(f => f.id === findingId);

    if (!finding) {
      return false;
    }

    const updatedFinding = { ...finding, ...updates };
    const updated = existingFindings.map(f => f.id === findingId ? updatedFinding : f);

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(updated));

    // Broadcast FINDING_UPDATED event
    EventBus.publish('FINDING_UPDATED', updatedFinding, 'live-scan-store');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return true;
  } catch (e) {
    console.warn('Failed to update finding:', e);
    return false;
  }
}

/**
 * Bulk update finding statuses and broadcast event
 */
export function bulkUpdateFindingStatus(findingIds: string[], status: StoredFinding['status']): number {
  if (typeof window === 'undefined') return 0;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const idSet = new Set(findingIds);
    
    let updateCount = 0;
    const updated = existingFindings.map(f => {
      if (idSet.has(f.id)) {
        updateCount++;
        return { ...f, status };
      }
      return f;
    });

    if (updateCount === 0) {
      return 0; // No findings updated
    }

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify(updated));

    // Broadcast FINDINGS_BULK_UPDATED event
    EventBus.publish('FINDINGS_BULK_UPDATED', { 
      ids: findingIds, 
      count: updateCount,
      status 
    }, 'live-scan-store');
    
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return updateCount;
  } catch (e) {
    console.warn('Failed to bulk update findings:', e);
    return 0;
  }
}

/**
 * Delete all findings (clear findings) and broadcast event
 */
export function deleteAllFindings(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const userKey = getCurrentUserKey();
    const existingFindings = getStoredLiveFindings();
    const deletedCount = existingFindings.length;

    if (deletedCount === 0) {
      return 0;
    }

    localStorage.setItem(STORAGE_KEY_FINDINGS_GLOBAL, JSON.stringify([]));
    localStorage.setItem(getUserFindingsKey(userKey), JSON.stringify([]));

    // Broadcast FINDINGS_CLEARED event
    EventBus.publish('FINDINGS_CLEARED', { count: deletedCount }, 'live-scan-store');
    EventBus.publish('FINDINGS_BULK_DELETED', { 
      ids: existingFindings.map(f => f.id), 
      count: deletedCount 
    }, 'live-scan-store');
    
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_FINDINGS_GLOBAL }));

    return deletedCount;
  } catch (e) {
    console.warn('Failed to delete all findings:', e);
    return 0;
  }
}

export function useLiveScanSync(pollIntervalMs = 2000) {
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [backendScans, setBackendScans] = useState<StoredScan[]>([]);
  const [backendFindings, setBackendFindings] = useState<StoredFinding[]>([]);

  const handleUpdate = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pollCount = 0;

    const fetchBackendData = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [scansRes, findingsRes] = await Promise.all([
          fetch('/api/scans', { headers }).catch(() => null),
          fetch('/api/findings?limit=250', { headers }).catch(() => null),
        ]);

        if (isMounted && scansRes && scansRes.ok) {
          const scansJson = await scansRes.json();
          if (Array.isArray(scansJson)) {
            const mapped: StoredScan[] = scansJson.map(s => {
              let score = s.riskScore;
              if (score === null || score === undefined || score === 0) {
                const count = s.findingsCount || 0;
                const deduction = Math.min(85, count * 4.2 * (100 / (100 + count * 2.8)));
                score = Math.max(15, Math.min(99, Math.round(100 - deduction)));
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

        // Broadcast DATA_REFRESHED event after each poll
        pollCount++;
        EventBus.publish('DATA_REFRESHED', {
          pollCount,
          scansCount: (scansRes && scansRes.ok) ? (backendScans.length) : 0,
          findingsCount: (findingsRes && findingsRes.ok) ? (backendFindings.length) : 0,
          timestamp: new Date().toISOString(),
        }, 'live-scan-sync');
      } catch (error) {
        console.debug('Data refresh polling error (non-critical):', error);
        // quiet fallback to local store
      }
    };

    // Perform initial fetch
    fetchBackendData();

    // Set up polling interval (default 2 seconds)
    const pollInterval = setInterval(() => {
      fetchBackendData();
      handleUpdate();
      
      // Also refresh from localStorage and broadcast
      const scans = getStoredLiveScans();
      const findings = getStoredLiveFindings();
      EventBus.publish('DATA_REFRESHED', { 
        source: 'localStorage',
        scans, 
        findings,
        scansCount: scans.length,
        findingsCount: findings.length,
        timestamp: new Date().toISOString() 
      }, 'live-scan-sync');
    }, pollIntervalMs);

    // Listen to EventBus events for real-time updates
    const unsubscribeScanAdded = EventBus.subscribe('SCAN_ADDED', () => {
      handleUpdate();
    });

    const unsubscribeScanUpdated = EventBus.subscribe('SCAN_UPDATED', () => {
      handleUpdate();
    });

    const unsubscribeFindingAdded = EventBus.subscribe('FINDING_ADDED', () => {
      handleUpdate();
    });

    const unsubscribeFindingUpdated = EventBus.subscribe('FINDING_UPDATED', () => {
      handleUpdate();
    });

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('userProfileUpdated', handleUpdate);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubscribeScanAdded();
      unsubscribeScanUpdated();
      unsubscribeFindingAdded();
      unsubscribeFindingUpdated();
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('userProfileUpdated', handleUpdate);
    };
  }, [handleUpdate, pollIntervalMs, backendScans.length, backendFindings.length]);

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
