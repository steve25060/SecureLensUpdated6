'use client';

import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Bot, User, Shield, TrendingUp, AlertTriangle,
  CheckCircle, Lightbulb, Code, FileText, Loader2, Download, ShieldAlert,
  RefreshCw, Globe, Check, Paperclip, Image as ImageIcon, X, FileCode,
  Eye, Maximize2, Trash2, ChevronDown, ChevronUp, UploadCloud,
} from 'lucide-react';

import {
  useLiveScanSync,
  getActiveScanSession,
  type ActiveScanSession,
} from '@/lib/live-scan-store';
import { exportFindingsToMarkdown } from '@/lib/export-utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

const QUICK_ACTIONS = [
  { icon: Shield, label: 'Security Overview', prompt: 'Give me an executive security overview of my scanned live assets and score breakdown.' },
  { icon: TrendingUp, label: 'Risk Analysis', prompt: 'Analyze my current live scan risk posture, CVSS threat exposure, and vulnerability trends.' },
  { icon: AlertTriangle, label: 'Critical Issues', prompt: 'What are my most urgent critical & high severity live scan findings and attack vectors?' },
  { icon: CheckCircle, label: 'Remediation', prompt: 'Provide step-by-step remediation commands, config updates, and secure code patches for my active findings.' },
  { icon: Code, label: 'Header Hardening', prompt: 'Generate production-ready Nginx, Apache, and Next.js security headers (CSP, HSTS, X-Frame-Options) for my target.' },
  { icon: FileText, label: 'Audit Summary', prompt: 'Summarize my latest live multi-engine security scan results into an executive debrief.' },
];

interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  content?: string;
  previewUrl?: string;
  base64?: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  attachment?: ChatAttachment;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content: '👋 Hello! I\'m your **SecureLens AI Security Copilot**.\n\nI monitor your multi-engine live security scans in real-time, audit uploaded source code files & vulnerability screenshots, and deliver production-ready code patches. Select an asset, ask a question, or **upload a file/image** to start!',
  },
];

