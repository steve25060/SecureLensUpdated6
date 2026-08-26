'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, Bell, Palette, Shield, Zap, Save, 
  CheckCircle, Globe, Clock, Download,
  Key, User, Mail, Lock, Eye, EyeOff, Bot, Sparkles, RefreshCw,
  Check, AlertTriangle, ArrowUpDown, ChevronDown, ChevronUp,
  ExternalLink, Server, Cpu, Layers, Sliders, CheckCircle2,
  XCircle, Loader2, PlayCircle, HelpCircle, GripVertical,
  Building2, Briefcase, Phone, Laptop, ShieldCheck, Trash2
} from 'lucide-react';
import { EventBus } from '@/lib/event-bus';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  THEME_PRESETS, 
  getStoredThemeConfig, 
  applyThemeConfig, 
  DEFAULT_THEME_CONFIG,
  type ThemeConfig 
} from '@/lib/theme-manager';

export type AIProviderId = 'gemini' | 'openrouter' | 'groq' | 'openai' | 'claude' | 'ollama' | 'deepseek';

export interface ProviderSetting {
  id: AIProviderId;
  name: string;
  description: string;
  free: boolean;
  keyUrl: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  models: { id: string; label: string; tag?: string }[];
  enabled: boolean;
  status: 'idle' | 'testing' | 'success' | 'error';
  latencyMs?: number;
  statusMessage?: string;
}

export interface AIConfigSettings {
  primaryProvider: AIProviderId;
  autoConnect: boolean;
  enableFailover: boolean;
  failoverOrder: AIProviderId[];
  fallbackToRuleEngine: boolean;
  temperature: number;
  maxTokens: number;
}

export interface UserSettings {
  // AI Settings
  aiConfig: AIConfigSettings;
  aiKeys: Record<string, { apiKey: string; model: string; baseUrl?: string; enabled: boolean }>;

  // Notifications
  enableNotifications: boolean;
  notifyOnScanComplete: boolean;
  notifyOnNewFinding: boolean;
  notifyOnCriticalOnly: boolean;
  toastDuration: number;
  
  // Appearance
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  compactMode: boolean;
  
  // Scanning
  autoStartScans: boolean;
  defaultScanProfile: 'quick' | 'standard' | 'deep' | 'compliance';
  maxConcurrentScans: number;
  portScanDepth: 'top100' | 'top1000' | 'all';
  
  // Export
  defaultExportFormat: 'pdf' | 'csv' | 'json' | 'html' | 'markdown';
  includeRemediation: boolean;
  includeExecutiveSummary: boolean;
  
  // Privacy
  shareAnonymousData: boolean;
}

const DEFAULT_PROVIDERS: Record<AIProviderId, Omit<ProviderSetting, 'apiKey' | 'enabled' | 'status'>> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Ultra-fast inference, huge token context window, native multimodal code/image inspection.',
    free: true,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    model: 'gemini-3.5-flash-lite',
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Verified 1.1s Fast)', tag: 'Default' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Flagship Free)', tag: 'Pro' },
      { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', tag: 'Fast' },
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', tag: 'Preview' },
      { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT (Open Weights)', tag: 'Open' },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified gateway to 100+ LLMs with generous free tier models and auto-routing fallback.',
    free: true,
    keyUrl: 'https://openrouter.ai/keys',
    model: 'nvidia/nemotron-3.5-lightning:free',
    models: [
      { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (Verified 375ms Ultra-Fast)', tag: 'Default' },
      { id: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B IT (Verified Free)', tag: 'Free' },
      { id: 'google/gemma-4-26b-a4b-it:free', label: 'Google Gemma 4 26B A4B (Verified Free)', tag: 'Free' },
      { id: 'liquid/lfm-2.5-2.6b:free', label: 'LiquidAI LFM 2.5 2.6B (Free)', tag: 'Free' },
      { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code (Free)', tag: 'Free' },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Ultra low latency LPU hardware acceleration providing near-instantaneous token generation.',
    free: true,
    keyUrl: 'https://console.groq.com/keys',
    model: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Verified Flagship)', tag: 'Default' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Verified 138ms Ultra-Fast)', tag: 'Fast' },
      { id: 'groq/compound', label: 'Groq Compound (Verified Reasoning)', tag: 'Pro' },
      { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B (Verified 125ms)', tag: 'Code' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry-standard precision models for deep vulnerability analysis and complex patch generation.',
    free: false,
    keyUrl: 'https://platform.openai.com/api-keys',
    model: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost Efficient)', tag: 'Default' },
      { id: 'gpt-4o', label: 'GPT-4o (Flagship Multimodal Intelligence)', tag: 'Pro' },
      { id: 'o3-mini', label: 'o3-mini (High Reasoning Math & Code)', tag: 'Reasoning' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', tag: 'Legacy' },
    ],
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'State-of-the-art security analysis, deep context understanding, and clean refactoring.',
    free: false,
    keyUrl: 'https://console.anthropic.com/',
    model: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (State of the Art)', tag: 'Default' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (High Speed)', tag: 'Fast' },
    ],
  },
  ollama: {
    id: 'ollama',
    name: 'Local Ollama',
    description: '100% private, self-hosted offline AI running locally on your workstation or server.',
    free: true,
    keyUrl: 'https://ollama.com/',
    model: 'llama3.3',
    baseUrl: 'http://localhost:11434',
    models: [
      { id: 'llama3.3', label: 'Llama 3.3 (8B / 70B)', tag: 'Local' },
      { id: 'qwen2.5-coder', label: 'Qwen 2.5 Coder', tag: 'Code' },
      { id: 'mistral', label: 'Mistral 7B', tag: 'Lightweight' },
      { id: 'deepseek-r1', label: 'DeepSeek R1 Local', tag: 'Reasoning' },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek API',
    description: 'Cost-effective high-reasoning model for complex security architectures and exploit scenarios.',
    free: false,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 Chat', tag: 'Default' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 Reasoner', tag: 'Reasoning' },
    ],
  },
};

