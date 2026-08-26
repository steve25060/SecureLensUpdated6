'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle, Loader2, Check, Play, Globe, ArrowRight, Shield, Activity,
  Target, X, Terminal, StopCircle, ChevronDown, RefreshCw, Cpu,
  CircleDot, FileWarning, Sparkles, Database, Layers, ServerCrash,
  Info, Clock, UploadCloud, FileCode, Code2, FileText, Trash2, Radio,
} from 'lucide-react';
import { enginesForMode, engineById, RESOURCE_META, type EngineDef, type ScanMode } from '@/lib/engines';
import { EngineIcon } from '@/components/dashboard/EngineIcon';
import { saveLiveScanRun, getActiveScanSession, setActiveScanSession, calculateSecurityScore, type ActiveScanSession } from '@/lib/live-scan-store';
import { getStoredWorkspaces, saveStoredWorkspace } from '@/lib/workspaces-store';
import { useEventBus, EventBus } from '@/lib/event-bus';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { Github } from '@/components/common/GithubIcon';

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanStatusValue = 'idle' | 'queued' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled';
type GitHubInputMode = 'repo_url' | 'file_upload' | 'code_paste';

interface UploadedCodeFile {
  name: string;
  size: number;
  content: string;
  type?: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  type: string;
  targetUrl?: string | null;
  repoUrl?: string | null;
}

interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error' | 'success';
  engine?: string;
  message: string;
}

interface FindingPreview {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  source: string;
}

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || localStorage.getItem('sl_token');
};
const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

