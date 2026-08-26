'use client';

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Shield, XCircle, AlertCircle, CheckCircle2, ChevronDown,
  Search, ArrowUpDown, Eye, Clock, FileText, Download, Sparkles,
  Globe, FolderTree, Code, Key, Package, Box, Server,
  ShieldCheck, Lock, Bug, Terminal, Copy, Check, ExternalLink, Filter, GitBranch,
  Trash2, CheckSquare, Square, Radio, Layers
} from 'lucide-react';

function Github({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

import { useLiveScanSync, updateFindingStatus, bulkUpdateFindingStatus } from '@/lib/live-scan-store';
import { useRealtimeFindingEvents } from '@/hooks/useRealtimeSync';
import { EventBus } from '@/lib/event-bus';
import { formatRelativeTime, formatExactDateTime } from '@/lib/time-utils';
import {
  exportFindingsToCSV,
  exportFindingsToJSON,
  exportFindingsToMarkdown,
  exportSecurityReportHTML,
} from '@/lib/export-utils';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  source: string;
  target: string;
  status: string;
  category?: string;
  cvss?: number;
  cwe?: string;
  owasp?: string;
  remediation?: string;
  evidence?: string;
  aiExplanation?: string;
  description?: string;
  createdAt: string;
  scanId?: string;
  targetType?: 'WEBSITE' | 'GITHUB' | 'COMBINED';
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingStatus = 'NEW' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
export type TargetTypeFilter = 'ALL' | 'WEBSITE' | 'GITHUB' | 'COMBINED';

const getDynamicISODate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export function isGitHubAsset(target: string, source?: string): boolean {
  if (!target) return false;
  const t = target.toLowerCase();
  const s = (source || '').toLowerCase();
  if (t.includes('github.com') || t.includes('gitlab.com') || t.includes('.git') || t.startsWith('git@')) return true;
  if (s.includes('semgrep') || s.includes('gitleaks') || s.includes('trivy') || s.includes('checkov') || s.includes('repository') || s.includes('cicd') || s.includes('container hardening') || s.includes('license') || s.includes('code ast')) return true;
  if (t.includes('/') && !t.startsWith('http://') && !t.startsWith('https://') && !t.includes('.')) return true;
  return false;
}

export function inferFindingTargetType(target: string = '', source: string = '', rawTargetType?: string): 'WEBSITE' | 'GITHUB' | 'COMBINED' {
  if (rawTargetType === 'COMBINED') return 'COMBINED';
  if (rawTargetType === 'GITHUB') return 'GITHUB';
  if (rawTargetType === 'WEBSITE') return 'WEBSITE';
  const t = (target || '').toLowerCase();
  const s = (source || '').toLowerCase();
  if (t.includes('\n') || t.includes('\r') || t.includes(' + ') || t.includes(' & ') || t.startsWith('comb-') || s.includes('combined') || ((t.includes('http://') || t.includes('https://')) && t.includes('github.com'))) return 'COMBINED';
  if (isGitHubAsset(target, source)) return 'GITHUB';
  return 'WEBSITE';
}

const SEED_FINDINGS: Finding[] = [
  // Website Findings
  { id: 'f-w01', title: 'SQL Injection in Login Endpoint', severity: 'CRITICAL', source: 'SecureLens Vulnerability Engine', target: 'https://acme-enterprise.com', status: 'NEW', category: 'Injection', cwe: 'CWE-89', owasp: 'A03:2021-Injection', cvss: 9.8, description: 'The login endpoint concatenates user input directly into a dynamic SQL query without parameterization.', remediation: 'Use parameterized queries or prepared statements for all database access.', createdAt: getDynamicISODate(0), targetType: 'WEBSITE' },
  { id: 'f-w02', title: 'Missing Content-Security-Policy (CSP) Header', severity: 'HIGH', source: 'SecureLens HTTP Engine', target: 'https://acme-enterprise.com', status: 'ACKNOWLEDGED', category: 'Security Headers', cwe: 'CWE-1021', owasp: 'A05:2021-Security Misconfiguration', cvss: 7.2, description: 'Target web application does not enforce Content-Security-Policy, exposing users to reflected and DOM-based XSS attacks.', remediation: "Add 'Content-Security-Policy: default-src \\'self\\'; script-src \\'self\\'' response header.", createdAt: getDynamicISODate(0), targetType: 'WEBSITE' },
  { id: 'f-w03', title: 'Weak DMARC Anti-Spoofing Policy (p=none)', severity: 'MEDIUM', source: 'SecureLens Mail Security', target: 'https://acme-enterprise.com', status: 'NEW', category: 'Email Security', cwe: 'CWE-290', cvss: 5.8, description: 'DMARC is set to monitoring mode only (p=none), allowing unauthorized email spoofing and phishing campaigns.', remediation: 'Upgrade DMARC TXT record to `p=quarantine` or `p=reject`.', createdAt: getDynamicISODate(1), targetType: 'WEBSITE' },
  { id: 'f-w04', title: 'Public OpenAPI / Swagger Documentation Exposed', severity: 'MEDIUM', source: 'SecureLens API Auditor', target: 'https://acme-enterprise.com', status: 'OPEN', category: 'API Security', cwe: 'CWE-200', cvss: 5.3, description: 'Unauthenticated Swagger UI documentation discovered at `/swagger-ui.html` exposing internal API specifications.', remediation: 'Restrict Swagger documentation to authenticated developer networks or disable in production.', createdAt: getDynamicISODate(1), targetType: 'WEBSITE' },
  { id: 'f-w05', title: 'Weak TLS 1.0/1.1 Protocols Supported', severity: 'HIGH', source: 'SecureLens SSL/TLS Auditor', target: 'https://acme-enterprise.com', status: 'NEW', category: 'SSL/TLS', cwe: 'CWE-326', cvss: 7.5, description: 'The web server negotiates deprecated TLS 1.0 and 1.1 protocols containing known cryptographic weaknesses.', remediation: 'Disable TLS 1.0 and TLS 1.1 in web server configuration; enforce TLS 1.2 or TLS 1.3 only.', createdAt: getDynamicISODate(2), targetType: 'WEBSITE' },

  // GitHub Findings
  { id: 'f-g01', title: 'Exposed AWS Access Key ID & Secret Key in .env.production', severity: 'CRITICAL', source: 'SecureLens Secret Hunter', target: 'https://github.com/acme/backend-core', status: 'OPEN', category: 'Secrets', cwe: 'CWE-798', cvss: 9.8, description: 'Live AWS Production Credentials detected committed to repository root in `.env.production`.', evidence: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', remediation: '1. Revoke and rotate AWS access key in IAM immediately. 2. Remove file from git history using git filter-repo. 3. Use AWS Secrets Manager.', createdAt: getDynamicISODate(0), targetType: 'GITHUB' },
  { id: 'f-g02', title: 'OS Command Injection via child_process.exec', severity: 'CRITICAL', source: 'SecureLens SAST Engine', target: 'https://github.com/acme/backend-core', status: 'NEW', category: 'Static Analysis', cwe: 'CWE-78', owasp: 'A03:2021-Injection', cvss: 9.8, description: 'User-controlled input passed directly into shell execution function without sanitization.', evidence: 'const output = execSync(`git clone ${userProvidedUrl}`);', remediation: 'Use `execFile` or `spawn` with argument arrays instead of shell command strings.', createdAt: getDynamicISODate(0), targetType: 'GITHUB' },
  { id: 'f-g03', title: 'Critical Vulnerability in jsonwebtoken (CVE-2022-23529)', severity: 'CRITICAL', source: 'SecureLens Dependency Guard', target: 'https://github.com/acme/backend-core', status: 'OPEN', category: 'Supply Chain', cwe: 'CWE-94', cvss: 9.8, description: 'Insecure Key Verification allowing arbitrary code execution during JWT verification.', remediation: 'Upgrade `jsonwebtoken` package to version 9.0.0 or higher in package.json.', createdAt: getDynamicISODate(1), targetType: 'GITHUB' },
  { id: 'f-g04', title: 'GitHub Actions Script Injection via Untrusted Context', severity: 'HIGH', source: 'SecureLens CI/CD Auditor', target: 'https://github.com/acme/backend-core', status: 'NEW', category: 'CI/CD Security', cwe: 'CWE-78', cvss: 8.4, description: 'Inline shell step in `.github/workflows/pr.yml` directly evaluates `${{ github.event.issue.title }}`.', remediation: 'Pass untrusted context values through intermediate `env:` environment variable mappings.', createdAt: getDynamicISODate(1), targetType: 'GITHUB' },
  { id: 'f-g05', title: 'Container Configured to Run as Root User (UID 0)', severity: 'HIGH', source: 'SecureLens Container Hardening', target: 'https://github.com/acme/backend-core', status: 'NEW', category: 'Container Security', cwe: 'CWE-250', cvss: 7.8, description: 'Dockerfile lacks a non-root USER directive, allowing container processes to execute as host root.', remediation: 'Add `USER 1001` or `USER appuser` to drop root privileges before runtime entrypoint.', createdAt: getDynamicISODate(2), targetType: 'GITHUB' },
  { id: 'f-g06', title: 'Strong Copyleft License Identified (AGPL-3.0)', severity: 'HIGH', source: 'SecureLens License Auditor', target: 'https://github.com/acme/backend-core', status: 'OPEN', category: 'License Compliance', cwe: 'CWE-1059', cvss: 7.0, description: 'Project incorporates AGPL-3.0 licensed dependency with reciprocal network copyleft requirements.', remediation: 'Review distribution architecture to ensure compliance with open source licensing policies.', createdAt: getDynamicISODate(2), targetType: 'GITHUB' },
];

const severityConfig = {
  CRITICAL: { color: '#ef4444', bg: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, order: 0 },
  HIGH:     { color: '#f97316', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertTriangle, order: 1 },
  MEDIUM:   { color: '#eab308', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: AlertCircle, order: 2 },
  LOW:      { color: '#22c55e', bg: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2, order: 3 },
  INFO:     { color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Shield, order: 4 },
};

const statusConfig: Record<FindingStatus, { bg: string; label: string }> = {
  NEW:            { bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20', label: 'New' },
  OPEN:           { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Open' },
  ACKNOWLEDGED:   { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Acknowledged' },
  RESOLVED:       { bg: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Resolved' },
  FALSE_POSITIVE: { bg: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: 'False Positive' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

function FindingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { findings: liveFindings, lastUpdated } = useLiveScanSync();
  const { findingAdded, findingDeleted, totalFindingsAdded } = useRealtimeFindingEvents();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [hasLoadedApi, setHasLoadedApi] = useState(false);
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetTypeFilter>('ALL');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'severity' | 'date'>('severity');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRemediation, setCopiedRemediation] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(Date.now());
  const [isLive, setIsLive] = useState(false);
  const [newFindingIds, setNewFindingIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'single' | 'bulk' | 'target' | 'all';
    id?: string;
    title?: string;
    target?: string;
    count?: number;
  }>({ open: false, type: 'single' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time event listener for new findings
  useEffect(() => {
    if (findingAdded && typeof findingAdded === 'object') {
      setIsLive(true);
      const fId = findingAdded.id;
      if (fId) {
        setNewFindingIds(prev => new Set([...prev, fId]));
        // Auto-remove animation after 2 seconds
        setTimeout(() => {
          setNewFindingIds(prev => {
            const next = new Set(prev);
            next.delete(fId);
            return next;
          });
        }, 2000);
      }
      showToast(`🔴 New ${findingAdded.severity || 'security'} finding: ${findingAdded.title || 'Vulnerability detected'}`);
    }
  }, [findingAdded]);

  // Handle deletion events in real-time
  useEffect(() => {
    if (findingDeleted && typeof findingDeleted === 'object') {
      const fId = findingDeleted.id;
      if (fId) {
        setFindings(prev => prev.filter(f => f.id !== fId));
        setNewFindingIds(prev => {
          const next = new Set(prev);
          next.delete(fId);
          return next;
        });
      }
      showToast(`Deleted finding: ${findingDeleted.title || fId || ''}`);
    }
  }, [findingDeleted]);

  // Manage live indicator timeout
  useEffect(() => {
    if (isLive) {
      const timer = setTimeout(() => setIsLive(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isLive]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('sl_token')) : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(f => f.id));
    }
  };

  const executeDelete = async () => {
    const headers = getAuthHeaders();
    const { type, id, title, target, count } = confirmModal;
    setConfirmModal({ open: false, type: 'single' });

    try {
      if (type === 'single' && id) {
        await fetch(`/api/findings/${id}`, { method: 'DELETE', headers });
        setFindings(prev => prev.filter(f => f.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
        if (selectedFinding?.id === id) setSelectedFinding(null);
        showToast(`Deleted finding "${title || id}"`);
      } else if (type === 'bulk') {
        await fetch('/api/findings/bulk', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ ids: selectedIds })
        });
        setFindings(prev => prev.filter(f => !selectedIds.includes(f.id)));
        if (selectedFinding && selectedIds.includes(selectedFinding.id)) {
          setSelectedFinding(null);
        }
        showToast(`Deleted ${selectedIds.length} findings`);
        setSelectedIds([]);
      } else if (type === 'target' && target) {
        await fetch(`/api/findings/target/${encodeURIComponent(target)}`, { method: 'DELETE', headers });
        setFindings(prev => prev.filter(f => f.target !== target));
        setSelectedIds(prev => prev.filter(id => {
          const f = findings.find(x => x.id === id);
          return f?.target !== target;
        }));
        if (selectedFinding?.target === target) setSelectedFinding(null);
        showToast(`Deleted all findings for ${target}`);
        if (selectedTarget === target) setSelectedTarget('ALL');
      } else if (type === 'all') {
        await fetch('/api/findings/all', { method: 'DELETE', headers });
        setFindings([]);
        setSelectedIds([]);
        setSelectedFinding(null);
        showToast('All security findings cleared');
      }
      setFetchTrigger(Date.now());
    } catch (err) {
      showToast('Error deleting finding(s). Please try again.');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: FindingStatus) => {
    updateFindingStatus(id, newStatus as any);
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    if (selectedFinding?.id === id) {
      setSelectedFinding(prev => prev ? { ...prev, status: newStatus } : null);
    }
    showToast(`✓ Finding status changed to ${statusConfig[newStatus]?.label || newStatus}`);
    
    // Background sync to backend
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('sl_token')) : null;
    fetch(`/api/findings/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  };

  const handleBulkStatus = async (newStatus: FindingStatus) => {
    if (selectedIds.length === 0) return;
    bulkUpdateFindingStatus(selectedIds, newStatus as any);
    setFindings(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, status: newStatus } : f));
    if (selectedFinding && selectedIds.includes(selectedFinding.id)) {
      setSelectedFinding(prev => prev ? { ...prev, status: newStatus } : null);
    }
    showToast(`✓ Marked ${selectedIds.length} findings as ${statusConfig[newStatus]?.label || newStatus}`);
    setSelectedIds([]);
  };

  const handleAIExplanation = (finding: Finding) => {
    const params = new URLSearchParams({
      tab: 'chat',
      action: 'explain',
      findingId: finding.id,
      title: finding.title,
      severity: finding.severity,
      target: finding.target,
      source: finding.source,
      category: finding.category || '',
      cvss: finding.cvss ? String(finding.cvss) : '',
      description: finding.description || '',
    });
    router.push(`/dashboard/ai-copilot?${params.toString()}`);
  };

  const handleRemediate = (finding: Finding) => {
    const params = new URLSearchParams({
      tab: 'chat',
      action: 'remediate',
      findingId: finding.id,
      title: finding.title,
      severity: finding.severity,
      target: finding.target,
      source: finding.source,
      category: finding.category || '',
      description: finding.description || '',
    });
    router.push(`/dashboard/ai-copilot?${params.toString()}`);
  };
  const handleCopyRemediation = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRemediation(true);
    setTimeout(() => setCopiedRemediation(false), 2000);
  };

  useEffect(() => {
    const qScanId = searchParams.get('scanId');
    const qTarget = searchParams.get('target');
    const qType = searchParams.get('type')?.toUpperCase();

    if (qType && ['ALL', 'WEBSITE', 'GITHUB', 'COMBINED'].includes(qType)) {
      setTargetTypeFilter(qType as any);
    } else if (qScanId) {
      // When navigated from a specific scan, start with ALL to avoid accidental exclusion
      setTargetTypeFilter('ALL');
    } else if (qTarget) {
      if (qTarget.includes('\n') || qTarget.includes(' + ') || (qTarget.includes('http') && qTarget.includes('github'))) {
        setTargetTypeFilter('COMBINED');
      } else if (isGitHubAsset(qTarget)) {
        setTargetTypeFilter('GITHUB');
      } else {
        setTargetTypeFilter('WEBSITE');
      }
    } else {
      setTargetTypeFilter('ALL');
    }

    if (qTarget) {
      setSelectedTarget(qTarget);
    } else {
      setSelectedTarget('ALL');
    }

    const qSev = (searchParams.get('severity') || searchParams.get('sev'))?.toUpperCase();
    if (qSev && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'ALL'].includes(qSev)) {
      setSelectedSeverity(qSev as any);
    }

    const qStatus = (searchParams.get('status') || searchParams.get('st'))?.toUpperCase();
    if (qStatus && ['NEW', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE', 'ALL'].includes(qStatus)) {
      setSelectedStatus(qStatus as any);
    }

    const qCat = searchParams.get('category');
    if (qCat) {
      setSelectedCategory(qCat);
    }

    const qSearch = searchParams.get('search') || searchParams.get('q');
    if (qSearch) {
      setSearchQuery(qSearch);
    }
  }, [searchParams]);

  // Fetch from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchFindings = () => {
      const scanId = searchParams.get('scanId');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
      const url = `/api/findings?limit=500${scanId ? `&scanId=${scanId}` : ''}`;

      fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          if (!isMounted) return;
          const list = Array.isArray(data) ? data : (data?.findings || data?.items || []);
          const formatted: Finding[] = list.map((item: any) => {
            const rawType = item.targetType || (item.scanType ? String(item.scanType).toUpperCase() : undefined);
            const tType = inferFindingTargetType(item.target || '', item.source || '', rawType);
            return {
              id: item.id,
              title: item.title,
              severity: (item.severity?.toUpperCase() || 'INFO') as Severity,
              source: item.source || 'scanner',
              target: item.target || 'target asset',
              status: item.status || 'NEW',
              category: item.category || (tType === 'GITHUB' ? 'Code Security' : tType === 'COMBINED' ? 'Correlated Intelligence' : 'Web Security'),
              cvss: item.cvss ? Number(item.cvss) : undefined,
              cwe: item.cwe,
              owasp: item.owasp,
              remediation: item.remediation,
              evidence: item.evidence,
              description: item.description || '',
              createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(item.createdAt || Date.now()).toISOString(),
              scanId: item.scanId,
              targetType: tType,
            };
          });
          setFindings(formatted);
          setHasLoadedApi(true);
        })
        .catch(() => {
          if (isMounted) setHasLoadedApi(true);
        });
    };

    fetchFindings();
    const interval = setInterval(fetchFindings, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [searchParams, lastUpdated, fetchTrigger]);

  const activeFindings = useMemo(() => {
    const scanId = searchParams.get('scanId');
    const targetParam = searchParams.get('target');

    // Build unique findings map
    const allMap = new Map<string, Finding>();

    // 1. Add findings from live store (contains real-time scanned items)
    liveFindings.forEach(lf => {
      const rawType = lf.targetType || ((lf as any).scanType ? String((lf as any).scanType).toUpperCase() : undefined);
      const tType = inferFindingTargetType(lf.target || '', lf.source || '', rawType);
      allMap.set(lf.id, {
        id: lf.id,
        title: lf.title,
        severity: (lf.severity?.toUpperCase() || 'MEDIUM') as Severity,
        source: lf.source || 'SecureLens Engine',
        target: lf.target || 'target asset',
        status: lf.status || 'NEW',
        category: lf.category || (tType === 'GITHUB' ? 'Code Security' : tType === 'COMBINED' ? 'Correlated Intelligence' : 'Web Security'),
        cvss: lf.cvss ? Number(lf.cvss) : undefined,
        cwe: lf.cwe,
        owasp: lf.owasp,
        remediation: lf.remediation,
        evidence: lf.evidence,
        description: lf.description || '',
        createdAt: typeof lf.createdAt === 'string' ? lf.createdAt : new Date().toISOString(),
        scanId: lf.scanId,
        targetType: tType,
      });
    });

    // 2. Add findings from API backend
    findings.forEach(f => {
      if (!allMap.has(f.id)) {
        allMap.set(f.id, f);
      }
    });

    let list = Array.from(allMap.values());

    if (scanId) {
      const scanMatches = list.filter(f => f.scanId === scanId || f.id?.includes(scanId));
      if (scanMatches.length > 0) {
        list = scanMatches;
      } else if (targetParam) {
        const tp = targetParam.trim().toLowerCase().replace(/[\r\n]+/g, ' ');
        const targetMatches = list.filter(f => {
          const ft = (f.target || '').trim().toLowerCase();
          return ft === tp || ft.includes(tp) || tp.includes(ft);
        });
        if (targetMatches.length > 0) {
          list = targetMatches;
        }
      }
    } else if (targetParam) {
      const tp = targetParam.trim().toLowerCase().replace(/[\r\n]+/g, ' ');
      const targetMatches = list.filter(f => {
        const ft = (f.target || '').trim().toLowerCase();
        return ft === tp || ft.includes(tp) || tp.includes(ft);
      });
      if (targetMatches.length > 0) {
        list = targetMatches;
      }
    }

    return list;
  }, [findings, liveFindings, searchParams, hasLoadedApi]);

  // Group counts for tabs
  const typeCounts = useMemo(() => {
    let websiteCount = 0;
    let githubCount = 0;
    let combinedCount = 0;
    activeFindings.forEach(f => {
      const tType = f.targetType || inferFindingTargetType(f.target, f.source);
      if (tType === 'COMBINED') {
        combinedCount++;
      } else if (tType === 'GITHUB') {
        githubCount++;
      } else {
        websiteCount++;
      }
    });
    return {
      all: activeFindings.length,
      website: websiteCount,
      github: githubCount,
      combined: combinedCount,
    };
  }, [activeFindings]);

  // Unique Targets within current type filter
  const availableTargets = useMemo(() => {
    const counts: Record<string, { count: number; isGh: boolean; isComb: boolean }> = {};
    activeFindings.forEach(f => {
      const tType = f.targetType || inferFindingTargetType(f.target, f.source);
      if (targetTypeFilter === 'WEBSITE' && tType !== 'WEBSITE') return;
      if (targetTypeFilter === 'GITHUB' && tType !== 'GITHUB') return;
      if (targetTypeFilter === 'COMBINED' && tType !== 'COMBINED') return;

      if (f.target) {
        if (!counts[f.target]) {
          counts[f.target] = { count: 0, isGh: tType === 'GITHUB', isComb: tType === 'COMBINED' };
        }
        counts[f.target].count += 1;
      }
    });
    return Object.entries(counts).map(([target, info]) => ({
      target,
      count: info.count,
      isGh: info.isGh,
      isComb: info.isComb,
    }));
  }, [activeFindings, targetTypeFilter]);

  // Unique Categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    activeFindings.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from<string>(set).sort();
  }, [activeFindings]);

  // Filtered findings list
  const filtered = useMemo(() => {
    const scanId = searchParams.get('scanId');
    return activeFindings
      .filter(f => {
        if (scanId && targetTypeFilter === 'ALL') return true;
        const tType = f.targetType || inferFindingTargetType(f.target, f.source);
        if (targetTypeFilter === 'WEBSITE' && tType !== 'WEBSITE') return false;
        if (targetTypeFilter === 'GITHUB' && tType !== 'GITHUB') return false;
        if (targetTypeFilter === 'COMBINED' && tType !== 'COMBINED') return false;
        return true;
      })
      .filter(f => {
        if (selectedTarget === 'ALL') return true;
        const st = selectedTarget.trim().toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\/+$/, '');
        const ft = (f.target || '').trim().toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\/+$/, '');
        return ft === st || ft.includes(st) || st.includes(ft);
      })
      .filter(f => selectedSeverity === 'ALL' || f.severity === selectedSeverity)
      .filter(f => selectedStatus === 'ALL' || f.status === selectedStatus)
      .filter(f => selectedCategory === 'ALL' || f.category === selectedCategory)
      .filter(f => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.target.toLowerCase().includes(q) ||
          (f.source && f.source.toLowerCase().includes(q)) ||
          (f.category && f.category.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'severity') {
          return severityConfig[a.severity].order - severityConfig[b.severity].order;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [activeFindings, targetTypeFilter, selectedTarget, selectedSeverity, selectedStatus, selectedCategory, searchQuery, sortBy, searchParams]);

  const severityCounts = useMemo(() => {
    const list = activeFindings.filter(f => {
      const tType = f.targetType || inferFindingTargetType(f.target, f.source);
      if (targetTypeFilter === 'WEBSITE' && tType !== 'WEBSITE') return false;
      if (targetTypeFilter === 'GITHUB' && tType !== 'GITHUB') return false;
      if (targetTypeFilter === 'COMBINED' && tType !== 'COMBINED') return false;
      return true;
    });
    return Object.entries(severityConfig).reduce((acc, [key]) => {
      acc[key as Severity] = list.filter(f => f.severity === key).length;
      return acc;
    }, {} as Record<Severity, number>);
  }, [activeFindings, targetTypeFilter]);

  const handleExport = (format: 'csv' | 'json' | 'html' | 'md') => {
    setShowExportMenu(false);
    const targetLabel = selectedTarget === 'ALL' ? (targetTypeFilter === 'ALL' ? 'All_Assets' : targetTypeFilter) : selectedTarget.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (format === 'csv') {
      exportFindingsToCSV(filtered as any, targetLabel);
    } else if (format === 'json') {
      exportFindingsToJSON(filtered as any, targetLabel);
    } else if (format === 'html') {
      exportSecurityReportHTML({
        title: `Security Vulnerability Assessment Report - ${targetLabel}`,
        target: targetLabel,
        findings: filtered as any,
      });
    } else if (format === 'md') {
      exportFindingsToMarkdown(filtered as any, targetLabel);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 400 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: 400 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-950/90 border border-violet-500/40 text-violet-200 text-sm shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0e1322] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {confirmModal.type === 'single' && 'Delete Finding'}
                    {confirmModal.type === 'bulk' && `Delete ${confirmModal.count} Findings`}
                    {confirmModal.type === 'target' && `Delete Findings for ${confirmModal.target}`}
                    {confirmModal.type === 'all' && 'Clear All Security Findings'}
                  </h3>
                  <p className="text-xs text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                {confirmModal.type === 'single' && `Are you sure you want to permanently delete "${confirmModal.title}"?`}
                {confirmModal.type === 'bulk' && `Are you sure you want to permanently delete all ${confirmModal.count} selected security findings?`}
                {confirmModal.type === 'target' && `Are you sure you want to delete all findings detected for ${confirmModal.target}?`}
                {confirmModal.type === 'all' && 'Are you sure you want to delete all security findings across all websites, APIs, and GitHub repositories?'}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setConfirmModal({ open: false, type: 'single' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Export / Delete Actions */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Security Findings
            {isLive && (
              <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center gap-1"
              >
                <Radio size={10} className="fill-red-400" /> LIVE
              </motion.span>
            )}
            {selectedTarget !== 'ALL' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-medium">
                {selectedTarget}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Comprehensive multi-vector vulnerability analysis across websites, APIs, and GitHub code repositories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {findings.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setConfirmModal({ open: true, type: 'all' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-medium transition-all cursor-pointer"
              title="Clear all findings across all assets"
            >
              <Trash2 size={13} /> Clear All
            </motion.button>
          )}

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm font-medium transition-all cursor-pointer shadow-lg shadow-violet-600/10"
            >
              <Download size={14} /> Export Findings ({filtered.length})
              <ChevronDown size={14} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </motion.button>

            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-60 bg-[#0e1322] border border-white/[0.08] rounded-xl shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 border-b border-white/[0.06] mb-1">
                    Export {filtered.length} Filtered Findings
                  </div>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    📊 <span>CSV Spreadsheet (.csv)</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    📦 <span>JSON Technical Schema (.json)</span>
                  </button>
                  <button
                    onClick={() => handleExport('html')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    🌐 <span>Executive HTML Report (.html)</span>
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    📝 <span>Markdown Document (.md)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Target Type Selector (All vs Websites vs GitHub Repos) */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 border-b border-white/[0.06] pb-4">
        <button
          onClick={() => {
            setTargetTypeFilter('ALL');
            setSelectedTarget('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            targetTypeFilter === 'ALL'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25 ring-1 ring-violet-400/40'
              : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Shield size={15} /> All Assets
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-semibold">{typeCounts.all}</span>
        </button>

        <button
          onClick={() => {
            setTargetTypeFilter('WEBSITE');
            setSelectedTarget('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            targetTypeFilter === 'WEBSITE'
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/25 ring-1 ring-sky-400/40'
              : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Globe size={15} /> Websites & Web Apps
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-semibold">{typeCounts.website}</span>
        </button>

        <button
          onClick={() => {
            setTargetTypeFilter('GITHUB');
            setSelectedTarget('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            targetTypeFilter === 'GITHUB'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-400/40'
              : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Github size={15} /> GitHub Repositories
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-semibold">{typeCounts.github}</span>
        </button>

        <button
          onClick={() => {
            setTargetTypeFilter('COMBINED');
            setSelectedTarget('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            targetTypeFilter === 'COMBINED'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/40'
              : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Layers size={15} /> Combined Scans
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 font-semibold">{typeCounts.combined}</span>
        </button>
      </motion.div>

      {/* Target Quick Filter Bar */}
      {availableTargets.length > 0 && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap mr-1 flex items-center gap-1">
            <Filter size={12} /> Target:
          </span>
          <button
            onClick={() => setSelectedTarget('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
              selectedTarget === 'ALL'
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm ring-1 ring-violet-500/30'
                : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'
            }`}
          >
            All {targetTypeFilter === 'GITHUB' ? 'Repositories' : (targetTypeFilter === 'WEBSITE' ? 'Websites' : 'Targets')} ({filtered.length})
          </button>

          {availableTargets.map(({ target, count, isGh, isComb }) => (
            <div key={target} className="flex items-center gap-0.5">
              <button
                onClick={() => setSelectedTarget(target)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedTarget === target
                    ? isComb
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm ring-1 ring-purple-500/30'
                      : isGh
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-sky-600/20 text-sky-300 border-sky-500/40 shadow-sm ring-1 ring-sky-500/30'
                    : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                {isComb ? <Layers size={12} className="text-purple-400" /> : isGh ? <Github size={12} className="text-emerald-400" /> : <Globe size={12} className="text-sky-400" />}
                <span className="truncate max-w-[200px]">{target.replace(/^https?:\/\//, '')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 font-semibold">{count}</span>
              </button>
              {selectedTarget === target && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmModal({ open: true, type: 'target', target });
                  }}
                  title={`Delete all findings for ${target}`}
                  className="p-1 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Severity Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['ALL', ...Object.keys(severityConfig)] as const).map(key => {
          const sev = key === 'ALL' ? null : severityConfig[key as Severity];
          const Icon = sev?.icon || Shield;
          const count = key === 'ALL' ? Object.values(severityCounts).reduce<number>((a, b) => a + Number(b || 0), 0) : (severityCounts[key as Severity] || 0);
          const isActive = selectedSeverity === key;
          return (
            <motion.button
              key={key}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSeverity(key as any)}
              className={`relative overflow-hidden rounded-xl p-3 text-left transition-all border cursor-pointer ${
                isActive ? 'border-violet-500/40 bg-violet-600/10 ring-1 ring-violet-500/30' : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {sev && <Icon size={12} style={{ color: sev.color }} />}
                <span className="text-xs text-gray-400 capitalize">{key === 'ALL' ? 'All Severities' : key.toLowerCase()}</span>
              </div>
              <p className="text-xl font-bold text-white">{count}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Filters & Search Toolbar */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by website, repo, CVE, tool, secret, or keyword..."
              className="w-full bg-[#0e1322] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 rounded-md"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>

          {/* Target Dropdown */}
          <select
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            className="bg-[#0e1322] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer max-w-[220px] truncate"
          >
            <option value="ALL">All {targetTypeFilter === 'GITHUB' ? 'Repositories' : (targetTypeFilter === 'WEBSITE' ? 'Websites' : 'Targets')}</option>
            {availableTargets.map(({ target, count, isGh }) => (
              <option key={target} value={target}>
                {isGh ? '📦 ' : '🌐 '}{target.replace(/^https?:\/\//, '')} ({count})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#0e1322] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer max-w-[180px] truncate"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#0e1322] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortBy(s => s === 'severity' ? 'date' : 'severity')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 text-sm hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <ArrowUpDown size={14} /> Sort: {sortBy === 'severity' ? 'Severity' : 'Date'}
          </button>
        </div>

        {/* Quick Search Chips & Active Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] text-gray-500 font-medium mr-1">Quick Search:</span>
            {[
              { label: '🔥 Critical', q: 'CRITICAL' },
              { label: '🔑 Secrets', q: 'secret' },
              { label: '💉 Injection', q: 'injection' },
              { label: '⚡ API / Swagger', q: 'api' },
              { label: '✉️ DMARC', q: 'dmarc' },
              { label: '🐳 Container', q: 'container' },
              { label: '📦 CVE Flaws', q: 'cve' },
              { label: '🛡️ WAF Shield', q: 'waf' },
            ].map(chip => (
              <button
                key={chip.label}
                onClick={() => setSearchQuery(searchQuery === chip.q ? '' : chip.q)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                  searchQuery.toLowerCase() === chip.q.toLowerCase()
                    ? 'bg-violet-600/30 text-violet-200 border-violet-500/50 ring-1 ring-violet-500/30'
                    : 'bg-white/[0.02] text-gray-400 border-white/[0.05] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {(searchQuery || selectedTarget !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL' || selectedCategory !== 'ALL' || targetTypeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTarget('ALL');
                  setSelectedSeverity('ALL');
                  setSelectedStatus('ALL');
                  setSelectedCategory('ALL');
                  setTargetTypeFilter('ALL');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer flex items-center gap-1"
              >
                <XCircle size={12} /> Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Multi-Selection Bulk Action Bar */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSelectAllFiltered}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white font-medium cursor-pointer"
              >
                {selectedIds.length === filtered.length && filtered.length > 0 ? (
                  <CheckSquare size={15} className="text-violet-400" />
                ) : (
                  <Square size={15} className="text-gray-500" />
                )}
                <span>Select All Filtered ({filtered.length})</span>
              </button>

              {selectedIds.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 font-semibold">
                  {selectedIds.length} Selected
                </span>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleBulkStatus('ACKNOWLEDGED')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 font-medium transition-colors cursor-pointer"
                >
                  Acknowledge ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkStatus('RESOLVED')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-medium transition-colors cursor-pointer"
                >
                  Resolve ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkStatus('FALSE_POSITIVE')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/20 font-medium transition-colors cursor-pointer"
                >
                  False Positive
                </button>
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'bulk', count: selectedIds.length })}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all cursor-pointer shadow-sm shadow-rose-600/20"
                >
                  <Trash2 size={11} /> Delete ({selectedIds.length})
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1 text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Main Grid: Findings List + Detail Drawer */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Cols: Findings Cards */}
        <div className="xl:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-12 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No security findings match your filters</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Try clearing active search queries or switching between Website and GitHub repository tabs.
              </p>
            </div>
          ) : (
            filtered.map((finding) => {
              const sev = severityConfig[finding.severity] || severityConfig.INFO;
              const Icon = sev.icon;
              const st = statusConfig[finding.status as FindingStatus] || statusConfig.NEW;
              const isGh = finding.targetType === 'GITHUB' || isGitHubAsset(finding.target, finding.source);
              const isComb = finding.targetType === 'COMBINED' || finding.target.includes(' + ') || finding.target.includes(' & ');
              const isSelected = selectedFinding?.id === finding.id;
              const isChecked = selectedIds.includes(finding.id);
              const isNew = newFindingIds.has(finding.id);

              return (
                <motion.div
                  key={finding.id}
                  variants={itemVariants}
                  onClick={() => setSelectedFinding(finding)}
                  layout
                  className={`rounded-xl border p-4.5 transition-all cursor-pointer group relative ${
                    isSelected
                      ? 'bg-violet-600/[0.08] border-violet-500/40 ring-1 ring-violet-500/30'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.035] hover:border-white/[0.1]'
                  }`}
                >
                  {/* New Finding Animation */}
                  {isNew && (
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.1 }}
                      transition={{ duration: 1.5, delay: 0.3 }}
                      className="absolute inset-0 rounded-xl border-2 border-emerald-400"
                    />
                  )}

                  {/* Fade-in for new items */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="flex items-start gap-3.5">
                    {/* Multi-Select Checkbox */}
                    <button
                      onClick={(e) => handleToggleSelect(finding.id, e)}
                      className="mt-1 text-gray-500 hover:text-violet-400 transition-colors p-0.5 rounded"
                      title={isChecked ? 'Deselect finding' : 'Select finding'}
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-violet-400" />
                      ) : (
                        <Square size={16} className="text-gray-600 group-hover:text-gray-400" />
                      )}
                    </button>

                    <div className={`p-2.5 rounded-xl ${sev.bg} border shrink-0`}>
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors leading-snug">
                            {finding.title}
                          </p>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5 border ${
                                isComb
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                                  : isGh
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                  : 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                              }`}
                            >
                              {isComb ? <Layers size={10} className="text-purple-400" /> : isGh ? <Github size={10} className="text-emerald-400" /> : <Globe size={10} className="text-sky-400" />}
                              <span className="truncate max-w-[220px]">{finding.target.replace(/^https?:\/\//, '')}</span>
                            </span>

                            {finding.category && (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-white/[0.04] text-gray-300 border border-white/[0.06] font-medium">
                                {finding.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges & Delete Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${st.bg}`}>
                            {st.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${sev.bg}`}>
                            {finding.severity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                open: true,
                                type: 'single',
                                id: finding.id,
                                title: finding.title,
                              });
                            }}
                            title="Delete this finding"
                            className="p-1 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {finding.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {finding.description}
                        </p>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04] text-xs">
                        <span className="text-gray-500 text-[11px] flex items-center gap-1.5" title={`Discovered: ${formatExactDateTime(finding.createdAt)}`}>
                          <Clock size={11} className="text-violet-400" />
                          <span>{formatRelativeTime(finding.createdAt)}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-400">{finding.source}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIExplanation(finding);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-violet-600/10"
                          >
                            <Sparkles size={11} /> AI Explain
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Sticky Inspector Drawer */}
        <div className="xl:col-span-1">
          {selectedFinding ? (
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    {selectedFinding.targetType === 'GITHUB' || isGitHubAsset(selectedFinding.target, selectedFinding.source) ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                        <Github size={10} /> REPOSITORY AUDIT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-bold flex items-center gap-1">
                        <Globe size={10} /> WEBSITE AUDIT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setConfirmModal({
                        open: true,
                        type: 'single',
                        id: selectedFinding.id,
                        title: selectedFinding.title,
                      })}
                      title="Delete this finding"
                      className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setSelectedFinding(null)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/[0.05]"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Title & Severity Header */}
                  <div>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${severityConfig[selectedFinding.severity].bg} border shrink-0`}>
                        {React.createElement(severityConfig[selectedFinding.severity].icon, { size: 18 })}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-snug">{selectedFinding.title}</h3>
                        <p className="text-xs text-violet-400/90 mt-1 font-mono break-all">{selectedFinding.target}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Chips & Interactive Status Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold ${severityConfig[selectedFinding.severity]?.bg || severityConfig.INFO.bg}`}>
                      {selectedFinding.severity}
                    </span>
                    {selectedFinding.cvss && (
                      <span className="text-[10px] px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        CVSS {selectedFinding.cvss} / 10.0
                      </span>
                    )}
                    {selectedFinding.cwe && (
                      <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] text-gray-300 border border-white/[0.08]">
                        {selectedFinding.cwe}
                      </span>
                    )}
                  </div>

                  {/* Status Lifecycle Changer */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">Lifecycle Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusConfig[selectedFinding.status as FindingStatus]?.bg || statusConfig.NEW.bg}`}>
                        Current: {statusConfig[selectedFinding.status as FindingStatus]?.label || 'New'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {(['NEW', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'] as FindingStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedFinding.id, st)}
                          className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all text-center cursor-pointer ${
                            selectedFinding.status === st
                              ? `${statusConfig[st]?.bg} ring-1 ring-white/20 font-bold`
                              : 'text-gray-400 border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          {statusConfig[st]?.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-1.5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vulnerability Overview</p>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{selectedFinding.description}</p>
                  </div>

                  {/* Code / Evidence Snippet */}
                  {selectedFinding.evidence && (
                    <div className="bg-black/40 border border-red-500/20 rounded-xl p-3.5 space-y-1.5">
                      <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                        <Terminal size={12} /> Detected Code / Evidence
                      </p>
                      <pre className="text-[11px] font-mono text-red-200 bg-red-950/30 p-2.5 rounded-lg overflow-x-auto leading-relaxed border border-red-500/10">
                        {selectedFinding.evidence}
                      </pre>
                    </div>
                  )}

                  {/* Remediation Guide */}
                  {selectedFinding.remediation && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={12} /> Recommended Remediation
                        </p>
                        <button
                          onClick={() => handleCopyRemediation(selectedFinding.remediation)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedRemediation ? <Check size={10} /> : <Copy size={10} />}
                          {copiedRemediation ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-emerald-200/90 leading-relaxed whitespace-pre-line font-sans">
                        {selectedFinding.remediation}
                      </p>
                    </div>
                  )}

                  {/* Source & Category Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3">
                      <p className="text-gray-500 text-[11px] mb-0.5">Scanning Tool</p>
                      <p className="text-white font-semibold flex items-center gap-1">
                        <FileText size={12} className="text-violet-400" />
                        {selectedFinding.source}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3">
                      <p className="text-gray-500 text-[11px] mb-0.5">Category</p>
                      <p className="text-white font-semibold truncate">{selectedFinding.category || 'General'}</p>
                    </div>
                  </div>

                  {/* Discovery Timestamp */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-gray-400 text-[11px] flex items-center gap-1.5">
                      <Clock size={12} className="text-violet-400" /> Discovered:
                    </span>
                    <span className="text-gray-200 font-mono text-[11px]">
                      {formatExactDateTime(selectedFinding.createdAt)} ({formatRelativeTime(selectedFinding.createdAt)})
                    </span>
                  </div>

                  {/* AI Copilot & Delete Actions */}
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAIExplanation(selectedFinding)}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles size={13} /> AI Explanation
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRemediate(selectedFinding)}
                        className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Fix & Patch
                      </motion.button>
                    </div>
                    <button
                      onClick={() => setConfirmModal({
                        open: true,
                        type: 'single',
                        id: selectedFinding.id,
                        title: selectedFinding.title,
                      })}
                      className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete This Finding
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sticky top-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-8 text-center">
              <Eye size={36} className="text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Select a finding to inspect</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Click on any vulnerability in the list to examine full exploit details, source evidence, and remediation guides.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function FindingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
        </div>
      }
    >
      <FindingsContent />
    </Suspense>
  );
}
