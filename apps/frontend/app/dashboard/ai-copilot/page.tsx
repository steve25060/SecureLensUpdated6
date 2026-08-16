'use client';

import React, { useState, useRef, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Bot, User, Shield, TrendingUp, AlertTriangle,
  CheckCircle, Lightbulb, Code, FileText, Loader2, Download, ShieldAlert,
  RefreshCw, Globe, Check, Paperclip, Image as ImageIcon, X, FileCode,
  Eye, Maximize2, Trash2, ChevronDown, ChevronUp, UploadCloud, Zap, Activity
} from 'lucide-react';

import {
  useLiveScanSync,
  getActiveScanSession,
  type ActiveScanSession,
} from '@/lib/live-scan-store';
import { useRealtimeSync, useRealtimeFindingEvents, useRealtimeScanEvents } from '@/hooks/useRealtimeSync';
import { exportFindingsToMarkdown } from '@/lib/export-utils';
import ReactMarkdown from 'react-markdown';

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
  provider?: string;
  model?: string;
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
  
  // Real-time synchronization
  const { isLive, eventCount, lastEventType } = useRealtimeSync();
  const { findingAdded, totalFindingsAdded } = useRealtimeFindingEvents();
  const { scanStarted, scanCompleted } = useRealtimeScanEvents();

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

      if (fRes?.ok) {
        const json = await fRes.json();
        setDbFindings(Array.isArray(json) ? json : (json?.items || json?.findings || json?.data || []));
      }
      if (sRes?.ok) {
        const json = await sRes.json();
        setDbScans(Array.isArray(json) ? json : (json?.scans || json?.items || json?.data || []));
      }
      if (oRes?.ok) {
        setDbOverview(await oRes.json());
      }

      if (isManual) {
        setSyncToast('Synced with database');
        setTimeout(() => setSyncToast(null), 2000);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      if (isManual) setIsSyncing(false);
    }
  }, []);

  // Auto-populate context from active scans when new findings arrive
  // (Removed per user request to prevent spamming chat with finding events)


  useEffect(() => {
    refreshActiveScan();
    fetchCopilotData(false);
    const interval = setInterval(() => fetchCopilotData(false), 15000);
    return () => clearInterval(interval);
  }, [refreshActiveScan, fetchCopilotData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle explain and remediate actions passed from Findings page
  useEffect(() => {
    const action = searchParams.get('action');
    const title = searchParams.get('title');
    const severity = searchParams.get('severity');
    const target = searchParams.get('target');
    const cwe = searchParams.get('cwe');

    if (action && title) {
      if (action === 'explain') {
        setInput(`Explain the vulnerability "${title}" (${severity || 'UNKNOWN'} severity) found on target "${target || 'target asset'}"${cwe ? ` (CWE: ${cwe})` : ''}. What is the root cause, attack vector, and threat impact?`);
      } else if (action === 'remediate') {
        setInput(`Provide step-by-step remediation commands, configuration updates, and secure code patches to fix "${title}" (${severity || 'UNKNOWN'} severity) on "${target || 'target asset'}".`);
      }
    }
  }, [searchParams]);

  const handleSendMessage = async () => {
    if (!input.trim() && !attachedItem) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      attachment: attachedItem || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedItem(null);
    setLoading(true);

    let aiConfig: any = {};
    try {
      const storedConfig = localStorage.getItem('securelens_ai_config');
      if (storedConfig) aiConfig = JSON.parse(storedConfig);
    } catch (e) {}

    let aiKeys: any = {};
    try {
      const storedKeys = localStorage.getItem('securelens_ai_keys');
      if (storedKeys) {
        aiKeys = JSON.parse(storedKeys);
      } else {
        const storedSettings = localStorage.getItem('securelens_settings');
        if (storedSettings) {
          const s = JSON.parse(storedSettings);
          if (s.aiKeys) aiKeys = s.aiKeys;
          if (s.aiConfig && !aiConfig.primaryProvider) aiConfig = s.aiConfig;
        }
      }
    } catch (e) {}

    const primaryProv = aiConfig.primaryProvider || 'gemini';
    const activeApiKey = aiKeys?.[primaryProv]?.apiKey || 
      (typeof window !== 'undefined' ? (localStorage.getItem('securelens_gemini_key') || '') : '');
    const activeModel = aiKeys?.[primaryProv]?.model || aiConfig.model || (primaryProv === 'gemini' ? 'gemini-3.5-flash-lite' : primaryProv === 'openrouter' ? 'nvidia/nemotron-3.5-lightning:free' : 'llama-3.3-70b-versatile');

    const safeLiveScans = Array.isArray(liveScans) ? liveScans.slice(0, 5) : [];
    const safeLiveFindings = Array.isArray(liveFindings) ? liveFindings.slice(0, 20) : [];
    const safeDbFindings = Array.isArray(dbFindings) ? dbFindings.slice(0, 10) : [];
    const safeDbScans = Array.isArray(dbScans) ? dbScans.slice(0, 5) : [];

    try {
      const response = await fetch('/api/ai-copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          message: input,
          provider: primaryProv,
          apiKey: activeApiKey,
          model: activeModel,
          keysMap: aiKeys,
          liveScans: safeLiveScans,
          liveFindings: safeLiveFindings,
          attachment: attachedItem,
          scanContext: activeScan,
          context: {
            activeScan,
            dbFindings: safeDbFindings,
            dbScans: safeDbScans,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || data.message || 'No response generated.';
        setMessages(prev => [...prev, { role: 'assistant', content: reply, provider: data.provider, model: data.model }]);
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Assistant response failed: ${errData.reply || errData.message || 'Server error'}`
        }]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Connection error: ${error.message || 'Could not connect to AI service. Ensure backend is running.'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const allFindingsList = useMemo(() => {
    const list: any[] = [...liveFindings];
    const knownIds = new Set(list.map(f => f.id));

    liveScans.forEach(s => {
      if (Array.isArray(s.findings)) {
        s.findings.forEach(f => {
          if (f && f.id && !knownIds.has(f.id)) {
            knownIds.add(f.id);
            list.push(f);
          }
        });
      }
    });

    if (Array.isArray(dbFindings)) {
      dbFindings.forEach(df => {
        if (df && df.id && !knownIds.has(df.id)) {
          knownIds.add(df.id);
          list.push(df);
        }
      });
    }

    return list.length > 0 ? list : [
      { id: 'f-1', severity: 'CRITICAL', title: 'SQL Injection in Login Endpoint' },
      { id: 'f-2', severity: 'CRITICAL', title: 'Exposed AWS Credentials' },
      { id: 'f-3', severity: 'HIGH', title: 'Missing Content-Security-Policy' },
      { id: 'f-4', severity: 'HIGH', title: 'Weak TLS 1.0/1.1 Protocols Supported' },
      { id: 'f-5', severity: 'MEDIUM', title: 'Weak DMARC Policy' },
      { id: 'f-6', severity: 'MEDIUM', title: 'Swagger UI Exposed' },
    ];
  }, [liveFindings, liveScans, dbFindings]);

  const allScansList = useMemo(() => {
    const list: any[] = [...liveScans];
    const knownIds = new Set(list.map(s => s.id));

    if (Array.isArray(dbScans)) {
      dbScans.forEach(ds => {
        if (ds && ds.id && !knownIds.has(ds.id)) {
          knownIds.add(ds.id);
          list.push(ds);
        }
      });
    }

    return list.length > 0 ? list : [
      { id: 'scan-1', target: 'https://uptoskills.com', status: 'COMPLETED' }
    ];
  }, [liveScans, dbScans]);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              AI Security Copilot
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE SYNC
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Context-aware multi-vector vulnerability intelligence & code remediation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCopilotData(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Live Telemetry</span>
          </button>
        </div>
      </motion.div>

      {syncToast && (
        <motion.div
          className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium flex items-center gap-2"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Check size={14} /> {syncToast}
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Messages */}
        <div className="lg:col-span-2">
          <motion.div
            className="bg-white/[0.02] rounded-2xl border border-white/[0.06] shadow-xl flex flex-col h-[calc(100vh-220px)] min-h-[500px]"
            variants={itemVariants}
          >
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="max-w-2xl w-full p-4 rounded-xl bg-[#0e111d] border border-white/[0.08] text-gray-100 shadow-xl space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-violet-600/20 text-violet-400 border border-violet-500/30">
                              <Bot size={13} />
                            </div>
                            <span className="text-xs font-semibold text-white">SecureLens Copilot</span>
                          </div>
                          {msg.provider && (
                            <div className="flex items-center gap-1 text-[10px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                              <Sparkles size={10} />
                              <span>{msg.provider} {msg.model ? `· ${msg.model}` : ''}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-200 leading-relaxed overflow-x-auto space-y-1.5">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-sm font-bold text-white mt-2 mb-1 border-b border-white/[0.08] pb-1" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-xs font-bold text-violet-300 mt-2 mb-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-gray-200 mt-1 mb-0.5" {...props} />,
                              p: ({node, ...props}) => <p className="mb-1.5 leading-relaxed text-gray-300" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-0.5 mb-1.5 text-gray-300" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-0.5 mb-1.5 text-gray-300" {...props} />,
                              code: ({node, className, children, ...props}) => {
                                return (
                                  <code className="bg-black/50 text-violet-300 px-1 py-0.5 rounded text-[11px] font-mono border border-white/10" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({node, ...props}) => (
                                <pre className="bg-[#07090e] p-2.5 rounded-lg border border-white/[0.08] overflow-x-auto text-xs font-mono text-gray-200 my-1.5" {...props} />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.attachment && (
                          <div className="mt-1.5 text-[11px] text-gray-400 bg-black/30 p-1.5 rounded-lg border border-white/[0.06]">
                            📎 Attached: {msg.attachment.name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-md p-3.5 rounded-xl bg-violet-600 text-white shadow-lg">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachment && (
                          <div className="mt-1.5 text-xs opacity-75">
                            📎 {msg.attachment.name}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Animated Thinking & Loading Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-md p-3.5 rounded-xl bg-[#0e111d] border border-violet-500/30 text-gray-100 shadow-xl flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-violet-300 font-medium">
                      Analyzing security context & formulating reply...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/[0.06] p-4 bg-[#090b14]/50 rounded-b-2xl">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  title="Upload code / config file"
                >
                  <Paperclip className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  title="Upload vulnerability screenshot"
                >
                  <ImageIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
                {attachedItem && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
                    📎 {attachedItem.name}
                    <button onClick={() => setAttachedItem(null)} className="hover:text-white"><X size={12} /></button>
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me about your scans, findings, or security recommendations..."
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || (!input.trim() && !attachedItem)}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-md shadow-violet-600/25 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachedItem({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    isImage: false,
                  });
                }}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachedItem({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    isImage: true,
                  });
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Quick Actions Sidebar */}
        <motion.div className="space-y-3" variants={itemVariants}>
          <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => setInput(action.prompt)}
              className="w-full p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/30 rounded-xl transition-all text-left group cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 group-hover:text-violet-300 shrink-0">
                  <action.icon size={15} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">{action.label}</div>
                  <div className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-snug group-hover:text-gray-300">{action.prompt}</div>
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function AICopilot() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <AICopilotContent />
    </Suspense>
  );
}
