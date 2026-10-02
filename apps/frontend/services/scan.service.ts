'use client';

import api from '@/lib/api';

/**
 * Scan Service
 * Frontend service for interacting with scan endpoints
 * Handles all scan-related API calls with safe engine name abstraction
 */

export interface CreateScanRequest {
  workspaceId: string;
  mode: 'website' | 'github' | 'combined';
  target: string;
  engines?: string[]; // Internal engine IDs only, never actual tool names
}

export interface ScanResponse {
  scanId: string;
  status: string;
  message: string;
}

export interface ScanStatusResponse {
  scanId: string;
  status: string;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  engines: string[];
}

export interface AvailableEngine {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ScanResult {
  scanId: string;
  status: string;
  mode: string;
  targetUrl: string;
  engines: string[];
  findings: any[];
  startedAt?: string;
  completedAt?: string;
}

export const scanService = {
  /**
   * Create a new scan
   */
  async createScan(request: CreateScanRequest): Promise<ScanResponse> {
    const response = await api.post('/scans/create', request);
    return response.data;
  },

  /**
   * Start a scan
   */
  async startScan(scanId: string): Promise<ScanResponse> {
    const response = await api.post(`/scans/${scanId}/start`);
    return response.data;
  },

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ScanStatusResponse> {
    const response = await api.get(`/scans/${scanId}/status`);
    return response.data;
  },

  /**
   * Get scan results
   */
  async getScanResults(scanId: string): Promise<ScanResult> {
    const response = await api.get(`/scans/${scanId}/results`);
    return response.data;
  },

  /**
   * Cancel a scan
   */
  async cancelScan(scanId: string): Promise<ScanResponse> {
    const response = await api.delete(`/scans/${scanId}/cancel`);
    return response.data;
  },

  /**
   * Get workspace scans
   */
  async getWorkspaceScans(workspaceId: string): Promise<any[]> {
    const response = await api.get(`/scans/workspace/${workspaceId}`);
    return response.data;
  },

  /**
   * Get available engines (safe names, never actual tools)
   */
  async getAvailableEngines(): Promise<AvailableEngine[]> {
    const response = await api.get('/scans/engines/available');
    return response.data;
  },

  /**
   * Get engines for a specific mode
   */
  async getEnginesForMode(mode: 'website' | 'github' | 'combined'): Promise<AvailableEngine[]> {
    const response = await api.get(`/scans/engines/mode/${mode}`);
    return response.data;
  },

  /**
   * Get all constants
   */
  async getConstants(): Promise<any> {
    const response = await api.get('/scans/constants');
    return response.data;
  },
};

/**
 * AI Copilot Service
 * Frontend service for AI-powered features
 */

export interface AIResponse {
  explanation?: string;
  remediation?: string;
  scenario?: string;
  code?: string;
  answer?: string;
  error?: string;
}

export const aiService = {
  /**
   * Explain a finding
   */
  async explainFinding(findingId: string): Promise<AIResponse> {
    const response = await api.post('/ai-copilot/explain', {
      findingId,
    });
    return response.data;
  },

  /**
   * Get remediation suggestions
   */
  async suggestRemediation(findingId: string): Promise<AIResponse> {
    const response = await api.post('/ai-copilot/remediate', {
      findingId,
    });
    return response.data;
  },

  /**
   * Explain attack scenario
   */
  async explainAttackScenario(findingId: string): Promise<AIResponse> {
    const response = await api.post('/ai-copilot/attack-scenario', {
      findingId,
    });
    return response.data;
  },

  /**
   * Generate secure code example
   */
  async generateCodeExample(findingId: string): Promise<AIResponse> {
    const response = await api.post('/ai-copilot/code-example', {
      findingId,
    });
    return response.data;
  },

  /**
   * Ask follow-up question
   */
  async askQuestion(findingId: string, question: string): Promise<AIResponse> {
    const response = await api.post('/ai-copilot/question', {
      findingId,
      question,
    });
    return response.data;
  },

  /**
   * Check if AI is configured
   */
  async getStatus(): Promise<{ configured: boolean; provider: string }> {
    const response = await api.get('/ai-copilot/status');
    return response.data;
  },
};

/**
 * Findings Service
 * Frontend service for findings-related operations
 */

export const findingsService = {
  /**
   * Get findings for a scan
   */
  async getFindingsByScan(scanId: string): Promise<any[]> {
    const response = await api.get(`/findings/scan/${scanId}`);
    return response.data;
  },

  /**
   * Get finding details
   */
  async getFinding(findingId: string): Promise<any> {
    const response = await api.get(`/findings/${findingId}`);
    return response.data;
  },

  /**
   * Update finding status
   */
  async updateFindingStatus(
    findingId: string,
    status: 'new' | 'open' | 'acknowledged' | 'resolved' | 'false_positive',
  ): Promise<any> {
    const response = await api.patch(`/findings/${findingId}`, {
      status,
    });
    return response.data;
  },

  /**
   * Get findings statistics
   */
  async getFindingsStats(scanId: string): Promise<any> {
    const response = await api.get(`/findings/stats/${scanId}`);
    return response.data;
  },
};

/**
 * Workspace Service
 * Frontend service for workspace operations
 */

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  type: 'website' | 'github' | 'combined';
  targetUrl?: string;
  repoUrl?: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  description?: string;
  type: string;
  targetUrl?: string;
  repoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const workspaceService = {
  /**
   * Create a new workspace
   */
  async createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
    const response = await api.post('/workspaces', request);
    return response.data;
  },

  /**
   * Get all workspaces for the user
   */
  async getWorkspaces(): Promise<WorkspaceResponse[]> {
    const response = await api.get('/workspaces');
    return response.data;
  },

  /**
   * Get workspace details
   */
  async getWorkspace(workspaceId: string): Promise<WorkspaceResponse> {
    const response = await api.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    request: Partial<CreateWorkspaceRequest>,
  ): Promise<WorkspaceResponse> {
    const response = await api.patch(`/workspaces/${workspaceId}`, request);
    return response.data;
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/workspaces/${workspaceId}`);
    return response.data;
  },
};