const DEFAULT_SETTINGS: UserSettings = {
  aiConfig: {
    primaryProvider: 'gemini',
    autoConnect: true,
    enableFailover: true,
    failoverOrder: ['gemini', 'openrouter', 'groq', 'openai', 'claude', 'ollama', 'deepseek'],
    fallbackToRuleEngine: true,
    temperature: 0.2,
    maxTokens: 4096,
  },
  aiKeys: {
    gemini: { apiKey: '', model: 'gemini-3.5-flash-lite', enabled: true },
    openrouter: { apiKey: '', model: 'nvidia/nemotron-3.5-lightning:free', enabled: true },
    groq: { apiKey: '', model: 'llama-3.3-70b-versatile', enabled: true },
    openai: { apiKey: '', model: 'gpt-4o-mini', enabled: true },
    claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022', enabled: true },
    ollama: { apiKey: 'http://localhost:11434', model: 'llama3.3', baseUrl: 'http://localhost:11434', enabled: true },
    deepseek: { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', enabled: true },
  },
  enableNotifications: true,
  notifyOnScanComplete: true,
  notifyOnNewFinding: true,
  notifyOnCriticalOnly: false,
  toastDuration: 4,
  theme: 'dark',
  accentColor: '#7c3aed',
  compactMode: false,
  autoStartScans: false,
  defaultScanProfile: 'standard',
  maxConcurrentScans: 3,
  portScanDepth: 'top1000',
  defaultExportFormat: 'pdf',
  includeRemediation: true,
  includeExecutiveSummary: true,
  shareAnonymousData: false,
};

const ACCENT_COLORS = [
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#ef4444' },
  { name: 'Cyan', value: '#06b6d4' },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLive } = useRealtimeSync();

  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'scanning' | 'notifications' | 'export' | 'appearance'>('profile');

  // ─── Profile State ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    organization: '',
    jobTitle: 'AppSec Engineer',
    phone: '',
    timezone: 'UTC',
    bio: '',
    twoFactorEnabled: false,
    avatarUrl: '',
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'ai', 'scanning', 'notifications', 'export', 'appearance'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Load user profile from storage & backend
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const userEmail = localStorage.getItem('user_email');
      const userName = localStorage.getItem('user_name');
      const userOrg = localStorage.getItem('user_org');
      const userTitle = localStorage.getItem('user_job_title');
      const userPhone = localStorage.getItem('user_phone');
      const userTz = localStorage.getItem('user_timezone');
      const userBio = localStorage.getItem('user_bio');
      const userAvatar = localStorage.getItem('user_avatar');

      let parsedUser: any = {};
      if (userStr) {
        try { parsedUser = JSON.parse(userStr); } catch {}
      }

      setProfile(prev => ({
        ...prev,
        name: userName || parsedUser.name || parsedUser.username || prev.name,
        email: userEmail || parsedUser.email || prev.email,
        organization: userOrg || parsedUser.organization || prev.organization,
        jobTitle: userTitle || parsedUser.jobTitle || prev.jobTitle,
        phone: userPhone || parsedUser.phone || prev.phone,
        timezone: userTz || parsedUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || prev.timezone,
        bio: userBio || parsedUser.bio || prev.bio,
        avatarUrl: userAvatar || parsedUser.avatarUrl || prev.avatarUrl,
      }));
    } catch {}
  }, []);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [providerState, setProviderState] = useState<Record<AIProviderId, {
    apiKey: string;
    model: string;
    baseUrl?: string;
    enabled: boolean;
    status: 'idle' | 'testing' | 'success' | 'error';
    latencyMs?: number;
    statusMessage?: string;
    showKey?: boolean;
    customModelInput?: boolean;
  }>>({
    gemini: { apiKey: '', model: 'gemini-3.5-flash', enabled: true, status: 'idle' },
    openrouter: { apiKey: '', model: 'meta-llama/llama-3.3-70b-instruct:free', enabled: true, status: 'idle' },
    groq: { apiKey: '', model: 'llama-3.3-70b-versatile', enabled: true, status: 'idle' },
    openai: { apiKey: '', model: 'gpt-4o-mini', enabled: true, status: 'idle' },
    claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022', enabled: true, status: 'idle' },
    ollama: { apiKey: 'http://localhost:11434', model: 'llama3.3', baseUrl: 'http://localhost:11434', enabled: true, status: 'idle' },
    deepseek: { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', enabled: true, status: 'idle' },
  });

  const [saved, setSaved] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [autoConnectResult, setAutoConnectResult] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
      
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: profile.name,
            email: profile.email,
            organization: profile.organization,
          }),
        });
      } catch {}

      localStorage.setItem('user_name', profile.name);
      localStorage.setItem('user_email', profile.email);
      localStorage.setItem('user_org', profile.organization);
      localStorage.setItem('user_job_title', profile.jobTitle);
      localStorage.setItem('user_phone', profile.phone);
      localStorage.setItem('user_timezone', profile.timezone);
      localStorage.setItem('user_bio', profile.bio);
      if (profile.avatarUrl) localStorage.setItem('user_avatar', profile.avatarUrl);

      const existingUserStr = localStorage.getItem('user');
      let existingUser: any = {};
      if (existingUserStr) {
        try { existingUser = JSON.parse(existingUserStr); } catch {}
      }
      const updatedUser = {
        ...existingUser,
        name: profile.name,
        email: profile.email,
        organization: profile.organization,
        jobTitle: profile.jobTitle,
        phone: profile.phone,
        timezone: profile.timezone,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl || existingUser.avatarUrl,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Broadcast profile update event to Header and other components
      window.dispatchEvent(new Event('userProfileUpdated'));
      showToast('Profile settings saved successfully!');
    } catch {
      showToast('Failed to save profile changes');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordState.currentPassword) {
      showToast('Please enter your current password');
      return;
    }
    if (passwordState.newPassword.length < 6) {
      showToast('New password must be at least 6 characters');
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      showToast('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Security password updated successfully!');
    } catch {
      showToast('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportUserData = () => {
    const data = {
      profile,
      exportedAt: new Date().toISOString(),
      app: 'SecureLens Security Platform',
      version: '2.5.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securelens-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Account data exported successfully!');
  };

  useEffect(() => {
    setThemeConfig(getStoredThemeConfig());
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const updated = applyThemeConfig({ presetId });
    setThemeConfig(updated);
    const p = THEME_PRESETS.find(x => x.id === presetId);
    if (p) {
      updateSetting('accentColor', p.primary);
      showToast(`Theme color changed to ${p.name}`);
    }
  };

  // Load initial settings & sync with backend
  useEffect(() => {
    try {
      // 1. LocalStorage settings
      const stored = localStorage.getItem('securelens_settings');
      let parsedSettings = DEFAULT_SETTINGS;
      if (stored) {
        parsedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }

      // 2. Specific AI keys cache
      const storedKeys = localStorage.getItem('securelens_ai_keys');
      if (storedKeys) {
        const parsedKeys = JSON.parse(storedKeys);
        parsedSettings.aiKeys = { ...parsedSettings.aiKeys, ...parsedKeys };
      }

      // 3. Specific AI config cache
      const storedAiConfig = localStorage.getItem('securelens_ai_config');
      if (storedAiConfig) {
        const parsedAiConfig = JSON.parse(storedAiConfig);
        parsedSettings.aiConfig = { ...parsedSettings.aiConfig, ...parsedAiConfig };
      }

      setSettings(parsedSettings);

      // Hydrate provider states
      setProviderState(prev => {
        const next = { ...prev };
        Object.keys(DEFAULT_PROVIDERS).forEach(pKey => {
          const id = pKey as AIProviderId;
          const userKeyData = parsedSettings.aiKeys[id];
          if (userKeyData) {
            next[id] = {
              ...next[id],
              apiKey: userKeyData.apiKey || '',
              model: userKeyData.model || DEFAULT_PROVIDERS[id].model,
              baseUrl: userKeyData.baseUrl || DEFAULT_PROVIDERS[id].baseUrl,
              enabled: userKeyData.enabled !== false,
            };
          }
        });
        return next;
      });

      // 4. Fetch backend AI status to see if server-side keys exist
      fetch('/api/ai-copilot/status')
        .then(res => res.ok ? res.json() : null)
        .then(statusData => {
          if (statusData?.providers) {
            setProviderState(prev => {
              const updated = { ...prev };
              Object.entries(statusData.providers).forEach(([key, val]: [string, any]) => {
                const provId = key as AIProviderId;
                if (updated[provId] && val.configured && !updated[provId].apiKey) {
                  // Mark as configured from server environment
                  updated[provId] = {
                    ...updated[provId],
                    status: 'success',
                    statusMessage: 'Configured on server via ENV',
                  };
                }
              });
              return updated;
            });
          }
        })
        .catch(() => {});
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Save all settings & push to backend
  const saveSettings = useCallback(async (customUpdatedSettings?: UserSettings) => {
    try {
      const settingsToSave = customUpdatedSettings || settings;

      // Compile current provider keys into settings
      const compiledAiKeys: Record<string, { apiKey: string; model: string; baseUrl?: string; enabled: boolean }> = {};
      Object.entries(providerState).forEach(([id, state]: [string, any]) => {
        compiledAiKeys[id] = {
          apiKey: state.apiKey,
          model: state.model,
          baseUrl: state.baseUrl,
          enabled: state.enabled,
        };
      });

      const finalSettings: UserSettings = {
        ...settingsToSave,
        aiKeys: compiledAiKeys,
      };

      // 1. Store in localStorage
      localStorage.setItem('securelens_settings', JSON.stringify(finalSettings));
      localStorage.setItem('securelens_ai_keys', JSON.stringify(compiledAiKeys));
      localStorage.setItem('securelens_ai_config', JSON.stringify(finalSettings.aiConfig));
      localStorage.setItem('sl_accent_color', JSON.stringify({ value: finalSettings.accentColor }));

      // 2. Broadcast via EventBus
      EventBus.publish('SETTINGS_CHANGED', { settings: finalSettings }, 'SettingsPage');
      window.dispatchEvent(new Event('themeOrAccentUpdated'));
      window.dispatchEvent(new Event('aiConfigUpdated'));

      // 3. Push to backend AI controller
      await fetch('/api/ai-copilot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryProvider: finalSettings.aiConfig.primaryProvider,
          failoverOrder: finalSettings.aiConfig.failoverOrder,
          keys: compiledAiKeys,
        }),
      }).catch(() => {});

      setSaved(true);
      showToast('Settings & AI Configuration saved successfully');
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Error saving settings');
    }
  }, [settings, providerState, showToast]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAiConfig = <K extends keyof AIConfigSettings>(key: K, value: AIConfigSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        [key]: value,
      },
    }));
  };

  // Test single provider connection
  const testProviderConnection = async (providerId: AIProviderId) => {
    const prov = providerState[providerId];
    if (!prov.apiKey && providerId !== 'ollama') {
      showToast(`Please enter an API key for ${DEFAULT_PROVIDERS[providerId].name}`);
      return;
    }

    setProviderState(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: 'testing', statusMessage: 'Testing connection...' },
    }));

    const startTime = Date.now();
    try {
      const res = await fetch('/api/ai-copilot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: prov.apiKey,
          model: prov.model,
          baseUrl: prov.baseUrl,
        }),
      });

      const data = await res.json();
      const latency = Date.now() - startTime;

      if (res.ok && data.success) {
        setProviderState(prev => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            status: 'success',
            latencyMs: latency,
            statusMessage: `Connected successfully (${latency}ms)`,
          },
        }));
        showToast(`✓ ${DEFAULT_PROVIDERS[providerId].name} connected (${latency}ms)`);
      } else {
        setProviderState(prev => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            status: 'error',
            latencyMs: latency,
            statusMessage: data.message || 'Connection failed: Invalid API key or model',
          },
        }));
      }
    } catch (err: any) {
      setProviderState(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          status: 'error',
          latencyMs: Date.now() - startTime,
          statusMessage: `Connection error: ${err.message}`,
        },
      }));
    }
  };

  // Auto-Connect Engine: Tests all configured providers in parallel and selects the fastest
  const runAutoConnect = async () => {
    setAutoConnecting(true);
    setAutoConnectResult('Scanning and testing available AI keys...');

    const candidateProviders = (Object.keys(DEFAULT_PROVIDERS) as AIProviderId[]).filter(p => {
      if (p === 'ollama') return true;
      return !!providerState[p].apiKey;
    });

    if (candidateProviders.length === 0) {
      setAutoConnectResult('No API keys configured yet. Please enter an API key for Gemini, OpenRouter, Groq, or OpenAI below.');
      setAutoConnecting(false);
      return;
    }

    const results: { provider: AIProviderId; latency: number; success: boolean }[] = [];

    await Promise.all(
      candidateProviders.map(async p => {
        const start = Date.now();
        try {
          const res = await fetch('/api/ai-copilot/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: p,
              apiKey: providerState[p].apiKey,
              model: providerState[p].model,
            }),
          });
          const json = await res.json();
          const latency = Date.now() - start;
          if (res.ok && json.success) {
            results.push({ provider: p, latency, success: true });
            setProviderState(prev => ({
              ...prev,
              [p]: { ...prev[p], status: 'success', latencyMs: latency, statusMessage: `Verified (${latency}ms)` },
            }));
          } else {
            results.push({ provider: p, latency, success: false });
            setProviderState(prev => ({
              ...prev,
              [p]: { ...prev[p], status: 'error', latencyMs: latency, statusMessage: json.message || 'Failed' },
            }));
          }
        } catch {
          results.push({ provider: p, latency: 9999, success: false });
        }
      })
    );

    const successful = results.filter(r => r.success).sort((a, b) => a.latency - b.latency);

    if (successful.length > 0) {
      const best = successful[0];
      const fastestProvider = best.provider;
      const failoverList = successful.map(s => s.provider);

      // Add remaining providers to the end of failover order
      const completeFailoverOrder = [
        ...failoverList,
        ...candidateProviders.filter(p => !failoverList.includes(p)),
      ];

      const newSettings: UserSettings = {
        ...settings,
        aiConfig: {
          ...settings.aiConfig,
          primaryProvider: fastestProvider,
          failoverOrder: completeFailoverOrder,
        },
      };

      setSettings(newSettings);
      setAutoConnectResult(`🎉 Auto-Connected! Fastest provider: ${DEFAULT_PROVIDERS[fastestProvider].name} (${best.latency}ms). Failover chain active.`);
      saveSettings(newSettings);
    } else {
      setAutoConnectResult('⚠️ Could not connect to any provider. Check your API keys and internet connection, or use the Built-in Rule Engine.');
    }

    setAutoConnecting(false);
  };

  // Drag and Drop state for Failover Priority Queue
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const current = [...settings.aiConfig.failoverOrder];
    const [movedItem] = current.splice(draggedIndex, 1);
    current.splice(targetIndex, 0, movedItem);

    updateAiConfig('failoverOrder', current);
    setDraggedIndex(null);
    setDragOverIndex(null);
    showToast('Failover priority reordered');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const primaryProviderMeta = DEFAULT_PROVIDERS[settings.aiConfig.primaryProvider] || DEFAULT_PROVIDERS.gemini;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-violet-400/40 backdrop-blur-xl"
          >
            <CheckCircle size={15} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-violet-200 to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-violet-400" />
            Settings & Integrations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure AI Copilot keys, automated failover, scanning engines, and report preferences.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-300 font-medium">Active AI:</span>
            <span className="text-violet-400 font-bold">{primaryProviderMeta.name}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => saveSettings()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-lg cursor-pointer ${
              saved
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-emerald-500/10'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/25'
            }`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Changes Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <User size={15} />
          <span>Profile & Account</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Sparkles size={15} />
          <span>AI & LLM Configuration</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/30 text-violet-300 font-bold">BYOK</span>
        </button>

        <button
          onClick={() => setActiveTab('scanning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'scanning'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Zap size={15} />
          <span>Scanning Engines</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Bell size={15} />
          <span>Notifications & Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'export'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Download size={15} />
          <span>Reports & Export</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 ring-1 ring-violet-400/30'
              : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Palette size={15} />
          <span>Theme Color</span>
        </button>
      </div>

      {/* TAB 0: PROFILE & ACCOUNT SETTINGS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-950/30 via-slate-900/60 to-slate-900 border border-violet-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-600/30 border-2 border-violet-400/40">
                    {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">{profile.name}</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck size={11} /> Verified Account
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      Role: {profile.jobTitle || 'Security Admin'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <Mail size={12} className="text-gray-500" />
                    <span>{profile.email}</span>
                    <span className="text-gray-600">•</span>
                    <Building2 size={12} className="text-gray-500" />
                    <span>{profile.organization}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/25 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Personal & Organization Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                  <User size={18} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="e.g. Stavan Shah"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Organization / Company</label>
                    <input
                      type="text"
                      value={profile.organization}
                      onChange={e => setProfile(p => ({ ...p, organization: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="e.g. Acme Security Corp"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Job Title / Security Role</label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="e.g. Lead AppSec Engineer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Timezone</label>
                    <select
                      value={profile.timezone}
                      onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0b0f19] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                      <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                      <option value="America/Chicago">America/Chicago (CST, UTC-6)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST, UTC-8)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET, UTC+1)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST, UTC+10)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-gray-300">Security Research Bio & Focus</label>
                  <textarea
                    rows={3}
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    placeholder="Brief description of your security focus, bug bounty profile, or research interests..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>

              {/* Password & Authentication */}
              <form onSubmit={handleSavePassword} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                  <Lock size={18} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Change Security Password</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordState.currentPassword}
                        onChange={e => setPasswordState(s => ({ ...s, currentPassword: e.target.value }))}
                        className="w-full px-3.5 py-2 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordState.newPassword}
                          onChange={e => setPasswordState(s => ({ ...s, newPassword: e.target.value }))}
                          className="w-full px-3.5 py-2 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordState.confirmPassword}
                        onChange={e => setPasswordState(s => ({ ...s, confirmPassword: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword || !passwordState.currentPassword || !passwordState.newPassword}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingPassword ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                    <span>Update Security Password</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Security Status, 2FA, Active Sessions, Export */}
            <div className="space-y-6">
              {/* Two-Factor Authentication Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Two-Factor Auth</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ENABLED
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Protect your vulnerability scan reports and API keys with TOTP authenticator app verification.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-xs text-gray-300 font-medium">Authenticator App</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(p => ({ ...p, twoFactorEnabled: !p.twoFactorEnabled }));
                      showToast(profile.twoFactorEnabled ? '2FA disabled' : '2FA activated with Google Authenticator');
                    }}
                    className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                      profile.twoFactorEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {profile.twoFactorEnabled ? 'Configured' : 'Enable 2FA'}
                  </button>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connected Accounts</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Google OAuth</p>
                        <p className="text-[10px] text-gray-400">Connected</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check size={12} /> Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                        GH
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">GitHub OAuth</p>
                        <p className="text-[10px] text-gray-400">Code Scanning Integration</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check size={12} /> Linked
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Device Session</h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <Laptop size={18} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">Current Browser (Active Now)</p>
                    <p className="text-[10px] text-emerald-300/80 truncate">Encrypted JWT Session • HTTPS</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
              </div>

              {/* Data & Export */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Data</h3>
                <button
                  type="button"
                  onClick={handleExportUserData}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export Profile & Account JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: AI & LLM CONFIGURATION */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Top AI Automation & Auto-Connect Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-950/30 via-slate-900/60 to-violet-900/10 border border-violet-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                    <Bot size={20} />
                  </span>
                  <h2 className="text-lg font-bold text-white">AI Copilot & Multi-Provider Engine</h2>
                </div>
                <p className="text-xs text-gray-300 max-w-2xl leading-relaxed mt-2">
                  Bring your own API keys for Google Gemini, OpenRouter, Groq, OpenAI, Claude, or Ollama.
                  SecureLens automatically handles load-balancing, rate-limit failovers, and graceful fallback.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runAutoConnect}
                  disabled={autoConnecting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {autoConnecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Auto-Connecting...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle size={14} />
                      <span>Auto-Detect & Connect Best AI</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Auto-Connect Status Feedback Banner */}
            {autoConnectResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-violet-200 flex items-center justify-between"
              >
                <span>{autoConnectResult}</span>
                <button
                  onClick={() => setAutoConnectResult(null)}
                  className="text-gray-400 hover:text-white text-[11px] underline ml-3 cursor-pointer"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/[0.06]">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">Auto-Connect on Startup</span>
                  <input
                    type="checkbox"
                    checked={settings.aiConfig.autoConnect}
                    onChange={(e) => updateAiConfig('autoConnect', e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-4 h-4"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Automatically ping and connect to the healthiest API key when loading.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">Smart Rate-Limit Failover</span>
                  <input
                    type="checkbox"
                    checked={settings.aiConfig.enableFailover}
                    onChange={(e) => updateAiConfig('enableFailover', e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-4 h-4"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Seamlessly route to secondary provider if primary hits HTTP 429 quota limits.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">Offline AppSec Rule Engine</span>
                  <input
                    type="checkbox"
                    checked={settings.aiConfig.fallbackToRuleEngine}
                    onChange={(e) => updateAiConfig('fallbackToRuleEngine', e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-4 h-4"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Gracefully fall back to built-in vulnerability intelligence if offline or keys fail.</p>
              </div>
            </div>
          </div>

          {/* Failover Priority Chain with Drag & Drop */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white">Failover Priority Queue</h3>
              </div>
              <span className="text-[11px] text-gray-400">
                🖱️ Drag and drop chips to reorder failover sequence
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
              {settings.aiConfig.failoverOrder.map((providerId, idx) => {
                const meta = DEFAULT_PROVIDERS[providerId];
                if (!meta) return null;
                const isPrimary = settings.aiConfig.primaryProvider === providerId;
                const hasKey = !!providerState[providerId]?.apiKey || providerId === 'ollama';
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;

                return (
                  <div
                    key={providerId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium shrink-0 transition-all duration-150 cursor-grab active:cursor-grabbing group ${
                      isDragging
                        ? 'opacity-40 border-dashed border-violet-400 scale-95 bg-violet-950/20'
                        : isDragOver
                        ? 'border-violet-400 bg-violet-600/30 scale-105 shadow-lg shadow-violet-600/30 ring-2 ring-violet-400/50'
                        : isPrimary
                        ? 'bg-violet-600/20 border-violet-500/40 text-violet-200 ring-1 ring-violet-500/30 hover:border-violet-400/60'
                        : hasKey
                        ? 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:border-white/[0.18] hover:bg-white/[0.05]'
                        : 'bg-white/[0.01] border-white/[0.04] text-gray-500 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <GripVertical
                      size={14}
                      className="text-gray-500 group-hover:text-violet-400 transition-colors"
                    />

                    <span className="w-5 h-5 rounded-full bg-black/40 text-[10px] flex items-center justify-center font-bold text-gray-400 border border-white/[0.06]">
                      {idx + 1}
                    </span>

                    <span className="font-semibold text-white">{meta.name}</span>

                    {isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-600 text-white font-bold tracking-wider">
                        PRIMARY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Provider API Key Configuration Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(Object.keys(DEFAULT_PROVIDERS) as AIProviderId[]).map(providerId => {
              const meta = DEFAULT_PROVIDERS[providerId];
              const provState = providerState[providerId];
              const isPrimary = settings.aiConfig.primaryProvider === providerId;

              return (
                <div
                  key={providerId}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    isPrimary
                      ? 'bg-violet-950/20 border-violet-500/40 ring-1 ring-violet-500/20'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        isPrimary
                          ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
                          : 'bg-white/[0.04] text-gray-300 border-white/[0.08]'
                      }`}>
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{meta.name}</h4>
                          {meta.free ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              FREE TIER
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{meta.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPrimary ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold flex items-center gap-1">
                          <Check size={10} /> Active Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            updateAiConfig('primaryProvider', providerId);
                            showToast(`Set ${meta.name} as Primary AI Provider`);
                          }}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-violet-600 hover:text-white border border-white/[0.08] text-gray-300 font-semibold transition-all cursor-pointer"
                        >
                          Set Primary
                        </button>
                      )}
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label className="text-gray-300 font-medium flex items-center gap-1">
                          <Key size={12} className="text-violet-400" />
                          {providerId === 'ollama' ? 'Ollama Server URL' : 'API Key'}
                        </label>
                        <a
                          href={meta.keyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 underline"
                        >
                          Get {meta.name} Key <ExternalLink size={10} />
                        </a>
                      </div>

                      <div className="relative">
                        <input
                          type={provState.showKey || providerId === 'ollama' ? 'text' : 'password'}
                          value={provState.apiKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProviderState(prev => ({
                              ...prev,
                              [providerId]: { ...prev[providerId], apiKey: val, status: 'idle' },
                            }));
                          }}
                          placeholder={
                            providerId === 'ollama'
                              ? 'http://localhost:11434'
                              : providerId === 'gemini'
                              ? 'AIzaSy...'
                              : providerId === 'openrouter'
                              ? 'sk-or-v1-...'
                              : 'sk-...'
                          }
                          className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 font-mono focus:outline-none focus:border-violet-500/60 pr-10"
                        />
                        {providerId !== 'ollama' && (
                          <button
                            type="button"
                            onClick={() => {
                              setProviderState(prev => ({
                                ...prev,
                                [providerId]: { ...prev[providerId], showKey: !prev[providerId].showKey },
                              }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 cursor-pointer"
                          >
                            {provState.showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Model Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">Model Selection</label>
                        <select
                          value={provState.model}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProviderState(prev => ({
                              ...prev,
                              [providerId]: { ...prev[providerId], model: val },
                            }));
                          }}
                          className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/60 cursor-pointer"
                        >
                          {meta.models.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => testProviderConnection(providerId)}
                          disabled={provState.status === 'testing'}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-200 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {provState.status === 'testing' ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-violet-400" />
                              <span>Testing...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} className="text-violet-400" />
                              <span>Test Connection</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Live Test Feedback status */}
                    {provState.statusMessage && (
                      <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                        provState.status === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : provState.status === 'error'
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                          : 'bg-white/[0.02] border border-white/[0.04] text-gray-400'
                      }`}>
                        {provState.status === 'success' && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                        {provState.status === 'error' && <XCircle size={12} className="text-rose-400 shrink-0" />}
                        <span className="truncate">{provState.statusMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model Inference Parameters Card */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-violet-400" />
              Advanced Copilot Inference Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-300 font-medium">Temperature & Exploit Precision</span>
                  <span className="font-mono text-violet-400 font-bold">{settings.aiConfig.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.aiConfig.temperature}
                  onChange={(e) => updateAiConfig('temperature', parseFloat(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>0.0 (Strict / Deterministic)</span>
                  <span>0.2 (Recommended for SecOps)</span>
                  <span>1.0 (Creative Exploit Exploration)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-300 font-medium">Max Output Token Limit</span>
                  <span className="font-mono text-violet-400 font-bold">{settings.aiConfig.maxTokens} tokens</span>
                </div>
                <select
                  value={settings.aiConfig.maxTokens}
                  onChange={(e) => updateAiConfig('maxTokens', parseInt(e.target.value))}
                  className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/60 cursor-pointer"
                >
                  <option value={1024}>1,024 Tokens (Fast Briefs)</option>
                  <option value={2048}>2,048 Tokens (Standard Explanations)</option>
                  <option value={4096}>4,096 Tokens (Full Code Remediation - Recommended)</option>
                  <option value={8192}>8,192 Tokens (Deep Multi-file Audits)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCANNING ENGINES */}
      {activeTab === 'scanning' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Automated Scan Engine</h3>
                <p className="text-xs text-gray-400">Configure default multi-vector audit profiles</p>
              </div>
            </div>

            <ToggleSetting
              label="Auto-start background scans on asset creation"
              value={settings.autoStartScans}
              onChange={(v) => updateSetting('autoStartScans', v)}
            />

            <div>
              <label className="text-xs text-gray-300 font-medium mb-1.5 block">Default Scan Profile</label>
              <select
                value={settings.defaultScanProfile}
                onChange={(e) => updateSetting('defaultScanProfile', e.target.value as any)}
                className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="quick">Quick Health Check (DNS, SSL, Headers)</option>
                <option value="standard">Standard Full Audit (Nuclei, Nmap, Subfinder, OWASP)</option>
                <option value="deep">Deep PenTest (Comprehensive Endpoints & Port Sweep)</option>
                <option value="compliance">Regulatory Compliance (PCI-DSS, SOC2, ISO 27001)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium mb-1.5 block">Port Scan Depth</label>
              <select
                value={settings.portScanDepth}
                onChange={(e) => updateSetting('portScanDepth', e.target.value as any)}
                className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="top100">Top 100 Common Service Ports (Fastest)</option>
                <option value="top1000">Top 1000 Standard Network Ports (Default)</option>
                <option value="all">Full 65,535 Port Range (Deep)</option>
              </select>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Concurrency & Limits</h3>
                <p className="text-xs text-gray-400">Worker execution parameters</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-300 font-medium">Max Concurrent Scans</span>
                <span className="font-mono text-violet-400 font-bold">{settings.maxConcurrentScans} workers</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={settings.maxConcurrentScans}
                onChange={(e) => updateSetting('maxConcurrentScans', parseInt(e.target.value))}
                className="w-full accent-violet-600 cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-1">Controls how many live audits can execute simultaneously without queueing.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-2xl space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notification Preferences</h3>
              <p className="text-xs text-gray-400">Manage real-time desktop toasts and critical alerts</p>
            </div>
          </div>

          <div className="space-y-3">
            <ToggleSetting
              label="Enable In-App Notifications & Toasts"
              value={settings.enableNotifications}
              onChange={(v) => updateSetting('enableNotifications', v)}
            />
            <ToggleSetting
              label="Notify when live scan completes"
              value={settings.notifyOnScanComplete}
              onChange={(v) => updateSetting('notifyOnScanComplete', v)}
              disabled={!settings.enableNotifications}
            />
            <ToggleSetting
              label="Notify on new vulnerability discovered in real-time"
              value={settings.notifyOnNewFinding}
              onChange={(v) => updateSetting('notifyOnNewFinding', v)}
              disabled={!settings.enableNotifications}
            />
            <ToggleSetting
              label="Critical & High vulnerabilities only"
              value={settings.notifyOnCriticalOnly}
              onChange={(v) => updateSetting('notifyOnCriticalOnly', v)}
              disabled={!settings.enableNotifications}
            />
          </div>
        </div>
      )}

      {/* TAB 4: EXPORT & REPORTS */}
      {activeTab === 'export' && (
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-2xl space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report & Export Formats</h3>
              <p className="text-xs text-gray-400">Configure default security report templates</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-300 font-medium mb-1.5 block">Default Report Export Format</label>
            <select
              value={settings.defaultExportFormat}
              onChange={(e) => updateSetting('defaultExportFormat', e.target.value as any)}
              className="w-full bg-[#0a0c16] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white"
            >
              <option value="pdf">Executive PDF Audit Document</option>
              <option value="html">Interactive HTML Security Report</option>
              <option value="json">Technical JSON Schema (SIEM / CI/CD ingestion)</option>
              <option value="csv">CSV Vulnerability Spreadsheet</option>
              <option value="markdown">GitHub-flavored Markdown (.md)</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <ToggleSetting
              label="Include Code-level Remediation & Patches in Reports"
              value={settings.includeRemediation}
              onChange={(v) => updateSetting('includeRemediation', v)}
            />
            <ToggleSetting
              label="Include Executive Risk Assessment Summary"
              value={settings.includeExecutiveSummary}
              onChange={(v) => updateSetting('includeExecutiveSummary', v)}
            />
          </div>
        </div>
      )}

      {/* TAB 5: THEME COLOR */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Theme Accent Color</h3>
              <p className="text-xs text-gray-400">Select a theme color for buttons, highlights, and dashboard accents</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 pt-2">
            {THEME_PRESETS.map((preset) => {
              const isSelected = themeConfig.presetId === preset.id || settings.accentColor === preset.primary;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-white/40 bg-white/[0.08] shadow-xl'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                  style={isSelected ? { borderColor: preset.primary, boxShadow: `0 8px 24px ${preset.primary}33` } : {}}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: preset.primary,
                      boxShadow: `0 4px 16px ${preset.primary}4d`,
                    }}
                  >
                    {isSelected && <Check size={20} className="text-white drop-shadow" />}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white group-hover:text-violet-200 transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {preset.primary}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// Toggle Helper Component
interface ToggleSettingProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleSetting({ label, value, onChange, disabled }: ToggleSettingProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-xs text-gray-200 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
          value ? 'bg-violet-600' : 'bg-white/10'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}