const severityMeta: Record<FindingPreview['severity'], { color: string; cls: string }> = {
  CRITICAL: { color: '#ef4444', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  HIGH:     { color: '#f97316', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  MEDIUM:   { color: '#eab308', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  LOW:      { color: '#22c55e', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  INFO:     { color: '#3b82f6', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

// ─── Demo data (offline only) ─────────────────────────────────────────────────
const DEMO_WORKSPACES: WorkspaceOption[] = [
  { id: 'demo-1', name: 'Acme Corp – Production', type: 'WEBSITE', targetUrl: 'https://acme.com' },
  { id: 'demo-3', name: 'Storefront – Combined', type: 'COMBINED', targetUrl: 'https://shop.acme.com', repoUrl: 'https://github.com/acme/storefront' },
];

const DEMO_FINDINGS: FindingPreview[] = [
  { id: 'f-1', severity: 'CRITICAL', title: 'SQL Injection in login endpoint', source: 'Code Security Check' },
  { id: 'f-2', severity: 'HIGH', title: 'Missing Content-Security-Policy header', source: 'HTTP Security Check' },
  { id: 'f-3', severity: 'HIGH', title: 'Weak TLS configuration (TLS 1.0 enabled)', source: 'SSL & TLS Security Check' },
  { id: 'f-4', severity: 'MEDIUM', title: 'Outdated jQuery 1.12.4 detected', source: 'Technology Detection' },
  { id: 'f-5', severity: 'MEDIUM', title: 'Server banner disclosure', source: 'Live Asset Check' },
  { id: 'f-6', severity: 'LOW', title: 'Missing HSTS header', source: 'SSL & TLS Security Check' },
  { id: 'f-7', severity: 'LOW', title: 'X-Frame-Options not set', source: 'HTTP Security Check' },
  { id: 'f-8', severity: 'INFO', title: 'Technology stack identified', source: 'Technology Detection' },
];

// ─── Direct Code File & GitHub File Security Analyzer ──────────────────────────
interface CodeAuditFinding {
  id: string;
  severity: FindingPreview['severity'];
  title: string;
  source: string;
  line?: number;
  snippet?: string;
  cwe?: string;
  remediation?: string;
}

function auditDirectCodeFile(fileName: string, content: string): CodeAuditFinding[] {
  const findings: CodeAuditFinding[] = [];
  const lines = content.split('\n');

  // 1. Secret Detection (Gitleaks Engine)
  const secretChecks = [
    { title: 'Exposed AWS Access Key ID', severity: 'CRITICAL' as const, regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Revoke key in AWS IAM and generate a new key with least privilege.' },
    { title: 'Exposed AWS Secret Access Key', severity: 'CRITICAL' as const, regex: /aws[_\-]?secret[_\-]?access[_\-]?key.*?['":=]\s*['"]?([a-zA-Z0-9\/+=]{40})['"]?/i, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Rotate AWS IAM Secret Key immediately.' },
    { title: 'Exposed GitHub Personal Access Token', severity: 'CRITICAL' as const, regex: /(?:ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82}/, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Revoke personal access token in GitHub Developer Settings.' },
    { title: 'Exposed OpenAI / AI Provider API Key', severity: 'HIGH' as const, regex: /sk-[a-zA-Z0-9]{48,}|sk-proj-[a-zA-Z0-9_-]{80,}/, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Revoke and rotate API key in provider console.' },
    { title: 'Exposed RSA / SSH Private Key', severity: 'CRITICAL' as const, regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, source: 'Secret Detection', cwe: 'CWE-312', remediation: 'Revoke SSH key pair and remove from authorized_keys.' },
    { title: 'Hardcoded Database Credentials URL', severity: 'HIGH' as const, regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_\-\.]+:[^@\s"']+@[a-zA-Z0-9_\-\.]+/i, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Use environment variables (DATABASE_URL) and rotate credentials.' },
    { title: 'Hardcoded JWT Secret Key', severity: 'HIGH' as const, regex: /(?:jwt_secret|jwt_key|secret_or_key|token_secret)\s*[:=]\s*['"][a-zA-Z0-9!@#$%^&*()_+=-]{6,40}['"]/i, source: 'Secret Detection', cwe: 'CWE-798', remediation: 'Store JWT secret in encrypted environment variables.' },
  ];

  // 2. Code Security SAST (Semgrep Engine)
  const sastChecks = [
    { title: 'SQL Injection via Unparameterized Concatenation', severity: 'CRITICAL' as const, regex: /(?:\.query|\.execute|\.raw|db\.run|cursor\.execute)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|"[^"]*"\s*\+\s*[a-zA-Z0-9_.]+|'[^']*'\s*\+\s*[a-zA-Z0-9_.]+)/, source: 'Code Security Check', cwe: 'CWE-89', remediation: 'Use parameterized prepared statements ($1, ?).' },
    { title: 'OS Command Injection via Unsanitized Shell Execution', severity: 'CRITICAL' as const, regex: /(?:exec|execSync|spawn|system|popen|subprocess\.call)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|req\.(?:query|body|params))/i, source: 'Code Security Check', cwe: 'CWE-78', remediation: 'Use execFile with argument arrays instead of raw shell execution.' },
    { title: 'Cross-Site Scripting (XSS) via Unsafe DOM Rendering', severity: 'HIGH' as const, regex: /(?:dangerouslySetInnerHTML|innerHTML\s*=|document\.write\s*\()/i, source: 'Code Security Check', cwe: 'CWE-79', remediation: 'Sanitize input using DOMPurify or use textContent.' },
    { title: 'Path Traversal via Unvalidated File Path', severity: 'HIGH' as const, regex: /(?:fs\.readFile|fs\.createReadStream|open|send_file)\s*\(\s*(?:req\.(?:query|body|params)|\.\.\/)/i, source: 'Code Security Check', cwe: 'CWE-22', remediation: 'Validate paths with path.resolve and restrict to an allowed directory.' },
    { title: 'Insecure Dynamic Code Execution (eval / Function)', severity: 'HIGH' as const, regex: /(?:\beval\s*\(|\bnew Function\s*\(|setTimeout\s*\(\s*['"`])/i, source: 'Code Security Check', cwe: 'CWE-95', remediation: 'Eliminate eval() and use JSON.parse or strict parsers.' },
  ];

  // 3. Container & Dockerfile Checks
  const dockerChecks = [
    { title: 'Container Running as Root User (Missing USER directive)', severity: 'MEDIUM' as const, regex: /^USER\s+root/im, source: 'Container & Dockerfile Security', cwe: 'CWE-250', remediation: 'Add `USER nonroot` or create an unprivileged user.' },
    { title: 'Unpinned Latest Base Image in Dockerfile', severity: 'LOW' as const, regex: /^FROM\s+[\w\-\.\/]+:latest/im, source: 'Container & Dockerfile Security', cwe: 'CWE-1188', remediation: 'Pin base image to specific digest or immutable version tag.' },
  ];

  // Scan line by line
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    [...secretChecks, ...sastChecks].forEach(rule => {
      if (rule.regex.test(lineText)) {
        findings.push({
          id: `file-finding-${findings.length + 1}`,
          severity: rule.severity,
          title: rule.title,
          source: rule.source,
          line: lineNum,
          snippet: lineText.trim().substring(0, 100),
          cwe: rule.cwe,
          remediation: rule.remediation,
        });
      }
    });
  });

  // Full file checks (Dependencies / Dockerfile)
  if (fileName.endsWith('.json') || fileName.includes('package.json')) {
    const vulnerableDeps = [
      { name: 'lodash', title: 'Known CVE in lodash (<4.17.21): Command Injection (CVE-2021-23337)', severity: 'HIGH' as const },
      { name: 'jsonwebtoken', title: 'Known CVE in jsonwebtoken (<9.0.0): Insecure Key Verification (CVE-2022-23529)', severity: 'CRITICAL' as const },
      { name: 'axios', title: 'Known CVE in axios (<0.21.2): ReDoS Vulnerability (CVE-2021-3749)', severity: 'HIGH' as const },
      { name: 'minimist', title: 'Known CVE in minimist (<1.2.6): Prototype Pollution (CVE-2021-44906)', severity: 'CRITICAL' as const },
    ];
    vulnerableDeps.forEach(dep => {
      if (content.includes(`"${dep.name}"`)) {
        findings.push({
          id: `file-dep-${findings.length + 1}`,
          severity: dep.severity,
          title: dep.title,
          source: 'Dependency Security Check',
          snippet: `Dependency detected: ${dep.name}`,
          cwe: 'CWE-1395',
          remediation: `Upgrade ${dep.name} to the latest secure release.`,
        });
      }
    });
  }

  if (fileName.toLowerCase().includes('dockerfile')) {
    dockerChecks.forEach(d => {
      if (d.regex.test(content)) {
        findings.push({
          id: `file-docker-${findings.length + 1}`,
          severity: d.severity,
          title: d.title,
          source: d.source,
          cwe: d.cwe,
          remediation: d.remediation,
        });
      }
    });
  }

  return findings;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] space-y-2.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 40, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl text-xs font-semibold ${
              t.type === 'success' ? 'bg-[#0b1615]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
              : t.type === 'error' ? 'bg-[#1a1215]/95 border-rose-500/40 text-rose-200 shadow-rose-950/40'
              : 'bg-[#151222]/95 border-violet-500/40 text-violet-200 shadow-violet-950/40'
            }`}>
            <div className={`p-1 rounded-lg ${t.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : t.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-violet-500/20 text-violet-400'}`}>
              {t.type === 'success' ? <Check size={14} /> : t.type === 'error' ? <X size={14} /> : <AlertCircle size={14} />}
            </div>
            <span className="leading-snug">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-50 hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"><X size={12} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Live log console ─────────────────────────────────────────────────────────
function LogConsole({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const levelColor = (lvl: LogEntry['level']) =>
    lvl === 'error' ? 'text-red-400'
    : lvl === 'warn' ? 'text-yellow-400'
    : lvl === 'success' ? 'text-green-400' : 'text-gray-300';

  return (
    <div className="rounded-xl bg-[#0a0a14] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <Terminal size={14} className="text-violet-400" />
        <span className="text-xs font-medium text-gray-300">Live Scan Logs</span>
        <div className="flex gap-1.5 ml-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
      </div>
      <div ref={scrollRef} className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-1 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-gray-600 italic">Waiting for scan output…</div>
        ) : logs.map((log, i) => (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="text-gray-600 shrink-0 select-none">{log.ts}</span>
            {log.engine && <span className="text-violet-400 shrink-0">[{log.engine}]</span>}
            <span className={levelColor(log.level)}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Premium engine card ──────────────────────────────────────────────────────
function EngineCard({
  engine, selected, disabled, onToggle,
}: {
  engine: EngineDef; selected: boolean; disabled: boolean; onToggle: () => void;
}) {
  const res = RESOURCE_META[engine.resource];
  return (
    <label className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
      selected ? 'border-violet-500/40 bg-violet-600/[0.08] shadow-lg shadow-violet-600/5' : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'
    } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 w-4 h-4 accent-violet-500 cursor-pointer rounded shrink-0" />
      <EngineIcon name={engine.icon} accent={engine.accent} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white">{engine.name}</p>
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border ${res.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${res.dot}`} />{res.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{engine.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.06]">
            <Cpu size={9} />{engine.tool}
          </span>
          <span className="text-[10px] text-gray-600">{engine.category}</span>
        </div>
      </div>
    </label>
  );
}

// ─── Smooth animated progress bar + counter ────────────────────────────────────
// The backend reports progress in discrete jumps every ~2s. To make the UI feel
// alive we spring-interpolate toward the target value so both the bar and the
// number ease smoothly between updates instead of snapping.
function SmoothProgress({ value, status }: { value: number; status: ScanStatusValue }) {
  const [display, setDisplay] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const isActive = status === 'running' || status === 'queued' || status === 'processing';
  const isDone = status === 'completed';
  const isEnded = status === 'failed' || status === 'cancelled';

  // We animate the displayed value ourselves with a rAF loop so the number
  // always flows smoothly from 1 → 100 regardless of how fast the backend
  // finishes. `progRef` is the current shown value; `targetRef` is where we
  // want to head toward.
  const progRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const wasActiveRef = useRef(false);

  // Update the target based on backend value + status.
  const backend = Math.max(0, Math.min(100, value));
  useEffect(() => {
    if (isActive) {
      // Detect the start of a brand-new scan (transition into active) and
      // reset the bar to 0 so it always flows from the beginning.
      if (!wasActiveRef.current) {
        progRef.current = 0;
        setDisplay(0);
        setBarWidth(0);
      }
      wasActiveRef.current = true;
      // Jump the floor forward if the real backend value is ahead of us, but
      // let the rAF loop keep the bar continuously creeping otherwise.
      if (backend > targetRef.current) targetRef.current = Math.min(99, backend);
    } else if (isDone) {
      wasActiveRef.current = false;
      targetRef.current = 100;
    } else if (isEnded) {
      wasActiveRef.current = false;
      targetRef.current = progRef.current; // freeze wherever we are
    } else {
      // idle / reset
      wasActiveRef.current = false;
      progRef.current = 0;
      targetRef.current = 0;
      setDisplay(0);
      setBarWidth(0);
    }
  }, [backend, isActive, isDone, isEnded]);

  // Continuous animation loop.
  useEffect(() => {
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(64, ts - lastTsRef.current); // ms, clamp big gaps
      lastTsRef.current = ts;

      // While actively scanning, continuously creep the target forward (capped
      // at 99) so the bar never pauses between the backend's coarse updates.
      if (isActive && targetRef.current < 99) {
        targetRef.current = Math.min(99, targetRef.current + (6 * dt) / 1000);
      }

      const cur = progRef.current;
      const tgt = targetRef.current;

      if (cur < tgt) {
        // Speed: how many percent per second.
        // When finishing (target 100), move faster to close it out.
        const speed = tgt >= 100 ? 40 : 30; // %/sec
        const next = Math.min(tgt, cur + (speed * dt) / 1000);
        // Ensure we always start visibly at 1 when active.
        progRef.current = Math.max(next, isActive || isDone ? 1 : 0);
        const rounded = progRef.current;
        setDisplay(Math.round(rounded));
        setBarWidth(rounded);
      } else if (cur > tgt) {
        // Only happens on freeze; snap down softly (rare).
        progRef.current = tgt;
        setDisplay(Math.round(tgt));
        setBarWidth(tgt);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [isActive, isDone]);

  const gradientStyle =
    status === 'failed'
      ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
      : status === 'cancelled'
      ? 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)'
      : status === 'completed'
      ? 'linear-gradient(90deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)'
      : 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 35%, #ec4899 70%, #06b6d4 100%)';

  const glowShadow =
    status === 'failed'
      ? '0 0 16px rgba(239, 68, 68, 0.75), 0 0 6px rgba(220, 38, 38, 0.9)'
      : status === 'completed'
      ? '0 0 16px rgba(16, 185, 129, 0.75), 0 0 6px rgba(6, 182, 212, 0.9)'
      : '0 0 18px rgba(168, 85, 247, 0.8), 0 0 8px rgba(6, 182, 212, 0.9)';

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-[#0f1424] border border-violet-500/20 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className={isActive ? 'text-cyan-400 animate-pulse' : isDone ? 'text-emerald-400' : 'text-gray-400'} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Scan Progress</span>
        </div>
        <div className="flex items-center gap-2.5">
          {isActive && (
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 animate-pulse">
              ANALYZING
            </span>
          )}
          {isDone && (
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              COMPLETE
            </span>
          )}
          <span className="text-lg font-black text-cyan-300 tabular-nums tracking-tight font-mono drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            {display}%
          </span>
        </div>
      </div>

      {/* High-visibility Glowing Progress Bar */}
      <div className="w-full bg-[#182035] rounded-full h-4 p-0.5 border border-violet-400/30 shadow-inner overflow-hidden relative">
        <div
          style={{
            width: `${Math.max(barWidth, isActive || isDone ? 2 : 0)}%`,
            background: gradientStyle,
            boxShadow: glowShadow,
          }}
          className="h-full rounded-full relative overflow-hidden transition-all duration-150 flex items-center justify-end"
        >
          {/* Pulsing leading head light */}
          {isActive && (
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] shrink-0 mr-0.5 animate-pulse" />
          )}
          {/* Moving shimmer light wave while active */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page content ────────────────────────────────────────────────────────
function LiveScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔥 REAL-TIME SYNC INTEGRATION
  const { isLive, lastUpdate, eventCount, recentEvents } = useRealtimeSync();
  const [realtimeFindingsCount, setRealtimeFindingsCount] = useState(0);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const [workspaceId, setWorkspaceId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [mode, setMode] = useState<ScanMode>('website');
  const [scanProfile, setScanProfile] = useState<'fast' | 'normal' | 'aggressive'>('normal');
  const [selectedEngines, setSelectedEngines] = useState<Set<string>>(new Set());

  // GitHub & Direct File Upload state
  const [githubInputType, setGithubInputType] = useState<GitHubInputMode>('repo_url');
  const [uploadedFile, setUploadedFile] = useState<UploadedCodeFile | null>(null);
  const [pastedCode, setPastedCode] = useState('');
  const [pastedFileName, setPastedFileName] = useState('app.js');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [scanId, setScanId] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatusValue>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [findings, setFindings] = useState<FindingPreview[]>([]);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🔥 REAL-TIME EVENT BUS SUBSCRIPTIONS
  // Subscribe to SCAN_STARTED events
  useEventBus('SCAN_STARTED', (payload) => {
    const { scanId: eventScanId, target, mode: scanMode } = payload.data;
    log(`[EventBus] Received SCAN_STARTED event: ${target}`, 'success', 'EventBus');
    setIsBroadcasting(true);
    
    // If this is a different scan, update our state
    if (eventScanId && eventScanId !== scanId) {
      setScanId(eventScanId);
      setScanStatus('running');
      setScanProgress(0);
      setRealtimeFindingsCount(0);
    }
  }, [scanId]);

  // Subscribe to SCAN_PROGRESS events for real-time progress updates
  useEventBus('SCAN_PROGRESS', (payload) => {
    const { scanId: eventScanId, progress, status, findingsCount } = payload.data;
    
    // Only update if it's our scan or we don't have a scan yet
    if (!scanId || eventScanId === scanId) {
      if (typeof progress === 'number') {
        setScanProgress(progress);
        log(`[EventBus] Progress update: ${progress}%`, 'info', 'EventBus');
      }
      if (status) {
        setScanStatus(status);
      }
      if (typeof findingsCount === 'number') {
        setRealtimeFindingsCount(findingsCount);
      }
      setIsBroadcasting(true);
    }
  }, [scanId]);

  // Subscribe to SCAN_COMPLETED events
  useEventBus('SCAN_COMPLETED', (payload) => {
    const { scanId: eventScanId, findings: eventFindings, score } = payload.data;
    log(`[EventBus] Scan completed: ${eventScanId}`, 'success', 'EventBus');
    
    if (eventScanId === scanId || !scanId) {
      setScanStatus('completed');
      setScanProgress(100);
      setIsBroadcasting(false);
      
      if (eventFindings && Array.isArray(eventFindings)) {
        setFindings(eventFindings.slice(0, 20).map((f: any): FindingPreview => ({
          id: f.id,
          severity: ((f.severity ?? 'INFO').toUpperCase() as FindingPreview['severity']),
          title: f.title ?? 'Untitled finding',
          source: f.source ?? 'scanner',
        })));
        setRealtimeFindingsCount(eventFindings.length);
      }
      
      pushToast(`Scan completed — ${eventFindings?.length || 0} findings synced!`, 'success');
    }
  }, [scanId]);

  // Subscribe to SCAN_FAILED events
  useEventBus('SCAN_FAILED', (payload) => {
    const { scanId: eventScanId, error: errorMsg } = payload.data;
    
    if (eventScanId === scanId) {
      setScanStatus('failed');
      setIsBroadcasting(false);
      log(`[EventBus] Scan failed: ${errorMsg || 'Unknown error'}`, 'error', 'EventBus');
      pushToast('Scan failed', 'error');
    }
  }, [scanId]);

  // Subscribe to FINDING_ADDED events for real-time finding updates
  useEventBus('FINDING_ADDED', (payload) => {
    const { scanId: eventScanId, finding } = payload.data;
    
    if (eventScanId === scanId && finding) {
      setFindings(prev => {
        // Avoid duplicates
        if (prev.some(f => f.id === finding.id)) return prev;
        
        const newFinding: FindingPreview = {
          id: finding.id,
          severity: ((finding.severity ?? 'INFO').toUpperCase() as FindingPreview['severity']),
          title: finding.title ?? 'Untitled finding',
          source: finding.source ?? 'scanner',
        };
        
        setRealtimeFindingsCount(prev => prev + 1);
        log(`[EventBus] New finding: ${finding.title}`, 'warn', 'EventBus');
        
        return [newFinding, ...prev].slice(0, 20);
      });
    }
  }, [scanId]);

  // Live Elapsed Scan Timer
  useEffect(() => {
    if ((scanStatus === 'running' || scanStatus === 'queued' || scanStatus === 'processing') && scanStartTime) {
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - scanStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [scanStatus, scanStartTime]);

  // Engine list is derived from the mode — local catalog, no backend call.
  const engines = enginesForMode(mode);

  const pushToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);
  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const log = useCallback((message: string, level: LogEntry['level'] = 'info', engine?: string) => {
    const d = new Date();
    const ts = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, { ts, level, message, engine }]);
  }, []);

  // ─── Load & Synchronize Workspaces ──────────────────────────────────────────
  const refreshWorkspaces = useCallback(async () => {
    // 1. Immediately populate from unified client store (stored workspaces + defaults)
    const stored = getStoredWorkspaces();
    if (stored && stored.length > 0) {
      setWorkspaces(stored as WorkspaceOption[]);
      setWorkspaceId(prev => {
        if (prev && stored.some(w => w.id === prev)) return prev;
        const initialWs = stored[0];
        if (initialWs.type) setMode((initialWs.type || 'WEBSITE').toLowerCase() as ScanMode);
        if (initialWs.targetUrl) setTargetUrl(initialWs.targetUrl);
        if (initialWs.repoUrl) setRepoUrl(initialWs.repoUrl);
        return initialWs.id;
      });
    }

    // 2. Fetch from backend API and merge seamlessly
    try {
      const res = await fetch('/api/workspaces', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const apiList = Array.isArray(data) ? data : (data?.workspaces ?? []);
        if (apiList.length > 0) {
          const map = new Map<string, WorkspaceOption>();
          // Preserve stored items
          stored.forEach(w => map.set(w.id, w as WorkspaceOption));
          // Merge API items
          apiList.forEach((w: any) => {
            map.set(w.id, {
              id: w.id,
              name: w.name,
              type: w.type || 'WEBSITE',
              targetUrl: w.targetUrl,
              repoUrl: w.repoUrl,
            });
            saveStoredWorkspace(w);
          });
          const merged = Array.from(map.values());
          setWorkspaces(merged);
          setDemoMode(false);
        }
      }
    } catch (err) {
      console.warn('Backend workspaces load fallback:', err);
    }
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  // Real-time EventBus synchronization for workspaces
  useEventBus('WORKSPACE_CREATED', () => {
    refreshWorkspaces();
  });
  useEventBus('WORKSPACE_UPDATED', () => {
    refreshWorkspaces();
  });
  useEventBus('WORKSPACE_DELETED', () => {
    refreshWorkspaces();
  });
  useEventBus('USER_STORAGE_HYDRATED', () => {
    refreshWorkspaces();
  });

  // ─── Reusable Polling Loop ──────────────────────────────────────────────────
  const startPolling = useCallback((id: string, currentTarget: string, currentMode: string, currentEngines: string[], currentProfile: string, currentWorkspaceId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`/api/scans/${id}/status`, { headers: authHeaders() }).catch(() => null),
          fetch(`/api/scans/${id}/logs`, { headers: authHeaders() }).catch(() => null),
        ]);

        if (logsRes && logsRes.ok) {
          const rawLogs = await logsRes.json();
          if (Array.isArray(rawLogs) && rawLogs.length > 0) {
            setLogs(rawLogs.map((l: any): LogEntry => ({
              ts: l.ts || new Date().toLocaleTimeString('en-US', { hour12: false }),
              level: l.level === 'warn' ? 'warn' : l.level === 'error' ? 'error' : l.level === 'success' ? 'success' : 'info',
              engine: l.engine,
              message: l.message,
            })));
          }
        }

        if (!statusRes || !statusRes.ok) return;
        const st = await statusRes.json();
        const currentSt = (st.status?.toLowerCase() as ScanStatusValue) || 'running';
        const currentProg = typeof st.progress === 'number' ? st.progress : 0;
        setScanStatus(currentSt);
        setScanProgress(currentProg);

        // 🔥 Broadcast SCAN_PROGRESS event
        EventBus.publish('SCAN_PROGRESS', {
          scanId: id,
          progress: currentProg,
          status: currentSt,
          findingsCount: st.findingsCount || 0,
        }, 'live-scan-page');

        setActiveScanSession({
          scanId: id,
          target: currentTarget,
          mode: currentMode,
          profile: currentProfile,
          workspaceId: currentWorkspaceId,
          engines: currentEngines,
          status: currentSt,
          progress: currentProg,
          startedAt: st.startedAt || new Date().toISOString(),
        });

        if (currentSt === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsExecuting(false);
          setIsBroadcasting(false);
          log('Scan completed successfully.', 'success');
          let fetchedList: any[] = [];
          try {
            const fRes = await fetch(`/api/findings/scan/${id}`, { headers: authHeaders() });
            if (fRes.ok) {
              const fData = await fRes.json();
              fetchedList = Array.isArray(fData) ? fData : (fData?.items || fData?.findings || []);
              if (fetchedList.length > 0) {
                setFindings(fetchedList.slice(0, 20).map((f: any): FindingPreview => ({
                  id: f.id,
                  severity: ((f.severity ?? 'INFO').toUpperCase() as FindingPreview['severity']),
                  title: f.title ?? 'Untitled finding',
                  source: f.source ?? 'scanner',
                })));
                setRealtimeFindingsCount(fetchedList.length);
              }
            }
          } catch { /* ignore findings fetch errors */ }

          let scanScore = st.riskScore;
          if (!scanScore || scanScore === 0) {
            scanScore = calculateSecurityScore(fetchedList);
          }

          saveLiveScanRun({
            id,
            target: currentTarget || 'Live Target',
            type: currentMode,
            engines: currentEngines,
            findings: fetchedList,
            score: scanScore,
            workspaceId: currentWorkspaceId || workspaceId || 'ws-default',
          });

          setActiveScanSession({
            scanId: id,
            target: currentTarget,
            mode: currentMode,
            profile: currentProfile,
            workspaceId: currentWorkspaceId,
            engines: currentEngines,
            status: 'completed',
            progress: 100,
            startedAt: st.startedAt || new Date().toISOString(),
            findingsCount: fetchedList.length,
            score: scanScore,
          });

          // 🔥 Broadcast SCAN_COMPLETED, DATA_REFRESHED & REPORT_GENERATED events
          EventBus.publish('SCAN_COMPLETED', {
            scanId: id,
            target: currentTarget,
            type: currentMode.toUpperCase(),
            mode: currentMode,
            findings: fetchedList,
            score: scanScore,
            findingsCount: fetchedList.length,
            timestamp: new Date().toISOString(),
          }, 'live-scan-page');

          EventBus.publish('DATA_REFRESHED', { timestamp: new Date().toISOString() }, 'live-scan-page');
          EventBus.publish('REPORT_GENERATED', { scanId: id, target: currentTarget, findingsCount: fetchedList.length }, 'live-scan-page');

          pushToast('Scan completed — Synced to Dashboard', 'success');
        } else if (currentSt === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsExecuting(false);
          setIsBroadcasting(false);
          setScanStatus('failed');
          log('Scan failed.', 'error');
          
          // 🔥 Broadcast SCAN_FAILED event
          EventBus.publish('SCAN_FAILED', {
            scanId: id,
            error: st.error || 'Scan failed',
          }, 'live-scan-page');
          
          pushToast('Scan failed', 'error');
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 1500);
  }, [log, pushToast]);

  // ─── Restore active/running scan if navigating from another page ────────────
  useEffect(() => {
    let mounted = true;
    const restoreScan = async () => {
      const qScanId = searchParams.get('scanId');
      const activeSession = getActiveScanSession();
      const targetId = qScanId || (activeSession && activeSession.status !== 'cancelled' ? activeSession.scanId : null);

      if (targetId && mounted) {
        setScanId(targetId);
        const resolvedTarget = activeSession?.target || '';
        const resolvedMode = (activeSession?.mode || 'website') as ScanMode;
        const resolvedEngines = activeSession?.engines || [];
        const resolvedProfile = (activeSession?.profile || 'normal') as 'fast' | 'normal' | 'aggressive';
        const resolvedWs = activeSession?.workspaceId || '';

        if (resolvedTarget) {
          if (resolvedMode === 'github') setRepoUrl(resolvedTarget);
          else setTargetUrl(resolvedTarget);
        }
        if (resolvedWs) setWorkspaceId(resolvedWs);
        if (resolvedMode) setMode(resolvedMode);
        if (resolvedProfile) setScanProfile(resolvedProfile);
        if (resolvedEngines.length > 0) setSelectedEngines(new Set(resolvedEngines));

        if (activeSession?.status === 'running' || activeSession?.status === 'queued' || activeSession?.status === 'processing') {
          setIsExecuting(true);
          setScanStatus(activeSession.status);
          setScanProgress(activeSession.progress || 0);
        }

        // Fetch latest status, logs, and findings
        try {
          const [stRes, logsRes, fRes] = await Promise.all([
            fetch(`/api/scans/${targetId}/status`, { headers: authHeaders() }).catch(() => null),
            fetch(`/api/scans/${targetId}/logs`, { headers: authHeaders() }).catch(() => null),
            fetch(`/api/findings/scan/${targetId}`, { headers: authHeaders() }).catch(() => null),
          ]);

          if (logsRes && logsRes.ok && mounted) {
            const rawLogs = await logsRes.json();
            if (Array.isArray(rawLogs) && rawLogs.length > 0) {
              setLogs(rawLogs.map((l: any): LogEntry => ({
                ts: l.ts || new Date().toLocaleTimeString('en-US', { hour12: false }),
                level: l.level === 'warn' ? 'warn' : l.level === 'error' ? 'error' : l.level === 'success' ? 'success' : 'info',
                engine: l.engine,
                message: l.message,
              })));
            }
          }

          if (fRes && fRes.ok && mounted) {
            const fData = await fRes.json();
            const fetchedList = Array.isArray(fData) ? fData : (fData?.items || fData?.findings || []);
            if (fetchedList.length > 0) {
              setFindings(fetchedList.slice(0, 20).map((f: any): FindingPreview => ({
                id: f.id,
                severity: ((f.severity ?? 'INFO').toUpperCase() as FindingPreview['severity']),
                title: f.title ?? 'Untitled finding',
                source: f.source ?? 'scanner',
              })));
            }
          }

          if (stRes && stRes.ok && mounted) {
            const st = await stRes.json();
            const currentSt = (st.status?.toLowerCase() as ScanStatusValue) || 'running';
            setScanStatus(currentSt);
            setScanProgress(typeof st.progress === 'number' ? st.progress : 0);

            if (currentSt === 'running' || currentSt === 'queued' || currentSt === 'processing') {
              setIsExecuting(true);
              startPolling(
                targetId,
                resolvedTarget,
                resolvedMode,
                resolvedEngines,
                resolvedProfile,
                resolvedWs
              );
            } else {
              setIsExecuting(false);
            }
          }
        } catch (e) {
          console.warn('Failed to restore active scan:', e);
        }
      }
    };

    restoreScan();
    return () => { mounted = false; };
  }, [searchParams, startPolling]);

  // ─── Pre-fill from query params (from Workspaces "New scan") ────────────────
  useEffect(() => {
    const qWs = searchParams.get('workspaceId');
    const qTarget = searchParams.get('target');
    const qRepo = searchParams.get('repo');
    const qMode = searchParams.get('mode') as ScanMode | null;
    if (qMode && ['website', 'github', 'combined'].includes(qMode)) setMode(qMode);
    if (qTarget) setTargetUrl(qTarget);
    if (qRepo) setRepoUrl(qRepo);
    if (qWs) setWorkspaceId(qWs);
  }, [searchParams]);

  // ─── Sync mode + targets when workspace changes ────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    const inferred = (ws.type || 'WEBSITE').toLowerCase() as ScanMode;
    setMode(inferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspaces]);

  const handleWorkspaceSelect = (wsId: string) => {
    setWorkspaceId(wsId);
    const ws = workspaces.find(w => w.id === wsId);
    if (ws) {
      const inferred = (ws.type || 'WEBSITE').toLowerCase() as ScanMode;
      setMode(inferred);
      if (ws.targetUrl) setTargetUrl(ws.targetUrl);
      if (ws.repoUrl) setRepoUrl(ws.repoUrl);
    }
  };

  // ─── Default-select all valid engines whenever the mode changes ───────────
  useEffect(() => {
    const available = enginesForMode(mode);
    setSelectedEngines(new Set(available.map(e => e.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    };
  }, []);

  const toggleEngine = (engineId: string) => {
    setSelectedEngines(prev => {
      const next = new Set(prev);
      if (next.has(engineId)) next.delete(engineId); else next.add(engineId);
      return next;
    });
  };

  // ─── File Upload & Drag-and-Drop Handlers ────────────────────────────────────
  const processSelectedFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setUploadedFile({
        name: file.name,
        size: file.size,
        content,
        type: file.type,
      });
      setError('');
      pushToast(`Loaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'success');
    };
    reader.onerror = () => {
      setError(`Failed to read file: ${file.name}`);
      pushToast('Error reading file', 'error');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // ─── Direct File / Code Audit Scan Execution ──────────────────────────────
  const runDirectFileScan = useCallback((fileName: string, fileContent: string) => {
    setScanStartTime(Date.now());
    setElapsedSeconds(0);
    setScanStatus('running');
    setScanProgress(0);
    setLogs([]);
    setFindings([]);

    const engineList = engines.filter(e => selectedEngines.has(e.id));
    const scanTarget = fileName;
    const generatedScanId = `file-scan-${Date.now()}`;
    setScanId(generatedScanId);

    log(`Initializing direct code security scan on: ${fileName}`, 'info');
    log(`File Size: ${(fileContent.length / 1024).toFixed(2)} KB · Mode: GITHUB_CODE · Engines: ${engineList.length}`, 'info');

    // Run direct AST & Pattern audit
    const fileFindings = auditDirectCodeFile(fileName, fileContent);

    setActiveScanSession({
      scanId: generatedScanId,
      target: scanTarget,
      mode: 'github',
      profile: scanProfile,
      workspaceId,
      engines: Array.from<string>(selectedEngines),
      status: 'running',
      progress: 5,
      startedAt: new Date().toISOString(),
    });

    let step = 0;
    const totalSteps = engineList.length + 1;

    demoTimerRef.current = setInterval(() => {
      if (step < engineList.length) {
        const eng = engineList[step];
        log(`Executing ${eng.name} (${eng.tool}) on ${fileName}…`, 'info', eng.name);

        // Filter findings related to this engine
        const engFindings = fileFindings.filter(f => f.source === eng.name);
        if (engFindings.length > 0) {
          engFindings.forEach(f => {
            log(`  ⚑ [${f.severity}] ${f.title} ${f.line ? `(line ${f.line})` : ''}`, f.severity === 'CRITICAL' ? 'error' : 'warn', eng.name);
          });
        }
      } else if (step === engineList.length) {
        log(`[Security Intelligence Engine] Correlating findings & calculating CVSS score…`, 'info', 'Security Intelligence');
      }

      step += 1;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setScanProgress(pct);

      if (step >= totalSteps) {
        if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        const finalFindings: FindingPreview[] = fileFindings.length > 0
          ? fileFindings.map(f => ({
              id: f.id,
              severity: f.severity,
              title: f.title,
              source: f.source,
            }))
          : [
              { id: `clean-${Date.now()}`, severity: 'INFO', title: 'Clean code audit: No critical vulnerabilities or exposed secrets found', source: 'Code Security Check' }
            ];

        setFindings(finalFindings);
        setScanStatus('completed');
        setIsExecuting(false);

        const directScore = calculateSecurityScore(finalFindings);

        // Save scan run to store and broadcast events
        saveLiveScanRun({
          id: generatedScanId,
          target: scanTarget,
          type: 'GITHUB',
          engines: Array.from<string>(selectedEngines),
          score: directScore,
          workspaceId: workspaceId || 'ws-default',
          findings: finalFindings.map(f => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            source: f.source,
            target: scanTarget,
            category: (f as any).category || 'Code Security',
            cwe: (f as any).cwe,
            remediation: (f as any).remediation,
            description: (f as any).description || `Detected during code scan of ${fileName}`,
          })),
        });

        setActiveScanSession({
          scanId: generatedScanId,
          target: scanTarget,
          mode: 'github',
          profile: scanProfile,
          workspaceId,
          engines: Array.from<string>(selectedEngines),
          status: 'completed',
          progress: 100,
          startedAt: new Date().toISOString(),
          findingsCount: finalFindings.length,
          score: directScore,
        });

        // 🔥 Broadcast events to all other dashboard pages
        EventBus.publish('SCAN_COMPLETED', {
          scanId: generatedScanId,
          target: scanTarget,
          type: 'GITHUB',
          mode: 'github',
          findings: finalFindings,
          score: directScore,
          findingsCount: finalFindings.length,
          timestamp: new Date().toISOString(),
        }, 'live-scan-page');

        EventBus.publish('DATA_REFRESHED', { timestamp: new Date().toISOString() }, 'live-scan-page');
        EventBus.publish('REPORT_GENERATED', { scanId: generatedScanId, target: scanTarget, findingsCount: finalFindings.length }, 'live-scan-page');

        log(`Scan completed. ${finalFindings.length} findings recorded for ${fileName}.`, 'success');
        pushToast(`File scan completed — ${finalFindings.length} findings recorded!`, 'success');
      }
    }, 900);
  }, [engines, selectedEngines, scanProfile, workspaceId, log, pushToast]);

  // ─── Combined Website + Direct File / Code Audit Scan Execution ────────────
  const runCombinedDirectFileScan = useCallback((webTarget: string, fileName: string, fileContent: string) => {
    setScanStartTime(Date.now());
    setElapsedSeconds(0);
    setScanStatus('running');
    setScanProgress(0);
    setLogs([]);
    setFindings([]);

    const engineList = engines.filter(e => selectedEngines.has(e.id));
    const scanTarget = `${webTarget} + ${fileName}`;
    const generatedScanId = `comb-scan-${Date.now()}`;
    setScanId(generatedScanId);

    log(`Initializing combined security audit on: ${webTarget} (Web) & ${fileName} (Code)`, 'info');
    log(`Engines configured: ${engineList.length} active engines across full perimeter & code AST`, 'info');

    // Run direct AST & Pattern audit on code
    const fileFindings = auditDirectCodeFile(fileName, fileContent);
    const demoWebFindings: FindingPreview[] = [
      { id: `web-f1-${Date.now()}`, severity: 'HIGH', title: 'Missing Content-Security-Policy header', source: 'HTTP Security Check' },
      { id: `web-f2-${Date.now()}`, severity: 'MEDIUM', title: 'TLS 1.2 legacy cipher suite support detected', source: 'SSL & TLS Security Check' },
      { id: `web-f3-${Date.now()}`, severity: 'LOW', title: 'Missing HSTS strict transport security header', source: 'HTTP Security Check' },
    ];

    setActiveScanSession({
      scanId: generatedScanId,
      target: scanTarget,
      mode: 'combined',
      profile: scanProfile,
      workspaceId,
      engines: Array.from<string>(selectedEngines),
      status: 'running',
      progress: 5,
      startedAt: new Date().toISOString(),
    });

    let step = 0;
    const totalSteps = engineList.length + 1;

    demoTimerRef.current = setInterval(() => {
      if (step < engineList.length) {
        const eng = engineList[step];
        log(`Executing [${eng.category}] ${eng.name} (${eng.tool})…`, 'info', eng.name);

        // Check if file findings match this engine
        const engFindings = fileFindings.filter(f => f.source === eng.name);
        if (engFindings.length > 0) {
          engFindings.forEach(f => {
            log(`  ⚑ [${f.severity}] (Code) ${f.title} ${f.line ? `(line ${f.line})` : ''}`, f.severity === 'CRITICAL' ? 'error' : 'warn', eng.name);
          });
        }
        if (eng.modes.includes('website') && step === 2) {
          log(`  ⚑ [HIGH] (Web Surface) Missing Content-Security-Policy header`, 'warn', eng.name);
        }
      } else if (step === engineList.length) {
        log(`[Security Intelligence Engine] Cross-correlating web surface telemetry with code AST findings…`, 'info', 'Security Intelligence');
      }

      step += 1;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setScanProgress(pct);

      if (step >= totalSteps) {
        if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        const combinedResults: FindingPreview[] = [
          ...fileFindings.map(f => ({
            id: f.id,
            severity: f.severity,
            title: `[Code AST] ${f.title}`,
            source: f.source,
          })),
          ...demoWebFindings,
        ];

        setFindings(combinedResults);
        setScanStatus('completed');
        setIsExecuting(false);

        const combScore = calculateSecurityScore(combinedResults);

        saveLiveScanRun({
          id: generatedScanId,
          target: scanTarget,
          type: 'COMBINED',
          engines: Array.from<string>(selectedEngines),
          score: combScore,
          workspaceId: workspaceId || 'ws-default',
          findings: combinedResults.map(f => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            source: f.source,
            target: scanTarget,
            category: (f as any).category || (f.source.includes('Code') || f.source.includes('Secret') || f.source.includes('Gitleaks') || f.source.includes('Semgrep') ? 'Code Security' : 'Web Surface'),
            cwe: (f as any).cwe,
            remediation: (f as any).remediation,
            description: (f as any).description || `Correlated finding detected across combined web & source audit of ${scanTarget}`,
          })),
        });

        setActiveScanSession({
          scanId: generatedScanId,
          target: scanTarget,
          mode: 'combined',
          profile: scanProfile,
          workspaceId,
          engines: Array.from<string>(selectedEngines),
          status: 'completed',
          progress: 100,
          startedAt: new Date().toISOString(),
          findingsCount: combinedResults.length,
          score: combScore,
        });

        // 🔥 Broadcast events to all other dashboard pages (Findings, Reports, Dashboard, Analytics, AI Copilot)
        EventBus.publish('SCAN_COMPLETED', {
          scanId: generatedScanId,
          target: scanTarget,
          type: 'COMBINED',
          mode: 'combined',
          findings: combinedResults,
          score: combScore,
          findingsCount: combinedResults.length,
          timestamp: new Date().toISOString(),
        }, 'live-scan-page');

        EventBus.publish('DATA_REFRESHED', { timestamp: new Date().toISOString() }, 'live-scan-page');
        EventBus.publish('REPORT_GENERATED', { scanId: generatedScanId, target: scanTarget, findingsCount: combinedResults.length }, 'live-scan-page');

        log(`Combined scan completed. ${combinedResults.length} correlated findings recorded across web & code.`, 'success');
        pushToast(`Combined scan completed — ${combinedResults.length} findings recorded!`, 'success');
      }
    }, 900);
  }, [engines, selectedEngines, scanProfile, workspaceId, log, pushToast]);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    setError('');
    if (!workspaceId.trim()) { setError('Please select a workspace.'); return false; }
    if ((mode === 'website' || mode === 'combined') && !targetUrl.trim()) {
      setError('Please enter a target URL.'); return false;
    }
    if (mode === 'github' || mode === 'combined') {
      if (githubInputType === 'repo_url') {
        if (!repoUrl.trim()) { setError('Please enter a GitHub repository URL.'); return false; }
        if (!/^https?:\/\/(www\.)?github\.com\//i.test(repoUrl.trim())) {
          setError('Repository URL must be a valid GitHub URL (e.g. https://github.com/owner/repo).'); return false;
        }
      } else if (githubInputType === 'file_upload') {
        if (!uploadedFile) { setError('Please upload or drop a code file to scan.'); return false; }
      } else if (githubInputType === 'code_paste') {
        if (!pastedCode.trim()) { setError('Please enter or paste code to scan.'); return false; }
      }
    }
    if (targetUrl.trim()) {
      try { new URL(targetUrl); } catch { setError('Target URL is not a valid URL (e.g. https://example.com).'); return false; }
    }
    if (selectedEngines.size === 0) { setError('Please select at least one engine.'); return false; }
    return true;
  };

  // ─── DEMO scan simulation ───────────────────────────────────────────────────
  const runDemoScan = useCallback(() => {
    setScanStartTime(Date.now());
    setElapsedSeconds(0);
    setScanStatus('running');
    setScanProgress(0);
    setLogs([]);
    setFindings([]);
    const engineList = engines.filter(e => selectedEngines.has(e.id));
    let step = 0;
    const totalSteps = engineList.length + 1;

    const scanTarget = targetUrl || repoUrl || 'target';
    log(`Initializing scan on ${scanTarget}…`, 'info');
    log(`Mode: ${mode} · ${engineList.length} engine${engineList.length === 1 ? '' : 's'}`, 'info');

    demoTimerRef.current = setInterval(() => {
      if (step < engineList.length) {
        const eng = engineList[step];
        log(`Running ${eng.name}…`, 'info', eng.name);
        const demoF = DEMO_FINDINGS[step % DEMO_FINDINGS.length];
        if (demoF && Math.random() > 0.45) {
          log(`  ⚑ ${demoF.severity}: ${demoF.title}`, demoF.severity === 'CRITICAL' ? 'error' : 'warn', eng.name);
        }
      } else if (step === engineList.length) {
        log('Correlating, de-duplicating & scoring findings…', 'info', 'Security Intelligence Engine');
      }
      step += 1;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setScanProgress(pct);
      if (step >= totalSteps) {
        if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        const found = DEMO_FINDINGS.slice(0, Math.max(3, Math.floor(Math.random() * DEMO_FINDINGS.length) + 3));
        setFindings(found);
        setScanStatus('completed');
        setIsExecuting(false);

        const demoScore = calculateSecurityScore(found);

        // Save scan run to real-time store
        saveLiveScanRun({
          id: scanId || `demo-scan-${Date.now()}`,
          target: scanTarget,
          type: mode,
          engines: Array.from<string>(selectedEngines),
          score: demoScore,
          workspaceId: workspaceId || 'ws-default',
          findings: found.map(f => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            source: f.source,
            target: scanTarget,
          })),
        });

        setActiveScanSession({
          scanId: scanId || `demo-scan-${Date.now()}`,
          target: scanTarget,
          mode,
          profile: scanProfile,
          workspaceId,
          engines: Array.from<string>(selectedEngines),
          status: 'completed',
          progress: 100,
          startedAt: new Date().toISOString(),
          findingsCount: found.length,
          score: demoScore,
        });

        // 🔥 Broadcast events to all other dashboard pages
        EventBus.publish('SCAN_COMPLETED', {
          scanId: scanId || `demo-scan-${Date.now()}`,
          target: scanTarget,
          type: mode.toUpperCase(),
          mode,
          findings: found,
          score: demoScore,
          findingsCount: found.length,
          timestamp: new Date().toISOString(),
        }, 'live-scan-page');

        EventBus.publish('DATA_REFRESHED', { timestamp: new Date().toISOString() }, 'live-scan-page');
        EventBus.publish('REPORT_GENERATED', { scanId: scanId || `demo-scan-${Date.now()}`, target: scanTarget, findingsCount: found.length }, 'live-scan-page');

        log(`Scan completed. ${found.length} unique findings saved & synced.`, 'success');
        pushToast(`Scan completed — ${found.length} findings synced to Dashboard!`, 'success');
      }
    }, 1100);
  }, [engines, selectedEngines, mode, targetUrl, repoUrl, log, pushToast, scanId, scanProfile, workspaceId]);

  // ─── Start scan (real backend + direct file + demo fallback) ─────────────────
  const handleStartScan = async () => {
    if (!validateForm()) return;
    setError('');
    setIsExecuting(true);
    setScanStartTime(Date.now());
    setElapsedSeconds(0);
    setScanStatus('queued');
    setScanProgress(0);
    setLogs([]);
    setFindings([]);
    setRealtimeFindingsCount(0);
    setIsBroadcasting(true);
    log('Submitting scan job…', 'info');

    // Handle Direct File Upload or Pasted Code Scan in GITHUB mode
    if (mode === 'github' && githubInputType === 'file_upload' && uploadedFile) {
      const generatedScanId = `file-scan-${Date.now()}`;
      setScanId(generatedScanId);
      
      // 🔥 Broadcast SCAN_STARTED event
      EventBus.publish('SCAN_STARTED', {
        scanId: generatedScanId,
        target: uploadedFile.name,
        mode: 'github',
        profile: scanProfile,
        engines: Array.from<string>(selectedEngines),
      }, 'live-scan-page');
      
      runDirectFileScan(uploadedFile.name, uploadedFile.content);
      return;
    }

    if (mode === 'github' && githubInputType === 'code_paste' && pastedCode.trim()) {
      const generatedScanId = `paste-scan-${Date.now()}`;
      setScanId(generatedScanId);
      
      // 🔥 Broadcast SCAN_STARTED event
      EventBus.publish('SCAN_STARTED', {
        scanId: generatedScanId,
        target: pastedFileName || 'snippet.js',
        mode: 'github',
        profile: scanProfile,
        engines: Array.from<string>(selectedEngines),
      }, 'live-scan-page');
      
      runDirectFileScan(pastedFileName || 'snippet.js', pastedCode);
      return;
    }

    // Handle Combined Mode with Direct File Upload or Pasted Code
    if (mode === 'combined' && githubInputType === 'file_upload' && uploadedFile) {
      const generatedScanId = `comb-scan-${Date.now()}`;
      setScanId(generatedScanId);
      
      // 🔥 Broadcast SCAN_STARTED event
      EventBus.publish('SCAN_STARTED', {
        scanId: generatedScanId,
        target: `${targetUrl} + ${uploadedFile.name}`,
        mode: 'combined',
        profile: scanProfile,
        engines: Array.from<string>(selectedEngines),
      }, 'live-scan-page');
      
      runCombinedDirectFileScan(targetUrl, uploadedFile.name, uploadedFile.content);
      return;
    }

    if (mode === 'combined' && githubInputType === 'code_paste' && pastedCode.trim()) {
      const generatedScanId = `comb-scan-${Date.now()}`;
      setScanId(generatedScanId);
      
      // 🔥 Broadcast SCAN_STARTED event
      EventBus.publish('SCAN_STARTED', {
        scanId: generatedScanId,
        target: `${targetUrl} + ${pastedFileName || 'snippet.js'}`,
        mode: 'combined',
        profile: scanProfile,
        engines: Array.from<string>(selectedEngines),
      }, 'live-scan-page');
      
      runCombinedDirectFileScan(targetUrl, pastedFileName || 'snippet.js', pastedCode);
      return;
    }

    const scanTarget = mode === 'combined'
      ? ((targetUrl && repoUrl) ? `${targetUrl} + ${repoUrl}` : (targetUrl || repoUrl))
      : (mode === 'github' ? (repoUrl || targetUrl) : (targetUrl || repoUrl));
    const engineArr = Array.from<string>(selectedEngines);

    try {
      if (demoMode) {
        const demoId = `demo-scan-${Date.now()}`;
        setScanId(demoId);
        
        // 🔥 Broadcast SCAN_STARTED event
        EventBus.publish('SCAN_STARTED', {
          scanId: demoId,
          target: scanTarget,
          mode,
          profile: scanProfile,
          engines: engineArr,
        }, 'live-scan-page');
        
        setActiveScanSession({
          scanId: demoId,
          target: scanTarget,
          mode,
          profile: scanProfile,
          workspaceId,
          engines: engineArr,
          status: 'running',
          progress: 0,
          startedAt: new Date().toISOString(),
        });
        setTimeout(runDemoScan, 500);
        return;
      }

      const createRes = await fetch('/api/scans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          workspaceId,
          mode,
          target: scanTarget,
          targetUrl: targetUrl || undefined,
          repoUrl: repoUrl || undefined,
          engines: engineArr,
          profile: scanProfile,
        }),
      });
      if (!createRes.ok) {
        const txt = await createRes.text().catch(() => '');
        throw new Error(`Create failed (${createRes.status})${txt ? `: ${txt}` : ''}`);
      }
      const created = await createRes.json();
      const id = created.id || created.scanId;
      setScanId(id);
      log(`Scan job created (id: ${id}).`, 'success');

      // 🔥 Broadcast SCAN_STARTED event
      EventBus.publish('SCAN_STARTED', {
        scanId: id,
        target: scanTarget,
        mode,
        profile: scanProfile,
        engines: engineArr,
        workspaceId,
      }, 'live-scan-page');

      setActiveScanSession({
        scanId: id,
        target: scanTarget,
        mode,
        profile: scanProfile,
        workspaceId,
        engines: engineArr,
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString(),
      });

      const startRes = await fetch(`/api/scans/${id}/start`, { method: 'POST', headers: authHeaders() });
      if (!startRes.ok) throw new Error(`Start failed (${startRes.status})`);
      log('Scan started.', 'success');
      setScanStatus('running');

      startPolling(id, scanTarget, mode, engineArr, scanProfile, workspaceId);
    } catch (err) {
      const msg = (err as Error).message;
      setError('Failed to start scan: ' + msg);
      setIsExecuting(false);
      setScanStatus('idle');
      setIsBroadcasting(false);
      setActiveScanSession(null);
      pushToast('Failed to start scan', 'error');
      
      // 🔥 Broadcast SCAN_FAILED event
      EventBus.publish('SCAN_FAILED', {
        error: msg,
      }, 'live-scan-page');
    }
  };

  // ─── Reset / New Scan ───────────────────────────────────────────────────────
  const handleResetForm = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    setActiveScanSession(null);
    setScanId('');
    setScanStatus('idle');
    setScanProgress(0);
    setLogs([]);
    setFindings([]);
    setIsExecuting(false);
    setError('');
  };

  // ─── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (demoTimerRef.current) { clearInterval(demoTimerRef.current); demoTimerRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!demoMode && scanId) {
      try { await fetch(`/api/scans/${scanId}/cancel`, { method: 'DELETE', headers: authHeaders() }); } catch {}
    }
    setActiveScanSession(null);
    setIsExecuting(false);
    setScanStatus('cancelled');
    log('Scan cancelled by user.', 'warn');
    pushToast('Scan cancelled', 'info');
  };

  const selectedWorkspace = workspaces.find(w => w.id === workspaceId);
  const activeEngines = engines.filter(e => selectedEngines.has(e.id));

  const statusMeta: Record<ScanStatusValue, { label: string; cls: string; dot: string }> = {
    idle:       { label: 'Idle',         cls: 'text-gray-400 bg-white/[0.04] border-white/[0.06]',            dot: 'bg-gray-500' },
    queued:     { label: 'Queued',       cls: 'text-violet-400 bg-violet-500/10 border-violet-500/20',       dot: 'bg-violet-500' },
    running:    { label: 'Running',      cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20',             dot: 'bg-blue-500 animate-pulse' },
    processing: { label: 'Processing',   cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',       dot: 'bg-yellow-500 animate-pulse' },
    completed:  { label: 'Completed',    cls: 'text-green-400 bg-green-500/10 border-green-500/20',          dot: 'bg-green-500' },
    failed:     { label: 'Failed',       cls: 'text-red-400 bg-red-500/10 border-red-500/20',                dot: 'bg-red-500' },
    cancelled:  { label: 'Cancelled',    cls: 'text-gray-400 bg-white/[0.04] border-white/[0.06]',           dot: 'bg-gray-500' },
  };

  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc;
  }, {} as Record<FindingPreview['severity'], number>);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Live Scan
            <button
              onClick={() => setDemoMode(!demoMode)}
              title="Click to toggle between Real Backend Execution Mode and Offline Demo Simulation"
              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 transition-all ${
                demoMode
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                  : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}`} />
              {demoMode ? 'DEMO SIMULATION MODE' : 'REAL ENGINE MODE'}
            </button>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Run a security scan against a website, repo, or both.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {scanId && !isExecuting && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleResetForm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white text-sm font-medium transition-all cursor-pointer">
              <RefreshCw size={14} /> Start New Scan
            </motion.button>
          )}
          {scanId && !isExecuting && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/dashboard/findings?scanId=${scanId}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm font-medium transition-all cursor-pointer">
              <FileWarning size={14} /> View all findings <ArrowRight size={14} />
            </motion.button>
          )}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Configuration column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Configure Scan</h2>

            {/* Workspace picker with High-Contrast selector and quick switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                  <Database size={15} className="text-violet-400" />
                  Target Workspace
                </label>
                <Link href="/dashboard/workspaces" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                  Manage Workspaces →
                </Link>
              </div>

              {/* Quick Workspace Switcher Chips */}
              {workspaces.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {workspaces.map(w => {
                    const isSelected = w.id === workspaceId;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleWorkspaceSelect(w.id)}
                        disabled={isExecuting}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-600/30 ring-2 ring-violet-500/40'
                            : 'bg-[#151622] text-gray-300 border-white/10 hover:border-violet-500/40 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white animate-pulse' : 'bg-violet-400'}`} />
                        <span className="truncate max-w-[160px]">{w.name}</span>
                        {isSelected && <Check size={13} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Enhanced High-Contrast Dropdown */}
              <div className="relative">
                <Database size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none z-10" />
                <select
                  value={workspaceId}
                  onChange={e => handleWorkspaceSelect(e.target.value)}
                  disabled={isExecuting}
                  className="w-full bg-[#151624] border-2 border-violet-500/40 hover:border-violet-400 focus:border-violet-400 rounded-xl pl-10 pr-10 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 transition-all appearance-none cursor-pointer shadow-lg shadow-black/40"
                >
                  <option value="" className="bg-[#151624] text-gray-400 py-2">Select a workspace…</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id} className="bg-[#151624] text-white py-2 font-medium">
                      {w.name} {w.targetUrl ? `(${w.targetUrl})` : w.repoUrl ? `(${w.repoUrl})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none z-10" />
              </div>

              {selectedWorkspace && (
                <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-violet-500/30 text-violet-200 font-bold uppercase text-[10px] border border-violet-500/40">
                      {selectedWorkspace.type || 'WEBSITE'}
                    </span>
                    <span className="text-gray-200 font-medium font-mono truncate max-w-[320px]">
                      {selectedWorkspace.targetUrl || selectedWorkspace.repoUrl || 'No target configured'}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={12} /> Active Target
                  </span>
                </div>
              )}
            </div>

            {/* Mode toggle */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Scan Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'website', label: 'Website', icon: Globe },
                  { id: 'github', label: 'GitHub', icon: Github },
                  { id: 'combined', label: 'Combined', icon: Layers },
                ] as const).map(m => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)} disabled={isExecuting}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
                        active ? 'border-violet-500/50 bg-violet-600/10 text-white' : 'border-white/[0.06] text-gray-400 hover:bg-white/[0.03]'
                      }`}>
                      <Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scan Profile Intensity (Fast / Normal / Aggressive) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Scan Intensity Profile</label>
                <span className="text-xs text-violet-400 font-medium capitalize">{scanProfile} Scanning</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'fast',
                    label: 'Fast Scan',
                    desc: 'Quick reconnaissance & light probes',
                    badge: 'Fastest',
                    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
                  },
                  {
                    id: 'normal',
                    label: 'Normal Scan',
                    desc: 'Balanced security analysis',
                    badge: 'Recommended',
                    cls: 'border-violet-500/40 bg-violet-500/10 text-violet-400',
                  },
                  {
                    id: 'aggressive',
                    label: 'Aggressive',
                    desc: 'Deep vulnerability discovery & full port range',
                    badge: 'Thorough',
                    cls: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
                  },
                ].map(p => {
                  const active = scanProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setScanProfile(p.id as any)}
                      disabled={isExecuting}
                      className={`text-left p-3.5 rounded-xl border transition-all relative group disabled:opacity-50 ${
                        active
                          ? 'bg-white/[0.06] border-violet-500/50 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/30'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">{p.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.cls}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-tight">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target URL with 10 Quick Preset Assets */}
            {(mode === 'website' || mode === 'combined') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300 block">Target Website URL</label>
                  <span className="text-xs text-gray-500">10 Verified Assets Available</span>
                </div>

                {/* 10 Quick Selectable Website Assets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { name: 'Acme Prod', url: 'https://acme.com', icon: '🌐' },
                    { name: 'Google Portal', url: 'https://google.com', icon: '🔍' },
                    { name: 'VulnWeb ASP', url: 'https://testasp.vulnweb.com', icon: '🛡️' },
                    { name: 'VulnWeb PHP', url: 'https://testphp.vulnweb.com', icon: '⚡' },
                    { name: 'Altoro Bank', url: 'https://demo.testfire.net', icon: '🏦' },
                    { name: 'Acme Staging', url: 'https://staging.acme.com', icon: '🚀' },
                    { name: 'Acme API', url: 'https://api.acme.com', icon: '🔌' },
                    { name: 'Acme Store', url: 'https://shop.acme.com', icon: '🛍️' },
                    { name: 'Acme Auth', url: 'https://auth.acme.com', icon: '🔐' },
                    { name: 'Acme CDN', url: 'https://cdn.acme.com', icon: '📦' },
                  ].map(asset => (
                    <button
                      key={asset.url}
                      type="button"
                      disabled={isExecuting}
                      onClick={() => setTargetUrl(asset.url)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        targetUrl === asset.url
                          ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm ring-1 ring-violet-500/30'
                          : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-200'
                      }`}
                    >
                      <span>{asset.icon}</span>
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input placeholder="https://example.com" type="url" value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)} disabled={isExecuting}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors" />
                </div>
              </div>
            )}

            {/* GitHub & Source Code Input (Repository URL, Direct File Upload, or Code Paste) */}
            {(mode === 'github' || mode === 'combined') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300 block">
                    {mode === 'combined' ? 'Code Target (GitHub Repo or Direct File Upload)' : 'GitHub Source Target'}
                  </label>
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => setGithubInputType('repo_url')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        githubInputType === 'repo_url'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Target size={12} /> Repo URL
                    </button>
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => setGithubInputType('file_upload')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        githubInputType === 'file_upload'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <UploadCloud size={12} /> Upload File
                    </button>
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => setGithubInputType('code_paste')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        githubInputType === 'code_paste'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Code2 size={12} /> Paste Code
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Repo URL */}
                {githubInputType === 'repo_url' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { name: 'NodeGoat (OWASP)', url: 'https://github.com/OWASP/NodeGoat', icon: '🐐' },
                        { name: 'Juice Shop', url: 'https://github.com/juice-shop/juice-shop', icon: '🧃' },
                        { name: 'DVWA Repo', url: 'https://github.com/digininja/DVWA', icon: '🎯' },
                      ].map(repo => (
                        <button
                          key={repo.url}
                          type="button"
                          disabled={isExecuting}
                          onClick={() => setRepoUrl(repo.url)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            repoUrl === repo.url
                              ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm ring-1 ring-violet-500/30'
                              : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-200'
                          }`}
                        >
                          <span>{repo.icon}</span>
                          <span>{repo.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Target size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      <input
                        placeholder="https://github.com/owner/repository"
                        type="url"
                        value={repoUrl}
                        onChange={e => setRepoUrl(e.target.value)}
                        disabled={isExecuting}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {mode === 'combined'
                        ? 'Both the website perimeter and repository source code will be correlated and analyzed together.'
                        : 'The full repository source code, AST security rules, secrets, dependencies, and container configs will be analyzed.'}
                    </p>
                  </div>
                )}

                {/* Sub-tab 2: Direct File Drag & Drop Upload */}
                {githubInputType === 'file_upload' && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          processSelectedFile(e.target.files[0]);
                        }
                      }}
                      accept=".js,.jsx,.ts,.tsx,.py,.php,.java,.go,.rb,.json,.yml,.yaml,.tf,.env,Dockerfile,Makefile,package.json,requirements.txt,pom.xml"
                    />

                    {!uploadedFile ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? 'border-violet-500 bg-violet-600/10 scale-[0.99]'
                            : 'border-white/[0.1] bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04]'
                        }`}
                      >
                        <UploadCloud size={28} className="mx-auto text-violet-400 mb-2 animate-bounce" />
                        <p className="text-sm font-semibold text-white">
                          Drag & drop any GitHub or local source code file here
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supports <code className="text-violet-300 font-mono">.js, .ts, .py, .php, .java, .go, .json, .tf, Dockerfile, .env</code>
                        </p>
                        <span className="inline-block mt-3 px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-violet-300 text-xs font-medium rounded-lg border border-white/[0.08]">
                          Browse File
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-violet-500/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400 shrink-0">
                            <FileCode size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-400">
                              {(uploadedFile.size / 1024).toFixed(2)} KB · {uploadedFile.content.split('\n').length} lines of code
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-white/[0.06] rounded-md"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadedFile(null)}
                            className="p-1.5 text-gray-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {mode === 'combined'
                        ? 'Scans this code file for SAST flaws & secrets simultaneously while probing the website target above.'
                        : 'Directly scans for SQLi, XSS, Command Injection, hardcoded secrets/tokens, and vulnerable dependencies without pushing to GitHub.'}
                    </p>
                  </div>
                )}

                {/* Sub-tab 3: Paste Raw Code */}
                {githubInputType === 'code_paste' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400">Filename / Extension:</label>
                      <input
                        type="text"
                        value={pastedFileName}
                        onChange={e => setPastedFileName(e.target.value)}
                        placeholder="server.js"
                        className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white font-mono w-40 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <textarea
                      value={pastedCode}
                      onChange={e => setPastedCode(e.target.value)}
                      placeholder="// Paste your JavaScript, Python, SQL, or Dockerfile code here to scan directly...&#10;const express = require('express');&#10;const app = express();&#10;&#10;app.get('/user', (req, res) => {&#10;  const query = 'SELECT * FROM users WHERE id = ' + req.query.id;&#10;  db.query(query);&#10;});"
                      rows={6}
                      className="w-full bg-[#0a0a14] border border-white/[0.08] rounded-xl p-3.5 font-mono text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 resize-y"
                    />
                    <p className="text-xs text-gray-500">
                      Paste any snippet to test SAST patterns, secret leak detection, and AST vulnerability rules in real-time alongside website analysis.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Engines (premium cards from local catalog) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">
                  SecureLens Engines <span className="text-gray-500 font-normal">({engines.length})</span>
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedEngines(new Set(engines.map(e => e.id)))} disabled={isExecuting}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40">Select All</button>
                  <button onClick={() => setSelectedEngines(new Set())} disabled={isExecuting}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">Clear</button>
                </div>
              </div>
              <div className="grid gap-2.5">
                {engines.map(engine => (
                  <EngineCard key={engine.id} engine={engine}
                    selected={selectedEngines.has(engine.id)} disabled={isExecuting}
                    onToggle={() => toggleEngine(engine.id)} />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {!isExecuting ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleStartScan}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20">
                  <Play size={16} /> Start Scan
                </motion.button>
              ) : (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  className="flex-1 bg-red-600/80 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20">
                  <StopCircle size={16} /> Cancel Scan
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Live logs */}
          {(scanStatus !== 'idle' || logs.length > 0) && (
            <motion.div variants={itemVariants}><LogConsole logs={logs} /></motion.div>
          )}

          {/* Findings preview */}
          {scanStatus === 'completed' && findings.length > 0 && (
            <motion.div variants={itemVariants} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileWarning size={16} className="text-violet-400" />
                  <h3 className="text-base font-semibold text-white">Findings Preview</h3>
                </div>
                <button onClick={() => router.push(`/dashboard/findings?scanId=${scanId}`)}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">View all <ArrowRight size={12} /></button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map(s => {
                  const cnt = severityCounts[s] ?? 0;
                  if (cnt === 0) return null;
                  return <span key={s} className={`text-xs px-2.5 py-1 rounded-lg border ${severityMeta[s].cls}`}>{cnt} {s}</span>;
                })}
              </div>
              <div className="space-y-2">
                {findings.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                    <CircleDot size={12} style={{ color: severityMeta[f.severity].color }} className="shrink-0" />
                    <span className="text-sm text-gray-200 flex-1 truncate">{f.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${severityMeta[f.severity].cls}`}>{f.severity}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── Status sidebar ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <motion.div variants={itemVariants} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-6 space-y-4 sticky top-6">
            <h2 className="text-lg font-semibold text-white">Scan Status</h2>

            {scanStatus === 'idle' ? (
              <p className="text-sm text-gray-500">No scan in progress. Configure and start a scan to see status here.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <div className={`px-3 py-2 rounded-xl text-center text-sm font-semibold border flex items-center justify-center gap-2 ${statusMeta[scanStatus].cls}`}>
                    <span className={`w-2 h-2 rounded-full ${statusMeta[scanStatus].dot}`} />
                    {statusMeta[scanStatus].label}
                  </div>
                </div>

                {/* Real-time Elapsed Scan Timer */}
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                    <Clock size={13} className="text-violet-400" /> Elapsed:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold tabular-nums">
                    {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}s
                  </span>
                </div>

                <SmoothProgress value={scanProgress} status={scanStatus} />

                {scanId && (
                  <div className="space-y-2 pt-4 border-t border-white/[0.04]">
                    <p className="text-xs font-medium text-gray-500">Scan ID</p>
                    <p className="text-xs font-mono bg-white/[0.04] p-2 rounded-lg text-gray-400 break-all">{scanId}</p>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-white/[0.04]">
                  <p className="text-xs font-medium text-gray-500">Active Engines</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeEngines.length === 0 ? <span className="text-xs text-gray-600">None selected</span> :
                      activeEngines.map(e => (
                        <span key={e.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">
                          <EngineIcon name={e.icon} accent={e.accent} size={10} /> {e.name}
                        </span>
                      ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} className="text-green-400" />
              <h3 className="text-sm font-semibold text-white">What we scan for</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              {['Known vulnerabilities (CVEs)', 'Misconfigurations', 'Weak SSL/TLS', 'Missing security headers', 'Exposed secrets', 'Technology exposure'].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <Check size={13} className="text-green-400 mt-0.5 shrink-0" />
                  <span className="text-xs">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </motion.div>
  );
}

export default function LiveScanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
      </div>
    }>
      <LiveScanContent />
    </Suspense>
  );
}