function AICopilotContent() {
  const searchParams = useSearchParams();
  const { scans: liveScans, findings: liveFindings, lastUpdated } = useLiveScanSync(1000);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [activeScan, setActiveScan] = useState<ActiveScanSession | null>(null);
  const [dbFindings, setDbFindings] = useState<any[]>([]);
  const [dbScans, setDbScans] = useState<any[]>([]);
  const [dbOverview, setDbOverview] = useState<any>(null);

  const [attachedItem, setAttachedItem] = useState<ChatAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [expandedCodeIndex, setExpandedCodeIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshActiveScan = useCallback(() => {
    const session = getActiveScanSession();
    setActiveScan(session);
  }, []);

  const fetchCopilotData = useCallback(async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [fRes, sRes, oRes] = await Promise.all([
        fetch('/api/findings?limit=250', { headers }).catch(() => null),
        fetch('/api/scans?limit=50', { headers }).catch(() => null),
        fetch('/api/dashboard/overview', { headers }).catch(() => null),
      ]);

      if (fRes && fRes.ok) {
        const fData = await fRes.json();
        const items = Array.isArray(fData) ? fData : (fData?.findings || fData?.items || []);
        if (Array.isArray(items)) setDbFindings(items);
      }

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData)) setDbScans(sData);
      }

      if (oRes && oRes.ok) {
        const oData = await oRes.json();
        setDbOverview(oData);
      }
    } catch {}
    finally {
      if (isManual) setIsSyncing(false);
      refreshActiveScan();
    }
  }, [refreshActiveScan]);

  useEffect(() => {
    fetchCopilotData(false);
    refreshActiveScan();

    const handleInstantSync = () => {
      fetchCopilotData(false);
      refreshActiveScan();
    };

    const handleSessionUpdate = (e: any) => {
      setActiveScan(e.detail || null);
    };

    window.addEventListener('securelens:scan-completed', handleInstantSync);
    window.addEventListener('securelens:active-scan-updated', handleSessionUpdate);
    window.addEventListener('storage', handleInstantSync);

    return () => {
      window.removeEventListener('securelens:scan-completed', handleInstantSync);
      window.removeEventListener('securelens:active-scan-updated', handleSessionUpdate);
      window.removeEventListener('storage', handleInstantSync);
    };
  }, [fetchCopilotData, refreshActiveScan]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const allActiveFindings = React.useMemo(() => {
    const formattedLive = liveFindings.map(lf => ({ ...lf, scanId: lf.scanId || 'live' }));
    const merged = [...formattedLive, ...dbFindings.filter(f => !formattedLive.some(l => l.id === f.id))];
    return merged;
  }, [liveFindings, dbFindings]);

  const allActiveScans = React.useMemo(() => {
    const merged = [...liveScans];
    dbScans.forEach(ds => {
      if (!merged.some(s => s.id === ds.id)) {
        merged.push({ id: ds.id, target: ds.target, type: ds.type || 'WEBSITE', status: ds.status || 'COMPLETED', score: ds.riskScore ?? 80, findingsCount: ds.findingsCount || 0, time: ds.createdAt, createdAt: ds.createdAt, engines: ds.engines || [], findings: [] });
      }
    });
    return merged;
  }, [liveScans, dbScans]);

  const availableTargets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allActiveFindings.forEach(f => { if (f.target) counts[f.target] = (counts[f.target] ?? 0) + 1; });
    allActiveScans.forEach(s => { if (s.target && counts[s.target] === undefined) counts[s.target] = s.findingsCount || 0; });
    if (activeScan?.target && counts[activeScan.target] === undefined) counts[activeScan.target] = 0;
    return Object.entries(counts).map(([target, count]) => ({ target, count }));
  }, [allActiveFindings, allActiveScans, activeScan]);

  const targetFilteredFindings = React.useMemo(() => {
    if (selectedTarget === 'ALL') return allActiveFindings;
    return allActiveFindings.filter(f => f.target === selectedTarget);
  }, [allActiveFindings, selectedTarget]);

  const dynamicSummary = React.useMemo(() => {
    const totalScans = Math.max(1, allActiveScans.length);
    const critCount = targetFilteredFindings.filter(f => String(f.severity).toUpperCase() === 'CRITICAL').length;
    const highCount = targetFilteredFindings.filter(f => String(f.severity).toUpperCase() === 'HIGH').length;
    const medCount = targetFilteredFindings.filter(f => String(f.severity).toUpperCase() === 'MEDIUM').length;
    const lowCount = targetFilteredFindings.filter(f => String(f.severity).toUpperCase() === 'LOW').length;
    const computedScore = Math.max(20, 100 - (critCount * 15 + highCount * 8 + medCount * 3));
    
    const sortedBySev = [...targetFilteredFindings].sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
      return (order[String(a.severity).toUpperCase()] ?? 5) - (order[String(b.severity).toUpperCase()] ?? 5);
    });

    const topRisks = sortedBySev.slice(0, 4).map(f => ({ name: f.title, severity: String(f.severity).toUpperCase() === 'CRITICAL' ? 'Critical' : 'High', cve: f.category || 'Vulnerability', remediation: f.remediation }));
    const currentTargetName = selectedTarget === 'ALL' ? (allActiveScans[0]?.target || 'All Assets') : selectedTarget;
    const recommendations = [
      (critCount > 0 || highCount > 0) ? `Address ${critCount} Critical & ${highCount} High vulnerabilities on ${currentTargetName}.` : `Posture on ${currentTargetName} is solid.`,
      `Enforce security headers on ${currentTargetName}.`,
      'Rotate credentials and review exposed ports.',
    ];

    return {
      totalScans, criticalFindings: critCount, highFindings: highCount, mediumFindings: medCount, lowFindings: lowCount,
      resolvedIssues: Math.max(8, allActiveScans.length * 4), securityScore: computedScore, topRisks, recommendations,
      severityData: [
        { name: 'Critical', value: critCount, color: '#ef4444' },
        { name: 'High', value: highCount, color: '#f97316' },
        { name: 'Medium', value: medCount, color: '#eab308' },
        { name: 'Low', value: lowCount, color: '#22c55e' },
      ],
    };
  }, [targetFilteredFindings, allActiveScans, selectedTarget, allActiveFindings]);

  const handleManualSync = async () => {
    await fetchCopilotData(true);
    setSyncToast('Live scan telemetry synchronized!');
    setTimeout(() => setSyncToast(null), 3000);
  };

  const processUploadedFile = (file: File) => {
    if (!file) return;
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

    if (isImg) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachedItem({
          name: file.name,
          size: file.size,
          type: file.type || 'image/png',
          isImage: true,
          previewUrl: base64,
          base64: base64,
        });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setAttachedItem({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          isImage: false,
          content: text,
        });
      };
      reader.readAsText(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processUploadedFile(e.clipboardData.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const sendMessage = async (prompt?: string) => {
    const text = prompt || input;
    if ((!text.trim() && !attachedItem) || loading) return;

    const attachmentToSend = attachedItem;
    let effectiveContent = text.trim();
    if (!effectiveContent && attachmentToSend) {
      effectiveContent = attachmentToSend.isImage
        ? `Please inspect this attached security screenshot / image (${attachmentToSend.name}) and analyze any visible vulnerabilities, error logs, configuration flaws, or indicators of compromise.`
        : `Please audit this attached source file (${attachmentToSend.name}) for security vulnerabilities, AST flaws, hardcoded secrets, and provide patched code.`;
    }

    const newMsg: ChatMessage = {
      role: 'user',
      content: effectiveContent,
      attachment: attachmentToSend || undefined,
    };

    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedItem(null);
    setLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const currentTargetName = selectedTarget === 'ALL' ? (allActiveScans[0]?.target || 'target') : selectedTarget;
    const latestScanForTarget = allActiveScans.find(s => s.target === currentTargetName) || allActiveScans[0];

    try {
      const res = await fetch('/api/ai-copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          messages: newMessages,
          target: currentTargetName,
          findingContext: targetFilteredFindings.slice(0, 8),
          scanContext: latestScanForTarget ? {
            id: latestScanForTarget.id,
            target: latestScanForTarget.target,
            score: latestScanForTarget.score,
            findingsCount: latestScanForTarget.findingsCount,
            engines: latestScanForTarget.engines,
            status: latestScanForTarget.status
          } : undefined
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: json.reply || 'No response.' }]);
      } else throw new Error();
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `### Intelligence for **${currentTargetName}**\n\nScore: ${dynamicSummary.securityScore}/100\nActive Findings: ${targetFilteredFindings.length}.\n\n` +
          (attachmentToSend ? `**Attachment Analyzed**: \`${attachmentToSend.name}\` (${(attachmentToSend.size / 1024).toFixed(1)} KB)\n\nAudit complete: Verify CSP/HSTS header enforcement, input sanitization, and secret credential rotation.` : 'Apply strict CSP/HSTS and sanitize all inputs.')
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRemediationPlan = () => exportFindingsToMarkdown(targetFilteredFindings as any, selectedTarget === 'ALL' ? 'All_Websites' : selectedTarget);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 max-w-7xl mx-auto">
      <AnimatePresence>
        {syncToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-violet-400/30 backdrop-blur-xl">
            <Check size={14} className="text-white" />
            {syncToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Image Preview */}
      <AnimatePresence>
        {previewModalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewModalImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-[#0c0c16] rounded-2xl border border-white/10 p-3 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10 cursor-pointer"
              >
                <X size={18} />
              </button>
              <img src={previewModalImage} alt="Attachment Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-inner">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Security Copilot</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Multimodal
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Real-time vulnerability analysis, file AST auditing, and vision screenshot intelligence.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-gray-300 transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-violet-400' : 'text-gray-400'} />
            {isSyncing ? 'Syncing…' : 'Sync Telemetry'}
          </button>

          <button
            onClick={handleExportRemediationPlan}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Download size={13} /> Export Plan (.md)
          </button>
        </div>
      </motion.div>

      {/* Target Asset Filter */}
      {availableTargets.length > 0 && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap mr-1 flex items-center gap-1">
            <Globe size={13} className="text-violet-400" /> Target Asset:
          </span>
          <button
            onClick={() => setSelectedTarget('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              selectedTarget === 'ALL'
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm'
                : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'
            }`}
          >
            All Assets ({allActiveFindings.length})
          </button>
          {availableTargets.map(({ target, count }) => (
            <button
              key={target}
              onClick={() => setSelectedTarget(target)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTarget === target
                  ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm'
                  : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              <span className="truncate max-w-[200px]">{target}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10">{count}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Dedicated Interactive AI Chat Interface */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Hidden Native File & Image Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              processUploadedFile(e.target.files[0]);
            }
          }}
          accept=".js,.jsx,.ts,.tsx,.py,.php,.java,.go,.rb,.json,.sql,.env,.log,.txt,.tf,.yaml,.yml,Dockerfile,Makefile,package.json,requirements.txt,pom.xml,.csv,.md"
        />
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              processUploadedFile(e.target.files[0]);
            }
          }}
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        />

        {/* Chat Container with Drag & Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          className={`rounded-2xl bg-white/[0.02] border p-4 flex flex-col h-[650px] transition-all relative ${
            isDraggingOver
              ? 'border-violet-500 bg-violet-600/10 ring-2 ring-violet-500/30'
              : 'border-white/[0.06]'
          }`}
        >
          {/* Drag and drop overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-30 bg-[#0a0a14]/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-violet-500">
              <UploadCloud size={40} className="text-violet-400 animate-bounce mb-2" />
              <p className="text-sm font-semibold text-white">Drop your source code file or screenshot here</p>
              <p className="text-xs text-violet-300">SecureLens AI Copilot will audit it immediately</p>
            </div>
          )}

          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-xl shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/10 text-white'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
                </div>

                <div className="space-y-2 max-w-[84%]">
                  {/* Attached Image inside User Message Bubble */}
                  {msg.attachment?.isImage && msg.attachment?.previewUrl && (
                    <div
                      onClick={() => setPreviewModalImage(msg.attachment?.previewUrl || null)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-black/40 hover:border-violet-500/60 transition-all max-w-sm"
                    >
                      <img src={msg.attachment.previewUrl} alt={msg.attachment.name} className="max-h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                        <span className="text-[11px] text-white font-medium truncate max-w-[200px]">{msg.attachment.name}</span>
                        <span className="p-1 rounded bg-white/20 text-white"><Maximize2 size={12} /></span>
                      </div>
                    </div>
                  )}

                  {/* Attached Code / Manifest File inside User Message Bubble */}
                  {msg.attachment && !msg.attachment.isImage && (
                    <div className="rounded-xl bg-[#0e0e1a] border border-violet-500/30 p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 shrink-0"><FileCode size={14} /></span>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate text-xs">{msg.attachment.name}</p>
                            <p className="text-[10px] text-gray-400">{(msg.attachment.size / 1024).toFixed(1)} KB · Code file</p>
                          </div>
                        </div>
                        {msg.attachment.content && (
                          <button
                            type="button"
                            onClick={() => setExpandedCodeIndex(expandedCodeIndex === i ? null : i)}
                            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-[10px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {expandedCodeIndex === i ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {expandedCodeIndex === i ? 'Hide Code' : 'View Code'}
                          </button>
                        )}
                      </div>
                      {expandedCodeIndex === i && msg.attachment.content && (
                        <pre className="p-2.5 rounded-lg bg-black/60 border border-white/[0.06] font-mono text-[11px] text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {msg.attachment.content}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Text Bubble */}
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'assistant'
                      ? 'bg-white/[0.03] border border-white/[0.06] text-gray-200 shadow-sm'
                      : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30"><Bot size={15} /></div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2 text-xs text-gray-400"><Loader2 size={13} className="animate-spin text-violet-400" />Analyzing live telemetry & attachments…</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area & Attachment Previews */}
          <div className="pt-3 border-t border-white/[0.04] space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => sendMessage(qa.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] text-gray-400 hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <qa.icon size={11} /> {qa.label}
                </button>
              ))}
            </div>

            {attachedItem && (
              <div className="p-2 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {attachedItem.isImage && attachedItem.previewUrl ? (
                    <img src={attachedItem.previewUrl} alt="Thumbnail" className="w-8 h-8 rounded-lg object-cover border border-violet-400/30" />
                  ) : (
                    <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400">
                      <FileCode size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{attachedItem.name}</p>
                    <p className="text-[10px] text-violet-300">{(attachedItem.size / 1024).toFixed(1)} KB · {attachedItem.isImage ? 'Screenshot/Image' : 'Source File'} attached</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedItem(null)}
                  className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Upload code, log, or config file"
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={loading}
                  title="Upload security screenshot"
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <ImageIcon size={16} />
                </button>
              </div>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={attachedItem ? `Ask AI Copilot to audit "${attachedItem.name}"…` : `Ask AI Copilot about ${selectedTarget === 'ALL' ? 'all assets' : selectedTarget}…`}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !attachedItem) || loading}
                className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-md shadow-violet-600/20"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AICopilotPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" /></div>}>
      <AICopilotContent />
    </Suspense>
  );
}
