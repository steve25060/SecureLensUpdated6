/**
 * SecureLens Workspaces Persistence & Synchronization Engine
 * Handles persistent storage in localStorage, auto-generation from live scans,
 * EventBus real-time updates, and backend API synchronization.
 */

import { EventBus } from './event-bus';
import { getCurrentUserKey, getStoredLiveScans, type StoredScan } from './live-scan-store';

export type WorkspaceType = 'WEBSITE' | 'GITHUB' | 'COMBINED';

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  type: WorkspaceType;
  targetUrl?: string | null;
  repoUrl?: string | null;
  tags?: string[];
  riskScore?: number | null;
  findingsCount?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  engines?: string[];
  userKey?: string;
}

export const STORAGE_KEY_WORKSPACES_GLOBAL = 'securelens_workspaces_global';

function getUserWorkspacesKey(userKey?: string): string {
  const key = userKey || getCurrentUserKey();
  return `securelens_workspaces_${key}`;
}

/** Built-in default workspaces ensuring zero-state is always rich and functional */
export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-prod-01',
    name: 'UptoSkills – Main Web Surface',
    description: 'Primary production website, API endpoints, and customer authentication portal.',
    type: 'WEBSITE',
    targetUrl: 'https://uptoskills.com',
    tags: ['production', 'critical', 'web-app'],
    riskScore: 84,
    findingsCount: 6,
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    engines: ['Nuclei', 'Port Scanner', 'SSL/TLS Engine', 'HTTP Analyzer'],
  },
  {
    id: 'ws-auth-02',
    name: 'Backend Core & Auth Service',
    description: 'GitHub source code repository scan for the backend microservices and JWT handling.',
    type: 'GITHUB',
    repoUrl: 'https://github.com/acme/backend-core',
    tags: ['source-code', 'sast', 'secrets'],
    riskScore: 68,
    findingsCount: 8,
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    engines: ['Gitleaks', 'Semgrep OSS', 'Trivy', 'License Auditor'],
  },
  {
    id: 'ws-comb-03',
    name: 'E-Commerce Platform – Multi-Vector Audit',
    description: 'Full-stack combined analysis covering the live storefront web assets and GitHub infrastructure repo.',
    type: 'COMBINED',
    targetUrl: 'https://shop.acme.com',
    repoUrl: 'https://github.com/acme/storefront',
    tags: ['combined', 'staging', 'full-stack'],
    riskScore: 92,
    findingsCount: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
    updatedAt: new Date().toISOString(),
    engines: ['Nuclei', 'WhatWeb', 'Trivy', 'testssl.sh', 'ZAP Core'],
  },
];

/** Retrieve stored workspaces from localStorage + auto-derive from scans */
export function getStoredWorkspaces(): Workspace[] {
  if (typeof window === 'undefined') return [];

  const workspaceMap = new Map<string, Workspace>();

  try {
    const userKey = getCurrentUserKey();

    // 1. User-scoped stored workspaces
    const userStored = localStorage.getItem(getUserWorkspacesKey(userKey));
    if (userStored) {
      const parsed = JSON.parse(userStored);
      if (Array.isArray(parsed)) {
        parsed.forEach(w => workspaceMap.set(w.id, w));
      }
    }

    // 2. Global stored workspaces (only if default unauthenticated guest)
    if (userKey === 'default') {
      const globalStored = localStorage.getItem(STORAGE_KEY_WORKSPACES_GLOBAL);
      if (globalStored) {
        const parsed = JSON.parse(globalStored);
        if (Array.isArray(parsed)) {
          parsed.forEach(w => {
            if (!workspaceMap.has(w.id)) workspaceMap.set(w.id, w);
          });
        }
      }
    }

    // 3. Auto-derive workspaces from completed Live Scans
    const liveScans: StoredScan[] = getStoredLiveScans();
    liveScans.forEach(scan => {
      if (!scan.target) return;
      const cleanTarget = scan.target.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsId = `ws-auto-${cleanTarget.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      if (!workspaceMap.has(wsId) && !Array.from(workspaceMap.values()).some(w => w.targetUrl === scan.target || w.repoUrl === scan.target)) {
        const isGh = scan.type === 'GITHUB' || scan.target.includes('github.com');
        const isComb = scan.type === 'COMBINED';
        const wsType: WorkspaceType = isComb ? 'COMBINED' : isGh ? 'GITHUB' : 'WEBSITE';

        workspaceMap.set(wsId, {
          id: wsId,
          name: `${cleanTarget} Workspace`,
          description: `Auto-configured security workspace for ${scan.target}`,
          type: wsType,
          targetUrl: wsType !== 'GITHUB' ? scan.target : undefined,
          repoUrl: wsType !== 'WEBSITE' ? scan.target : undefined,
          tags: ['live-scan', wsType.toLowerCase()],
          riskScore: scan.score ?? 85,
          findingsCount: scan.findingsCount ?? (scan.findings?.length || 0),
          status: scan.status === 'RUNNING' ? 'running' : 'active',
          createdAt: scan.createdAt || scan.time || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          engines: scan.engines || [],
        });
      }
    });

    // 4. If empty, return clean empty list
  } catch (e) {
    console.warn('Failed to retrieve workspaces from storage:', e);
  }

  return Array.from(workspaceMap.values());
}

/** Save or update a workspace */
export function saveStoredWorkspace(workspace: Workspace): Workspace {
  if (typeof window === 'undefined') return workspace;

  try {
    const userKey = getCurrentUserKey();
    const existing = getStoredWorkspaces();
    const isUpdate = existing.some(w => w.id === workspace.id);
    const updated = isUpdate
      ? existing.map(w => w.id === workspace.id ? { ...w, ...workspace, updatedAt: new Date().toISOString() } : w)
      : [workspace, ...existing];

    localStorage.setItem(STORAGE_KEY_WORKSPACES_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserWorkspacesKey(userKey), JSON.stringify(updated));

    EventBus.publish(isUpdate ? 'WORKSPACE_UPDATED' : 'WORKSPACE_CREATED', workspace, 'workspaces-store');
    window.dispatchEvent(new CustomEvent('securelens:workspaces-updated', { detail: workspace }));

    // Background sync to backend
    const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    fetch(`${backendUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        type: workspace.type,
        targetUrl: workspace.targetUrl,
        repoUrl: workspace.repoUrl,
        tags: workspace.tags || [],
      }),
    }).catch(() => {});
  } catch (e) {
    console.warn('Failed to save workspace locally:', e);
  }

  return workspace;
}

/** Delete a workspace by ID */
export function deleteStoredWorkspace(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const userKey = getCurrentUserKey();
    const existing = getStoredWorkspaces();
    const updated = existing.filter(w => w.id !== id);

    localStorage.setItem(STORAGE_KEY_WORKSPACES_GLOBAL, JSON.stringify(updated));
    localStorage.setItem(getUserWorkspacesKey(userKey), JSON.stringify(updated));

    EventBus.publish('WORKSPACE_DELETED', { id }, 'workspaces-store');
    window.dispatchEvent(new CustomEvent('securelens:workspaces-updated', { detail: { id } }));

    // Background delete on backend
    const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    fetch(`${backendUrl}/api/workspaces/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});

    return true;
  } catch (e) {
    console.warn('Failed to delete workspace:', e);
    return false;
  }
}
