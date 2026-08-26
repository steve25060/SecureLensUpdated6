'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventBus } from '@/lib/event-bus';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  Plus, Globe, GitBranch, Layers, Shield, Clock, AlertTriangle,
  Search, Play, Trash2, X, Check, ChevronRight, ArrowRight, TrendingUp,
  Loader2, RefreshCw, ExternalLink, Activity, Pencil, Sparkles, Server,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { enginesForMode } from '@/lib/engines';
import { EngineIcon } from '@/components/dashboard/EngineIcon';
import { formatRelativeTime, formatExactDateTime } from '@/lib/time-utils';
import { useLiveScanSync } from '@/lib/live-scan-store';
import { Github } from '@/components/common/GithubIcon';
import {
  getStoredWorkspaces,
  saveStoredWorkspace,
  deleteStoredWorkspace,
  DEFAULT_WORKSPACES,
  type Workspace,
  type WorkspaceType,
} from '@/lib/workspaces-store';

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
  label: string;
  icon: React.ElementType;
  cls: string;
  desc: string;
}> = {
  WEBSITE: {
    label: 'Website',
    icon: Globe,
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    desc: 'Scan live websites, APIs, SSL configuration, and endpoints',
  },
  GITHUB: {
    label: 'GitHub',
    icon: Github,
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    desc: 'Scan code repositories for SAST vulnerabilities, leaks, and supply chain flaws',
  },
  COMBINED: {
    label: 'Combined',
    icon: Layers,
    cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    desc: 'Correlated website and GitHub repository assessment in a unified pipeline',
  },
};

const scoreColor = (score: number | null | undefined) =>
  score == null ? '#6b7280'
  : score >= 80 ? '#22c55e'
  : score >= 60 ? '#eab308'
  : score >= 40 ? '#f97316' : '#ef4444';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

// ─── Inline Toast Stack ───────────────────────────────────────────────────────
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

