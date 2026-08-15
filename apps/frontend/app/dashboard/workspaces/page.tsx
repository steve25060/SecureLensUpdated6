'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, GitBranch, Layers, Shield, Clock, AlertTriangle,
  Search, Play, Trash2, X, Check, ChevronRight, ArrowRight, TrendingUp,
  Loader2, RefreshCw, ExternalLink, Activity, Pencil, ServerCrash,
} from 'lucide-react';
import { enginesForMode } from '@/lib/engines';
import { EngineIcon } from '@/components/dashboard/EngineIcon';
import { formatRelativeTime, formatExactDateTime } from '@/lib/time-utils';
import { useLiveScanSync } from '@/lib/live-scan-store';

// ─── Types ────────────────────────────────────────────────────────────────────
type WorkspaceType = 'WEBSITE' | 'GITHUB' | 'COMBINED';

interface Workspace {
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
}

// ─── Demo fallback data (used only when the backend is unreachable) ───────────
const DEMO_WORKSPACES: Workspace[] = [
  {
    id: 'demo-1', name: 'Acme Corp – Production',
    description: 'Primary production website & API surface for Acme Corp.',
    type: 'WEBSITE', targetUrl: 'https://acme.com',
    tags: ['production', 'external'], riskScore: 72, findingsCount: 14,
    status: 'active', createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 'demo-2', name: 'Auth Service Repo',
    description: 'GitHub source scan for the authentication microservice.',
    type: 'GITHUB', repoUrl: 'https://github.com/acme/auth-service',
    tags: ['critical', 'internal'], riskScore: 45, findingsCount: 8,
    status: 'active', createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    id: 'demo-3', name: 'Shopify Clone – Combined',
    description: 'Website + repo combined analysis for the storefront rebuild.',
    type: 'COMBINED', targetUrl: 'https://shop.acme.com',
    repoUrl: 'https://github.com/acme/storefront',
    tags: ['staging'], riskScore: 88, findingsCount: 3,
    status: 'active', createdAt: new Date(Date.now() - 9 * 864e5).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || localStorage.getItem('sl_token');
};

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const typeConfig: Record<WorkspaceType, {
  label: string; icon: typeof Globe;
  cls: string; desc: string;
}> = {
  WEBSITE:  { label: 'Website',  icon: Globe,     cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    desc: 'Scan live websites, APIs, and associated endpoints' },
  GITHUB:   { label: 'GitHub',   icon: GitBranch, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20', desc: 'Scan code repositories for vulnerabilities' },
  COMBINED: { label: 'Combined', icon: Layers,    cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   desc: 'Website + GitHub repository in one scan' },
};

const scoreColor = (score: number | null | undefined) =>
  score == null ? '#6b7280'
  : score >= 80 ? '#22c55e'
  : score >= 60 ? '#eab308'
  : score >= 40 ? '#f97316' : '#ef4444';

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

// ─── Inline toast (lightweight, no external dep) ──────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-sm font-medium ${
              t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
            }`}
          >
            {t.type === 'success' ? <Check size={15} /> : t.type === 'error' ? <X size={15} /> : <AlertTriangle size={15} />}
            <span>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Wizard ────────────────────────────────────────────────────────────
function CreateWizard({
  onClose, onCreated, onToast, demoMode,
}: {
  onClose: () => void;
  onCreated: (ws: Workspace) => void;
  onToast: (message: string, type: Toast['type']) => void;
  demoMode: boolean;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', description: '', tags: [] as string[],
    type: 'WEBSITE' as WorkspaceType, targetUrl: '', repoUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  
  // Available engines derived from mode
  const currentMode = form.type.toLowerCase() as 'website' | 'github' | 'combined';
  const availableEngines = enginesForMode(currentMode);
  
  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>(
    availableEngines.slice(0, 5).map(e => e.id)
  );

  // Sync selected engines when mode changes
  useEffect(() => {
    const nextEngines = enginesForMode(form.type.toLowerCase() as 'website' | 'github' | 'combined');
    setSelectedEngineIds(nextEngines.slice(0, 5).map(e => e.id));
  }, [form.type]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = ['Workspace Details', 'Select Mode', 'Configure', 'Review'];

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { onToast('Workspace name is required', 'error'); return; }
    setIsSubmitting(true);
    try {
      // Build the payload the backend expects (CreateWorkspaceDto).
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        tags: form.tags,
        type: form.type,
        targetUrl: form.targetUrl.trim() || undefined,
        repoUrl: form.repoUrl.trim() || undefined,
      };

      let newWorkspace: Workspace;

      if (demoMode) {
        // Simulate latency in demo mode.
        await new Promise(r => setTimeout(r, 600));
        newWorkspace = {
          ...payload,
          id: `demo-${Date.now()}`,
          riskScore: null,
          findingsCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        } as Workspace;
      } else {
        const res = await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Server responded ${res.status}${txt ? `: ${txt}` : ''}`);
        }
        newWorkspace = await res.json();
      }

      onToast(`Workspace "${newWorkspace.name}" created`, 'success');
      onCreated(newWorkspace);
      onClose();
    } catch (error) {
      console.error('Failed to create workspace:', error);
      onToast('Failed to create workspace: ' + (error as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEngine = (id: string) => {
    setSelectedEngineIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background-secondary border border-white/[0.06] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Security Workspace</h2>
            <p className="text-sm text-gray-500 mt-0.5">Set up your workspace and configure how you want to scan.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-0 px-6 py-4 border-b border-white/[0.04] overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  step > i + 1 ? 'bg-violet-600 text-white' : step === i + 1 ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-white/[0.04] text-gray-500'
                }`}>
                  {step > i + 1 ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-white' : step > i + 1 ? 'text-violet-400' : 'text-gray-500'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight size={14} className="mx-3 text-gray-700" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 p-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-1.5">Workspace Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Acme Corp Security Analysis"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-1.5">Description <span className="text-gray-500">(optional)</span></label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the purpose of this workspace..."
                      rows={4} maxLength={250}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
                    <p className="text-xs text-gray-500 mt-1">{form.description.length}/250</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-1.5">Tags <span className="text-gray-500">(optional)</span></label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.tags.map(t => (
                        <span key={t} className="flex items-center gap-1 bg-violet-600/10 text-violet-300 text-xs px-2 py-1 rounded-full border border-violet-500/20">
                          {t}<button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                      placeholder="Add tags and press Enter..."
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-500">Choose how you want to scan this workspace.</p>
                  {(Object.keys(typeConfig) as WorkspaceType[]).map(t => {
                    const cfg = typeConfig[t];
                    const Icon = cfg.icon;
                    return (
                      <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.type === t ? 'border-violet-500/50 bg-violet-600/10' : 'border-white/[0.06] hover:border-white/[0.1] bg-white/[0.02]'}`}>
                        <div className={`p-2.5 rounded-lg ${cfg.cls}`}><Icon size={18} /></div>
                        <div>
                          <p className="text-sm font-semibold text-white">{cfg.label === 'Combined' ? 'Combined Analysis' : `${cfg.label} Analysis`}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                        </div>
                        {form.type === t && <Check size={16} className="ml-auto text-violet-400 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  {(form.type === 'WEBSITE' || form.type === 'COMBINED') && (
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-1.5">Target URL</label>
                      <input value={form.targetUrl} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                        placeholder="https://example.com"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    </div>
                  )}
                  {(form.type === 'GITHUB' || form.type === 'COMBINED') && (
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-1.5">GitHub Repository URL</label>
                      <input value={form.repoUrl} onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))}
                        placeholder="https://github.com/owner/repo"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-300">
                        Scan Engines <span className="text-gray-500 font-normal">({availableEngines.length})</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedEngineIds(availableEngines.map(e => e.id))} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Select All</button>
                        <button onClick={() => setSelectedEngineIds([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {availableEngines.map(eng => {
                        const isSelected = selectedEngineIds.includes(eng.id);
                        return (
                          <label key={eng.id} className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border transition-all ${
                            isSelected ? 'border-violet-500/30 bg-violet-600/10' : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                          }`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleEngine(eng.id)}
                              className="w-4 h-4 accent-violet-500 rounded shrink-0" />
                            <EngineIcon name={eng.icon} accent={eng.accent} size={14} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{eng.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">{eng.tool}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-500">Review your workspace configuration before creating.</p>
                  {[
                    { label: 'Name', value: form.name || '—' },
                    { label: 'Type', value: typeConfig[form.type].label },
                    { label: 'Target URL', value: form.targetUrl || '—' },
                    { label: 'Repository', value: form.repoUrl || '—' },
                    { label: 'Engines', value: availableEngines.filter(e => selectedEngineIds.includes(e.id)).map(e => `${e.name} (${e.tool})`).join(', ') || '—' },
                    { label: 'Tags', value: form.tags.join(', ') || '—' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-4 py-2.5 border-b border-white/[0.04]">
                      <span className="text-sm text-gray-500 w-28 shrink-0">{row.label}</span>
                      <span className="text-sm text-gray-200 break-all">{row.value}</span>
                    </div>
                  ))}
                  {demoMode && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs">
                      <AlertTriangle size={14} /> Demo mode active — workspace will be stored locally only.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="border-l border-white/[0.04] p-6 bg-background">
            <h4 className="text-sm font-semibold text-white mb-4">Workspace Preview</h4>
            <div className="bg-white/[0.02] rounded-xl p-4 mb-6 border border-white/[0.04]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-violet-600/10 rounded-lg flex items-center justify-center border border-violet-500/20">
                  <Shield size={18} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{form.name || 'Workspace Name'}</p>
                  <p className="text-xs text-gray-500">{form.description || 'No description provided'}</p>
                </div>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map(t => <span key={t} className="text-[10px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.06]">{t}</span>)}
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-gray-400 mb-3">You&apos;ll be able to:</p>
            {['Run website, GitHub, or combined scans', 'Correlate findings and remove duplicates', 'View results in the unified dashboard', 'Get AI-powered insights and remediation steps', 'Export reports and share with your team'].map(item => (
              <div key={item} className="flex items-start gap-2 mb-2">
                <Check size={12} className="text-green-400 mt-0.5 shrink-0" />
                <span className="text-xs text-gray-500">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-white/[0.04]">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-5 py-2 text-sm text-gray-400 hover:text-white border border-white/[0.06] rounded-lg transition-all hover:bg-white/[0.04]">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.name.trim()}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-violet-600/20">
              Next: {steps[step]} →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2">
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Create Workspace</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({
  workspace, onClose, onSaved, onToast, demoMode,
}: {
  workspace: Workspace;
  onClose: () => void;
  onSaved: (ws: Workspace) => void;
  onToast: (message: string, type: Toast['type']) => void;
  demoMode: boolean;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { onToast('Name cannot be empty', 'error'); return; }
    setLoading(true);
    try {
      let saved: Workspace;
      if (demoMode) {
        await new Promise(r => setTimeout(r, 400));
        saved = { ...workspace, name: name.trim(), description: description.trim(), updatedAt: new Date().toISOString() };
      } else {
        const res = await fetch(`/api/workspaces/${workspace.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        saved = await res.json();
      }
      onToast('Workspace updated', 'success');
      onSaved(saved);
      onClose();
    } catch (e) {
      onToast('Failed to update: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background-secondary border border-white/[0.06] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold text-white">Edit Workspace</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={250}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.04]">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-400 hover:text-white border border-white/[0.06] rounded-lg transition-all hover:bg-white/[0.04]">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Workspace Card ───────────────────────────────────────────────────────────
function WorkspaceCard({
  ws, onDelete, onEdit, onScan, demoMode,
}: {
  ws: Workspace;
  onDelete: (ws: Workspace) => void;
  onEdit: (ws: Workspace) => void;
  onScan: (ws: Workspace) => void;
  demoMode: boolean;
}) {
  const cfg = typeConfig[ws.type] ?? typeConfig.WEBSITE;
  const Icon = cfg.icon;
  const color = scoreColor(ws.riskScore);
  const subtitle = ws.targetUrl ?? ws.repoUrl ?? '—';

  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${cfg.cls} border shrink-0`}><Icon size={16} /></div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{ws.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
              {subtitle !== '—' && <ExternalLink size={9} className="shrink-0" />}
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onScan(ws)}
            title="Run scan" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-green-400 transition-colors"><Play size={13} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(ws)}
            title="Edit" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-violet-400 transition-colors"><Pencil size={13} /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(ws)}
            title="Delete" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></motion.button>
        </div>
      </div>
      {ws.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 relative">{ws.description}</p>
      )}
      <div className="flex items-center gap-6 mb-4 relative">
        <div>
          <p className="text-[10px] text-gray-500 mb-1">Risk Score</p>
          <p className="text-xl font-bold" style={{ color }}>{ws.riskScore ?? '—'}{ws.riskScore != null && <span className="text-xs text-gray-500">/100</span>}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-1">Findings</p>
          <p className="text-xl font-bold text-white">{ws.findingsCount ?? 0}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${cfg.cls}`}>{cfg.label}</span>
        </div>
      </div>
      {ws.tags && ws.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4 relative">
          {ws.tags.map(t => <span key={t} className="text-[10px] bg-white/[0.03] text-gray-500 px-2 py-0.5 rounded-full border border-white/[0.06]">{t}</span>)}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-400" title={`Created: ${formatExactDateTime(ws.createdAt)}`}>
          <Clock size={11} className="text-violet-400" />{formatRelativeTime(ws.createdAt)}
        </div>
        <button onClick={() => onScan(ws)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium group/btn">
          New scan <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
      {demoMode && (
        <span className="absolute top-3 right-3 text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">DEMO</span>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkspaceType | 'ALL'>('ALL');
  const [demoMode, setDemoMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchWorkspaces = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch('/api/workspaces', { headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.workspaces ?? []);
      setWorkspaces(list);
      setDemoMode(false);
    } catch (error) {
      console.warn('Backend unreachable, using demo data:', error);
      setWorkspaces(DEMO_WORKSPACES);
      setDemoMode(true);
      if (!silent) pushToast('Backend offline — showing demo workspaces', 'info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) return;
    // Optimistic removal
    setWorkspaces(prev => prev.filter(w => w.id !== ws.id));
    try {
      if (!demoMode) {
        const res = await fetch(`/api/workspaces/${ws.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      pushToast(`Workspace "${ws.name}" deleted`, 'success');
    } catch (e) {
      // Roll back on failure
      setWorkspaces(prev => [ws, ...prev]);
      pushToast('Failed to delete: ' + (e as Error).message, 'error');
    }
  };

  const handleScan = (ws: Workspace) => {
    const params = new URLSearchParams();
    if (ws.targetUrl) params.set('target', ws.targetUrl);
    if (ws.repoUrl) params.set('repo', ws.repoUrl);
    params.set('workspaceId', ws.id);
    params.set('mode', ws.type.toLowerCase());
    window.location.href = `/dashboard/live-scan?${params.toString()}`;
  };

  const { liveScans } = useLiveScanSync();

  // Merge live scans dynamically and compute accurate risk scores
  const activeWorkspaces = workspaces.map(ws => {
    const matchingScan = liveScans.find(ls => 
      (ls.id && ls.id.includes(ws.id)) ||
      (ws.targetUrl && ls.target && ls.target.toLowerCase().includes(ws.targetUrl.toLowerCase())) ||
      (ws.repoUrl && ls.target && ls.target.toLowerCase().includes(ws.repoUrl.toLowerCase())) ||
      (ls.target && ws.name && ls.target.toLowerCase().includes(ws.name.toLowerCase()))
    );

    let score = ws.riskScore;
    let findingsCount = ws.findingsCount;

    if (matchingScan) {
      if (matchingScan.score !== undefined && matchingScan.score !== null && matchingScan.score > 0) {
        score = matchingScan.score;
      }
      if (matchingScan.findingsCount !== undefined) {
        findingsCount = matchingScan.findingsCount;
      }
    }

    if (score === null || score === undefined || score === 0) {
      score = Math.max(25, 100 - ((findingsCount || 0) * 5));
    }

    return {
      ...ws,
      riskScore: score,
      findingsCount: findingsCount ?? 0,
    };
  });

  const filtered = activeWorkspaces.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase())
      || (w.description ?? '').toLowerCase().includes(search.toLowerCase())
      || (w.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'ALL' || w.type === typeFilter;
    return matchSearch && matchType;
  });

  const scoredWorkspaces = activeWorkspaces.filter(w => typeof w.riskScore === 'number' && !isNaN(w.riskScore));
  const computedAvgScore = scoredWorkspaces.length > 0
    ? Math.round(scoredWorkspaces.reduce((s, w) => s + (w.riskScore ?? 0), 0) / scoredWorkspaces.length)
    : null;

  const stats = [
    { label: 'Total Workspaces', value: activeWorkspaces.length, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Total Findings', value: activeWorkspaces.reduce((s, w) => s + (w.findingsCount ?? 0), 0), icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Avg Risk Score', value: computedAvgScore !== null ? `${computedAvgScore}/100` : '—', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Scans', value: activeWorkspaces.filter(w => w.status === 'RUNNING' || w.status === 'running').length, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Workspaces
            {demoMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">DEMO MODE</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your security workspaces and scan configurations.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => fetchWorkspaces(true)}
            disabled={refreshing}
            title="Refresh"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-sm font-medium transition-all shadow-lg shadow-violet-600/20"
          >
            <Plus size={15} /> New Workspace
          </motion.button>
        </div>
      </motion.div>

      {demoMode && (
        <motion.div variants={itemVariants} className="flex items-start gap-3 bg-yellow-500/[0.04] border border-yellow-500/20 rounded-xl p-4">
          <ServerCrash size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div className="text-xs text-yellow-300/90">
            <p className="font-semibold mb-0.5">Backend not connected</p>
            <p className="text-yellow-300/70">
              Could not reach the API at <code className="px-1 py-0.5 rounded bg-yellow-500/10">/api/workspaces</code>.
              Start the NestJS backend (<code className="px-1 py-0.5 rounded bg-yellow-500/10">pnpm --filter backend dev</code>) to persist workspaces.
              Showing demo data for now — changes are kept in memory only.
            </p>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} whileHover={{ y: -1 }} className={`${stat.bg} border border-white/[0.04] rounded-xl p-4 transition-all`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={stat.color} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          {(['ALL', 'WEBSITE', 'GITHUB', 'COMBINED'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
              {t === 'ALL' ? 'All' : typeConfig[t].label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <motion.div variants={itemVariants} className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Loading workspaces...</p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(ws => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              demoMode={demoMode}
              onDelete={handleDelete}
              onEdit={ws => setEditing(ws)}
              onScan={handleScan}
            />
          ))}
          {filtered.length === 0 && workspaces.length === 0 ? (
            <motion.div variants={itemVariants} className="col-span-full text-center py-16">
              <Shield size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500">No workspaces yet. Create one to get started.</p>
              <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Create Workspace
              </button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">No workspaces match your search.</div>
          ) : null}
        </motion.div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateWizard
            demoMode={demoMode}
            onClose={() => setShowCreate(false)}
            onCreated={ws => setWorkspaces(p => [ws, ...p])}
            onToast={pushToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <EditModal
            workspace={editing}
            demoMode={demoMode}
            onClose={() => setEditing(null)}
            onSaved={ws => setWorkspaces(prev => prev.map(w => w.id === ws.id ? ws : w))}
            onToast={pushToast}
          />
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </motion.div>
  );
}