// ─── Create Workspace Wizard Modal ───────────────────────────────────────────
function CreateWizard({
  onClose,
  onCreated,
  onToast,
}: {
  onClose: () => void;
  onCreated: (ws: Workspace) => void;
  onToast: (message: string, type: Toast['type']) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    type: 'WEBSITE' as WorkspaceType,
    targetUrl: '',
    repoUrl: '',
  });
  const [tagInput, setTagInput] = useState('');

  const currentMode = form.type.toLowerCase() as 'website' | 'github' | 'combined';
  const availableEngines = enginesForMode(currentMode);

  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>(
    availableEngines.slice(0, 5).map(e => e.id)
  );

  useEffect(() => {
    const nextEngines = enginesForMode(form.type.toLowerCase() as 'website' | 'github' | 'combined');
    setSelectedEngineIds(nextEngines.slice(0, 5).map(e => e.id));
  }, [form.type]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const steps = ['Workspace Details', 'Select Mode', 'Configure Target', 'Review & Deploy'];

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
    if (!form.name.trim()) {
      onToast('Workspace name is required', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        targetUrl: form.targetUrl.trim() || (form.type !== 'GITHUB' ? 'https://uptoskills.com' : undefined),
        repoUrl: form.repoUrl.trim() || (form.type !== 'WEBSITE' ? 'https://github.com/acme/repo' : undefined),
        tags: form.tags.length > 0 ? form.tags : ['security-audit'],
        riskScore: 100,
        findingsCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engines: selectedEngineIds,
      };

      saveStoredWorkspace(newWs);
      onToast(`✓ Workspace "${newWs.name}" created successfully`, 'success');
      onCreated(newWs);
      onClose();
    } catch (error) {
      onToast('Failed to create workspace', 'error');
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0e111a] border border-white/[0.08] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Security Workspace</h2>
            <p className="text-sm text-gray-400 mt-0.5">Configure target asset, analysis pipeline, and scanner profile.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
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
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Acme Production Security Surface"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-1.5">Description <span className="text-gray-500">(optional)</span></label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the purpose, environment, or scope of this workspace..."
                      rows={3}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-1.5">Tags <span className="text-gray-500">(press enter to add)</span></label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.tags.map(t => (
                        <span key={t} className="flex items-center gap-1 bg-violet-600/15 text-violet-300 text-xs px-2.5 py-1 rounded-full border border-violet-500/25">
                          {t}
                          <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      placeholder="e.g. production, external-facing, critical..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-400 mb-2">Choose the scanning vector for this workspace:</p>
                  {(Object.keys(typeConfig) as WorkspaceType[]).map(t => {
                    const cfg = typeConfig[t];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          form.type === t ? 'border-violet-500/60 bg-violet-600/10' : 'border-white/[0.06] hover:border-white/[0.1] bg-white/[0.02]'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${cfg.cls}`}><Icon size={18} /></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{cfg.label === 'Combined' ? 'Combined Multi-Vector Analysis' : `${cfg.label} Assessment`}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{cfg.desc}</p>
                        </div>
                        {form.type === t && <Check size={16} className="text-violet-400 shrink-0 mt-0.5" />}
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
                      <input
                        value={form.targetUrl}
                        onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                        placeholder="https://example.com"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  )}

                  {(form.type === 'GITHUB' || form.type === 'COMBINED') && (
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-1.5">GitHub Repository URL</label>
                      <input
                        value={form.repoUrl}
                        onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))}
                        placeholder="https://github.com/owner/repository"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-300">
                        Scan Engines <span className="text-gray-500 font-normal">({availableEngines.length})</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSelectedEngineIds(availableEngines.map(e => e.id))} className="text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">Select All</button>
                        <button type="button" onClick={() => setSelectedEngineIds([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {availableEngines.map(eng => {
                        const isSelected = selectedEngineIds.includes(eng.id);
                        return (
                          <label
                            key={eng.id}
                            className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-all ${
                              isSelected ? 'border-violet-500/30 bg-violet-600/10' : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEngine(eng.id)}
                              className="w-4 h-4 accent-violet-500 rounded shrink-0"
                            />
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
                  <p className="text-sm text-gray-400">Review workspace configuration before deploying:</p>
                  {[
                    { label: 'Name', value: form.name || '—' },
                    { label: 'Type', value: typeConfig[form.type].label },
                    { label: 'Target URL', value: form.targetUrl || '—' },
                    { label: 'Repository', value: form.repoUrl || '—' },
                    { label: 'Engines', value: availableEngines.filter(e => selectedEngineIds.includes(e.id)).map(e => e.name).join(', ') || 'Default Multi-Engine Pipeline' },
                    { label: 'Tags', value: form.tags.join(', ') || 'default' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-4 py-2 border-b border-white/[0.04] text-xs">
                      <span className="text-gray-400 w-28 shrink-0 font-medium">{row.label}</span>
                      <span className="text-gray-200 font-semibold break-all">{row.value}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-l border-white/[0.06] p-6 bg-[#0a0c13]">
            <h4 className="text-sm font-semibold text-white mb-4">Workspace Preview</h4>
            <div className="bg-white/[0.02] rounded-xl p-4 mb-6 border border-white/[0.04]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-violet-600/10 rounded-lg flex items-center justify-center border border-violet-500/20">
                  <Shield size={18} className="text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{form.name || 'New Workspace'}</p>
                  <p className="text-xs text-gray-500 truncate">{form.description || 'Target Security Boundary'}</p>
                </div>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="text-[10px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.06]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-400" />
                <span>Automated multi-engine security scans</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-400" />
                <span>Continuous posture & vulnerability tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-400" />
                <span>AI remediation & automated report generation</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-5 py-2 text-xs text-gray-400 hover:text-white border border-white/[0.08] rounded-xl transition-all hover:bg-white/[0.04] cursor-pointer"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !form.name.trim()}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
            >
              Next: {steps[step]} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-600/25 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Workspace Modal ─────────────────────────────────────────────────────
function EditModal({
  workspace,
  onClose,
  onSaved,
  onToast,
}: {
  workspace: Workspace;
  onClose: () => void;
  onSaved: (ws: Workspace) => void;
  onToast: (message: string, type: Toast['type']) => void;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [targetUrl, setTargetUrl] = useState(workspace.targetUrl || '');
  const [repoUrl, setRepoUrl] = useState(workspace.repoUrl || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      onToast('Workspace name cannot be empty', 'error');
      return;
    }
    setLoading(true);
    try {
      const updated: Workspace = {
        ...workspace,
        name: name.trim(),
        description: description.trim() || null,
        targetUrl: targetUrl.trim() || null,
        repoUrl: repoUrl.trim() || null,
        updatedAt: new Date().toISOString(),
      };
      saveStoredWorkspace(updated);
      onSaved(updated);
      onToast(`✓ Workspace "${updated.name}" updated`, 'success');
      onClose();
    } catch {
      onToast('Failed to update workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0e111a] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="text-base font-bold text-white">Edit Security Workspace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-300 font-medium mb-1">Workspace Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {workspace.type !== 'GITHUB' && (
            <div>
              <label className="block text-gray-300 font-medium mb-1">Target Website / API URL</label>
              <input
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {workspace.type !== 'WEBSITE' && (
            <div>
              <label className="block text-gray-300 font-medium mb-1">GitHub Repository URL</label>
              <input
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-600/25 cursor-pointer"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Workspace Card ───────────────────────────────────────────────────────────
function WorkspaceCard({
  ws,
  onDelete,
  onEdit,
  onScan,
}: {
  key?: any;
  ws: Workspace;
  onDelete: (ws: Workspace) => any;
  onEdit: (ws: Workspace) => any;
  onScan: (ws: Workspace) => any;
}) {
  const cfg = typeConfig[ws.type] ?? typeConfig.WEBSITE;
  const Icon = cfg.icon;
  const color = scoreColor(ws.riskScore);
  const subtitle = ws.targetUrl ?? ws.repoUrl ?? 'Target Asset';

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 group hover:border-white/[0.1] hover:bg-white/[0.035] transition-all duration-300 shadow-lg shadow-black/20 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl ${cfg.cls} border shrink-0`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">{ws.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
                <ExternalLink size={10} className="shrink-0 text-gray-500" />
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
            <button
              onClick={() => onEdit(ws)}
              title="Edit workspace"
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-gray-400 hover:text-violet-400 transition-colors cursor-pointer"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(ws)}
              title="Delete workspace"
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {ws.description && (
          <p className="text-xs text-gray-400 mb-3.5 line-clamp-2 leading-relaxed">{ws.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-3.5 text-center">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Score</p>
            <p className="text-base font-bold" style={{ color }}>
              {ws.riskScore ?? 84}/100
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Findings</p>
            <p className="text-base font-bold text-white">{ws.findingsCount ?? 6}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Type</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        {ws.tags && ws.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3.5">
            {ws.tags.map(t => (
              <span key={t} className="text-[10px] bg-white/[0.03] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.05]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs">
        <span className="text-gray-500 text-[11px] flex items-center gap-1.5">
          <Clock size={11} className="text-violet-400" />
          {formatRelativeTime(ws.createdAt)}
        </span>
        <button
          onClick={() => onScan(ws)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all cursor-pointer"
        >
          <Play size={11} className="fill-violet-300" />
          <span>Launch Scan</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Workspaces Page Component ───────────────────────────────────────────
export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkspaceType | 'ALL'>('ALL');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const { isLive, lastUpdate } = useRealtimeSync();
  const { scans: liveScans } = useLiveScanSync();

  // Load and merge workspaces
  const fetchWorkspaces = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const localList = getStoredWorkspaces();
      let backendList: Workspace[] = [];

      try {
        const response = await fetch('/api/workspaces', { headers: authHeaders() });
        if (response.ok) {
          const data = await response.json();
          backendList = Array.isArray(data) ? data : (data?.workspaces ?? []);
        }
      } catch {}

      const combinedMap = new Map<string, Workspace>();
      // Backend records
      backendList.forEach(w => combinedMap.set(w.id, w));
      // Local stored records
      localList.forEach(w => {
        if (!combinedMap.has(w.id)) combinedMap.set(w.id, w);
      });

      setWorkspaces(Array.from(combinedMap.values()));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    window.addEventListener('securelens:workspaces-updated', () => fetchWorkspaces(true));
    return () => {
      window.removeEventListener('securelens:workspaces-updated', () => fetchWorkspaces(true));
    };
  }, [fetchWorkspaces]);

  // Subscribe to EventBus events
  useEventBus('WORKSPACE_CREATED', (event) => {
    pushToast(`New workspace "${event.data?.name || 'created'}"`, 'success');
    fetchWorkspaces(true);
  });

  useEventBus('WORKSPACE_UPDATED', (event) => {
    pushToast(`Workspace "${event.data?.name || 'updated'}"`, 'info');
    fetchWorkspaces(true);
  });

  useEventBus('WORKSPACE_DELETED', () => {
    pushToast(`Workspace deleted`, 'success');
    fetchWorkspaces(true);
  });

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) return;
    deleteStoredWorkspace(ws.id);
    setWorkspaces(prev => prev.filter(w => w.id !== ws.id));
    pushToast(`Workspace "${ws.name}" deleted`, 'success');
  };

  const handleScan = (ws: Workspace) => {
    const params = new URLSearchParams();
    if (ws.targetUrl) params.set('target', ws.targetUrl);
    if (ws.repoUrl) params.set('repo', ws.repoUrl);
    params.set('workspaceId', ws.id);
    params.set('mode', ws.type.toLowerCase());
    router.push(`/dashboard/live-scan?${params.toString()}`);
  };

  // Merge live scans and dynamic metrics
  const activeWorkspaces = useMemo(() => {
    return workspaces.map(ws => {
      const matchingScan = liveScans.find(ls =>
        ls.workspaceId === ws.id ||
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
        const count = findingsCount || 0;
        const deduction = Math.min(85, count * 4.2 * (100 / (100 + count * 2.8)));
        score = Math.max(15, Math.min(99, Math.round(100 - deduction)));
      }

      return {
        ...ws,
        riskScore: score,
        findingsCount: findingsCount ?? 0,
      };
    });
  }, [workspaces, liveScans]);

  const filtered = useMemo(() => {
    return activeWorkspaces.filter(w => {
      const matchSearch = w.name.toLowerCase().includes(search.toLowerCase())
        || (w.description ?? '').toLowerCase().includes(search.toLowerCase())
        || (w.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()))
        || (w.targetUrl ?? '').toLowerCase().includes(search.toLowerCase())
        || (w.repoUrl ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'ALL' || w.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [activeWorkspaces, search, typeFilter]);

  const scoredWorkspaces = activeWorkspaces.filter(w => typeof w.riskScore === 'number' && !isNaN(w.riskScore));
  const computedAvgScore = scoredWorkspaces.length > 0
    ? Math.round(scoredWorkspaces.reduce((s, w) => s + (w.riskScore ?? 0), 0) / scoredWorkspaces.length)
    : 100;

  const stats = [
    { label: 'Total Workspaces', value: activeWorkspaces.length, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Active Findings', value: activeWorkspaces.reduce((s, w) => s + (w.findingsCount ?? 0), 0), icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Avg Risk Score', value: `${computedAvgScore}/100`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Monitored Assets', value: activeWorkspaces.filter(w => w.targetUrl || w.repoUrl).length, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Security Workspaces
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE SYNC
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Organize, monitor, and scan website assets, APIs, and GitHub repositories in isolated security environments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchWorkspaces(true)}
            disabled={refreshing}
            title="Refresh workspaces"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] text-gray-400 text-sm hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-lg shadow-violet-600/25 cursor-pointer"
          >
            <Plus size={15} /> New Workspace
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} whileHover={{ y: -1 }} className={`${stat.bg} border border-white/[0.04] rounded-xl p-4 transition-all`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={stat.color} />
                <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search workspaces by name, target, or tags..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          {(['ALL', 'WEBSITE', 'GITHUB', 'COMBINED'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === t ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {t === 'ALL' ? 'All' : typeConfig[t].label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Workspaces Grid */}
      {loading ? (
        <motion.div variants={itemVariants} className="text-center py-16">
          <Loader2 className="animate-spin text-violet-500 mx-auto" size={32} />
          <p className="text-gray-400 mt-3 text-sm">Loading security workspaces...</p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {filtered.map(ws => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              onDelete={handleDelete}
              onEdit={wsItem => setEditing(wsItem)}
              onScan={handleScan}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
              <Shield size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-white font-semibold text-sm">No workspaces match your query</p>
              <p className="text-gray-500 text-xs mt-1">Try clearing search filters or create a new workspace.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Create Wizard */}
      <AnimatePresence>
        {showCreate && (
          <CreateWizard
            onClose={() => setShowCreate(false)}
            onCreated={ws => setWorkspaces(p => [ws, ...p])}
            onToast={pushToast}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <EditModal
            workspace={editing}
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
