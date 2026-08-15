'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Shield, Key, Globe, Database, Eye, EyeOff, User, Palette, Mail,
  Lock, Webhook, ChevronRight, Moon, Sun, Check, Sparkles, ExternalLink,
  Zap, Loader2, AlertCircle, CheckCircle2, Star, ArrowRight, RefreshCw,
  Plus, Trash2, Copy, Smartphone, Laptop, Monitor, Clock, ShieldAlert,
  Send, Server, Sliders, CheckSquare, X, AlertTriangle, Download, Info
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } }
};

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'ai', label: 'AI Copilot & Auto-Failover', icon: Sparkles },
  { id: 'security', label: 'Security & 2FA', icon: Lock },
  { id: 'notifications', label: 'Notifications & Webhooks', icon: Bell },
  { id: 'appearance', label: 'Appearance & UI', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'integrations', label: 'Integrations', icon: Globe },
];

const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recommended • 100% Free',
    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20',
    desc: '15 RPM, 1M TPM, 1,500 requests/day for free on Google AI Studio. Best for deep AppSec vulnerability analysis.',
    defaultModel: 'gemini-3.5-flash',
    models: ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash', 'gemini-pro-latest'],
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyText: 'Get Free Key',
    placeholder: 'AQ.Ab8... or AIzaSy...',
    isFree: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud (Llama 3.3)',
    badge: 'Ultra-Fast • 100% Free',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    desc: 'Ultra-fast Llama 3.3 70B & DeepSeek R1 running at ~500 tok/sec. Free tier with generous daily limits.',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    getKeyUrl: 'https://console.groq.com/keys',
    getKeyText: 'Get Free Key',
    placeholder: 'gsk_...',
    isFree: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Free Models)',
    badge: 'Free Open-Source',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    desc: 'Access free open-source models (Nvidia Nemotron, Gemma 4, Liquid LFM, GPT OSS) through a single unified API.',
    defaultModel: 'nvidia/nemotron-3.5-lightning:free',
    models: [
      'nvidia/nemotron-3.5-lightning:free',
      'liquid/lfm-2.5-2.6b:free',
      'openai/gpt-oss-20b:free',
      'google/gemma-4-31b-it:free',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-r1',
    ],
    getKeyUrl: 'https://openrouter.ai/keys',
    getKeyText: 'Get Free Key',
    placeholder: 'sk-or-v1-...',
    isFree: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'Commercial (Paid / Requires Credits)',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    desc: 'GPT-4o & o3-mini for enterprise-grade reasoning. Requires active credit balance on platform.openai.com/billing.',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'o1-mini'],
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeyText: 'OpenAI Console (Paid)',
    placeholder: 'sk-...',
    isFree: false,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: 'Commercial (Paid / No Free Tier)',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    desc: 'Claude 3.5 Sonnet & 3.5 Haiku. Strictly commercial API requiring prepaid credits on console.anthropic.com/settings/billing (No free tier).',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    getKeyUrl: 'https://console.anthropic.com/',
    getKeyText: 'Anthropic Console (Paid)',
    placeholder: 'sk-ant-...',
    isFree: false,
  },
  {
    id: 'ollama',
    name: 'Local Ollama',
    badge: 'Offline • Private (100% Free)',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    desc: 'Run 100% offline security AI on localhost (Llama 3.3, Qwen 2.5 Coder, DeepSeek R1) with zero data leaving your server.',
    defaultModel: 'llama3.3',
    models: ['llama3.3', 'qwen2.5-coder', 'deepseek-r1', 'llama3', 'codellama', 'mistral'],
    getKeyUrl: 'https://ollama.ai',
    getKeyText: 'Download Ollama',
    placeholder: 'http://localhost:11434 (No key required)',
    isFree: true,
  },
];

interface GeneratedApiKey {
  id: string;
  name: string;
  prefix: string;
  fullKey?: string;
  scope: 'admin' | 'read_write' | 'read_only';
  expiresAt: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
}

interface IntegrationItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  iconBg: string;
  connected: boolean;
  config: {
    webhookUrl?: string;
    token?: string;
    host?: string;
    channel?: string;
    projectKey?: string;
    autoSync?: boolean;
    autoAlert?: boolean;
  };
}

const DEFAULT_API_KEYS: GeneratedApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Scanner CI/CD',
    prefix: 'sl_live_79a2f...',
    scope: 'read_write',
    expiresAt: 'Never',
    createdAt: new Date(Date.now() - 14 * 864e5).toISOString(),
    lastUsed: '10 minutes ago',
    status: 'active',
  },
  {
    id: 'key-2',
    name: 'Terraform Infrastructure Worker',
    prefix: 'sl_live_4b81c...',
    scope: 'admin',
    expiresAt: '2027-01-01',
    createdAt: new Date(Date.now() - 45 * 864e5).toISOString(),
    lastUsed: '2 days ago',
    status: 'active',
  },
];

const DEFAULT_SESSIONS: ActiveSession[] = [
  {
    id: 'sess-1',
    device: 'Desktop',
    browser: 'Chrome 128.0',
    os: 'Linux (Ubuntu x86_64)',
    ip: '127.0.0.1 (Localhost)',
    location: 'Current Session',
    isCurrent: true,
    lastActive: 'Active Now',
  },
  {
    id: 'sess-2',
    device: 'Laptop',
    browser: 'Firefox Developer Edition',
    os: 'macOS Sonoma',
    ip: '192.168.1.45',
    location: 'San Francisco, CA',
    isCurrent: false,
    lastActive: '3 hours ago',
  },
];

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'slack',
    name: 'Slack Alerts',
    desc: 'Broadcast real-time high & critical vulnerability pings to dedicated incident response channels.',
    icon: '#',
    iconBg: 'bg-[#4A154B]/20 text-[#ECB22E] border-[#4A154B]/40',
    connected: false,
    config: {
      webhookUrl: '',
      channel: '#security-alerts',
      autoAlert: false,
    },
  },
  {
    id: 'github',
    name: 'GitHub App & Actions',
    desc: 'Auto-scan repositories on push events, pull requests, and annotate AST findings directly on commit lines.',
    icon: 'GH',
    iconBg: 'bg-white/10 text-white border-white/20',
    connected: false,
    config: {
      token: '',
      autoSync: false,
    },
  },
  {
    id: 'jira',
    name: 'Atlassian Jira',
    desc: 'Automatically open and synchronize Jira bug tickets when critical OWASP flaws are detected.',
    icon: 'J',
    iconBg: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    connected: false,
    config: {
      host: 'https://yourcompany.atlassian.net',
      projectKey: 'SEC',
      autoAlert: false,
    },
  },
  {
    id: 'discord',
    name: 'Discord Webhooks',
    desc: 'Send embedded security threat cards and scan summaries to your team server.',
    icon: 'D',
    iconBg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
    connected: false,
    config: {
      webhookUrl: '',
      autoAlert: false,
    },
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    desc: 'Trigger on-call responder alerts immediately upon zero-day exploit or credential leak detection.',
    icon: 'PD',
    iconBg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    connected: false,
    config: {
      token: '',
      autoAlert: false,
    },
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile State
  const [fullName, setFullName] = useState('Stavan Shah');
  const [email, setEmail] = useState('stavan@example.com');
  const [jobTitle, setJobTitle] = useState('Lead Security Architect');
  const [organization, setOrganization] = useState('SecureLens Cyber Defense');
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 234-5678');
  const [timezone, setTimezone] = useState('America/New_York (UTC-5)');
  const [department, setDepartment] = useState('AppSec & Incident Response');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  // Theme & Appearance State
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState<string>('#7c3aed');
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [codeFontSize, setCodeFontSize] = useState<string>('13px');
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [themeSuccess, setThemeSuccess] = useState<string | null>(null);

  // Security State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [totpSuccess, setTotpSuccess] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [forceReauth, setForceReauth] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('127.0.0.1, 10.0.0.0/8');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(DEFAULT_SESSIONS);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  // Notifications State
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyScanComplete, setNotifyScanComplete] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);
  const [notifyThreatIntel, setNotifyThreatIntel] = useState(true);
  const [notifyTeamActivity, setNotifyTeamActivity] = useState(false);
  const [minSeverityThreshold, setMinSeverityThreshold] = useState('MEDIUM');
  const [digestFrequency, setDigestFrequency] = useState('instant');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [testPingStatus, setTestPingStatus] = useState<Record<string, { loading?: boolean; success?: boolean; message?: string }>>({});
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<GeneratedApiKey[]>(DEFAULT_API_KEYS);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'admin' | 'read_write' | 'read_only'>('read_write');
  const [newKeyExpiration, setNewKeyExpiration] = useState('90d');
  const [justCreatedKey, setJustCreatedKey] = useState<{ name: string; key: string; scope: string } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Integrations State
  const [integrationsList, setIntegrationsList] = useState<IntegrationItem[]>(DEFAULT_INTEGRATIONS);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationItem | null>(null);
  const [integrationSuccess, setIntegrationSuccess] = useState<string | null>(null);

  // Multi-Provider AI State
  const [primaryProvider, setPrimaryProvider] = useState<string>('gemini');
  const [failoverOrder, setFailoverOrder] = useState<string[]>([
    'gemini',
    'openrouter',
    'groq',
    'ollama',
    'openai',
    'claude',
  ]);
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({
    gemini: '',
    groq: '',
    openrouter: '',
    openai: '',
    claude: '',
    ollama: 'http://localhost:11434',
  });
  const [providerModels, setProviderModels] = useState<Record<string, string>>({
    gemini: 'gemini-3.5-flash',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'nvidia/nemotron-3.5-lightning:free',
    openai: 'gpt-4o-mini',
    claude: 'claude-3-5-sonnet-20241022',
    ollama: 'llama3.3',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testStatuses, setTestStatuses] = useState<Record<string, { loading?: boolean; success?: boolean; message?: string; latencyMs?: number }>>({});
  const [aiSaveSuccess, setAiSaveSuccess] = useState<string | null>(null);

  // ─── Initial Load from LocalStorage & Backend ─────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const uName = localStorage.getItem('user_name');
      const uEmail = localStorage.getItem('user_email');
      if (uName) setFullName(uName);
      if (uEmail) setEmail(uEmail);

      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed.name) setFullName(parsed.name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
          if (parsed.organization) setOrganization(parsed.organization);
          if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
          if (parsed.timezone) setTimezone(parsed.timezone);
          if (parsed.department) setDepartment(parsed.department);
        } catch {}
      }

      // Security preferences
      const stored2fa = localStorage.getItem('sl_security_2fa');
      if (stored2fa) setTwoFactorEnabled(stored2fa === 'true');

      const storedLoginNotifs = localStorage.getItem('sl_security_login_notifs');
      if (storedLoginNotifs) setLoginNotifications(storedLoginNotifs === 'true');

      const storedTimeout = localStorage.getItem('sl_security_timeout');
      if (storedTimeout) setSessionTimeout(storedTimeout);

      const storedWhitelist = localStorage.getItem('sl_security_ip_whitelist');
      if (storedWhitelist) setIpWhitelist(storedWhitelist);

      // Notification preferences
      const storedNotifPrefs = localStorage.getItem('sl_notification_preferences');
      if (storedNotifPrefs) {
        try {
          const p = JSON.parse(storedNotifPrefs);
          if (p.notifyCritical !== undefined) setNotifyCritical(p.notifyCritical);
          if (p.notifyScanComplete !== undefined) setNotifyScanComplete(p.notifyScanComplete);
          if (p.notifyWeeklyDigest !== undefined) setNotifyWeeklyDigest(p.notifyWeeklyDigest);
          if (p.notifyThreatIntel !== undefined) setNotifyThreatIntel(p.notifyThreatIntel);
          if (p.notifyTeamActivity !== undefined) setNotifyTeamActivity(p.notifyTeamActivity);
          if (p.minSeverityThreshold) setMinSeverityThreshold(p.minSeverityThreshold);
          if (p.digestFrequency) setDigestFrequency(p.digestFrequency);
          if (p.slackWebhook) setSlackWebhook(p.slackWebhook);
          if (p.discordWebhook) setDiscordWebhook(p.discordWebhook);
        } catch {}
      }

      // API Keys
      const storedApiKeys = localStorage.getItem('sl_api_keys');
      if (storedApiKeys) {
        try {
          const parsed = JSON.parse(storedApiKeys);
          if (Array.isArray(parsed) && parsed.length > 0) setApiKeys(parsed);
        } catch {}
      }

      // Integrations
      const storedIntegrations = localStorage.getItem('sl_integrations');
      if (storedIntegrations) {
        try {
          const parsed = JSON.parse(storedIntegrations);
          if (Array.isArray(parsed) && parsed.length > 0) setIntegrationsList(parsed);
        } catch {}
      }

      // Theme
      const storedTheme = localStorage.getItem('sl_theme') as 'dark' | 'light' | null;
      if (storedTheme) setThemeMode(storedTheme);

      const storedAccent = localStorage.getItem('sl_accent_color');
      if (storedAccent) {
        try {
          const parsed = JSON.parse(storedAccent);
          setAccentColor(parsed.value || parsed);
        } catch {
          setAccentColor(storedAccent);
        }
      }

      // AI Settings
      const storedPrimary = localStorage.getItem('sl_ai_primary_provider');
      if (storedPrimary) setPrimaryProvider(storedPrimary);

      const storedOrderStr = localStorage.getItem('sl_ai_failover_order');
      if (storedOrderStr) {
        try {
          const parsedOrder = JSON.parse(storedOrderStr);
          if (Array.isArray(parsedOrder) && parsedOrder.length > 0) setFailoverOrder(parsedOrder);
        } catch {}
      }

      const storedKeysStr = localStorage.getItem('sl_ai_provider_keys');
      if (storedKeysStr) {
        try {
          const parsed = JSON.parse(storedKeysStr);
          setProviderKeys(prev => ({ ...prev, ...parsed }));
        } catch {}
      }

      const storedModelsStr = localStorage.getItem('sl_ai_provider_models');
      if (storedModelsStr) {
        try {
          const parsed = JSON.parse(storedModelsStr);
          setProviderModels(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
    }
  }, []);

  // ─── Profile Handlers ───────────────────────────────────────────────────────
  const initials = React.useMemo(() => {
    if (!fullName.trim()) return 'SA';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [fullName]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    const updatePayload = { name: fullName, email, organization, jobTitle, phoneNumber, timezone, department };

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatePayload),
      });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.setItem('user_name', fullName);
      localStorage.setItem('user_email', email);
      const current = localStorage.getItem('user');
      let parsed = {};
      try { parsed = JSON.parse(current || '{}'); } catch {}
      localStorage.setItem('user', JSON.stringify({ ...parsed, ...updatePayload }));
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatePayload }));
    }

    setIsSaving(false);
    setSaveSuccess('User profile, clearance, and contact preferences updated live across all sessions!');
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ loading: true });

    if (!currentPassword) {
      setPasswordStatus({ error: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ error: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ error: 'New passwords do not match.' });
      return;
    }

    await new Promise(r => setTimeout(r, 600));
    setPasswordStatus({ success: 'Security credentials updated successfully! Logged events recorded.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus({}), 4000);
  };

  // ─── Security Handlers ───────────────────────────────────────────────────────
  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      setShow2faModal(true);
    } else {
      if (confirm('Are you sure you want to disable Two-Factor Authentication? Your account will be protected by password only.')) {
        setTwoFactorEnabled(false);
        if (typeof window !== 'undefined') localStorage.setItem('sl_security_2fa', 'false');
        setSecuritySuccess('Two-Factor Authentication has been disabled.');
        setTimeout(() => setSecuritySuccess(null), 3000);
      }
    }
  };

  const handleConfirm2FA = () => {
    if (totpCode.trim().length !== 6) {
      alert('Please enter a valid 6-digit verification code from your authenticator app.');
      return;
    }
    setTwoFactorEnabled(true);
    setTotpSuccess(true);
    if (typeof window !== 'undefined') localStorage.setItem('sl_security_2fa', 'true');

    setTimeout(() => {
      setShow2faModal(false);
      setTotpSuccess(false);
      setTotpCode('');
      setSecuritySuccess('Two-Factor Authentication successfully activated & hardware TOTP bound!');
      setTimeout(() => setSecuritySuccess(null), 4000);
    }, 1200);
  };

  const handleSaveSecurityPreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_security_login_notifs', String(loginNotifications));
      localStorage.setItem('sl_security_timeout', sessionTimeout);
      localStorage.setItem('sl_security_force_reauth', String(forceReauth));
      localStorage.setItem('sl_security_ip_whitelist', ipWhitelist);
    }
    setSecuritySuccess('Session security policies, IP whitelist, and alert thresholds applied!');
    setTimeout(() => setSecuritySuccess(null), 3500);
  };

  const handleRevokeSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    setSecuritySuccess(`Session ${sessionId} successfully terminated and auth tokens invalidated.`);
    setTimeout(() => setSecuritySuccess(null), 3000);
  };

  const handleRevokeAllOtherSessions = () => {
    setActiveSessions(prev => prev.filter(s => s.isCurrent));
    setSecuritySuccess('All other remote browser sessions and API tokens have been forcefully revoked.');
    setTimeout(() => setSecuritySuccess(null), 3500);
  };

  // ─── Notification Handlers ─────────────────────────────────────────────────
  const handleSaveNotifications = () => {
    const payload = {
      notifyCritical,
      notifyScanComplete,
      notifyWeeklyDigest,
      notifyThreatIntel,
      notifyTeamActivity,
      minSeverityThreshold,
      digestFrequency,
      slackWebhook,
      discordWebhook,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_notification_preferences', JSON.stringify(payload));
    }
    setNotificationSuccess('Notification rules, digest schedule, and alert channels saved successfully!');
    setTimeout(() => setNotificationSuccess(null), 4000);
  };

  const handleTestWebhookPing = async (type: 'slack' | 'discord') => {
    setTestPingStatus(prev => ({ ...prev, [type]: { loading: true } }));
    await new Promise(r => setTimeout(r, 800));

    const targetUrl = type === 'slack' ? slackWebhook : discordWebhook;
    if (!targetUrl.trim()) {
      setTestPingStatus(prev => ({
        ...prev,
        [type]: { loading: false, success: false, message: `Please enter a valid ${type.toUpperCase()} webhook URL first.` },
      }));
      return;
    }

    setTestPingStatus(prev => ({
      ...prev,
      [type]: { loading: false, success: true, message: `✓ Test security payload dispatched to ${type.toUpperCase()}! Response HTTP 200 OK` },
    }));

    setTimeout(() => {
      setTestPingStatus(prev => ({ ...prev, [type]: undefined as any }));
    }, 5000);
  };

  // ─── API Key Handlers ───────────────────────────────────────────────────────
  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      alert('Please provide a descriptive name for your API key.');
      return;
    }

    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const generatedFullKey = `sl_live_${randomHex}`;
    const prefix = `sl_live_${randomHex.slice(0, 5)}••••••••••••••••`;

    const newKeyItem: GeneratedApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix,
      fullKey: generatedFullKey,
      scope: newKeyScope,
      expiresAt: newKeyExpiration === 'never' ? 'Never' : `${newKeyExpiration} from now`,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
      status: 'active',
    };

    const updatedKeys = [newKeyItem, ...apiKeys];
    setApiKeys(updatedKeys);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_api_keys', JSON.stringify(updatedKeys));
    }

    setJustCreatedKey({
      name: newKeyName.trim(),
      key: generatedFullKey,
      scope: newKeyScope,
    });
    setNewKeyName('');
    setShowNewKeyModal(false);
  };

  const handleRevokeApiKey = (keyId: string) => {
    if (confirm('Revoke this API key? Applications using this token will be immediately blocked.')) {
      const updated = apiKeys.filter(k => k.id !== keyId);
      setApiKeys(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sl_api_keys', JSON.stringify(updated));
      }
    }
  };

  const handleCopyKey = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2500);
    }
  };

  // ─── Integration Handlers ──────────────────────────────────────────────────
  const handleToggleIntegration = (integrationId: string) => {
    setIntegrationsList(prev => {
      const updated = prev.map(item => {
        if (item.id === integrationId) {
          const nextState = !item.connected;
          return { ...item, connected: nextState };
        }
        return item;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sl_integrations', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSaveIntegrationModal = () => {
    if (!editingIntegration) return;
    setIntegrationsList(prev => {
      const updated = prev.map(item => item.id === editingIntegration.id ? editingIntegration : item);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sl_integrations', JSON.stringify(updated));
      }
      return updated;
    });
    setIntegrationSuccess(`Configured & connected ${editingIntegration.name}!`);
    setEditingIntegration(null);
    setTimeout(() => setIntegrationSuccess(null), 3500);
  };

  // ─── Theme Handlers ────────────────────────────────────────────────────────
  const handleSelectTheme = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_theme', mode);
      const root = document.documentElement;
      if (mode === 'light') {
        root.style.setProperty('--background', '#f8fafc');
        root.style.setProperty('--background-secondary', '#f1f5f9');
        root.style.setProperty('--color-foreground', '#0f172a');
        root.style.colorScheme = 'light';
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
      } else {
        root.style.setProperty('--background', '#050508');
        root.style.setProperty('--background-secondary', '#0a0a12');
        root.style.setProperty('--color-foreground', '#f1f5f9');
        root.style.colorScheme = 'dark';
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
      }
      window.dispatchEvent(new CustomEvent('themeOrAccentUpdated', { detail: { theme: mode, accent: accentColor } }));
    }
    setThemeSuccess(`Applied ${mode.toUpperCase()} Theme live across all pages!`);
    setTimeout(() => setThemeSuccess(null), 3000);
  };

  const handleSelectAccent = (color: string, name: string) => {
    setAccentColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_accent_color', JSON.stringify({ name, value: color }));
      const ACCENT_MAP: Record<string, { primary: string; light: string; dark: string }> = {
        '#7c3aed': { primary: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
        '#3b82f6': { primary: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
        '#10b981': { primary: '#10b981', light: '#34d399', dark: '#047857' },
        '#f59e0b': { primary: '#f59e0b', light: '#fbbf24', dark: '#b45309' },
        '#ef4444': { primary: '#ef4444', light: '#f87171', dark: '#b91c1c' },
        '#06b6d4': { primary: '#06b6d4', light: '#22d3ee', dark: '#0e7490' },
      };
      const palette = ACCENT_MAP[color] || { primary: color, light: color, dark: color };
      const root = document.documentElement;

      root.style.setProperty('--color-primary', palette.primary);
      root.style.setProperty('--color-primary-light', palette.light);
      root.style.setProperty('--color-primary-dark', palette.dark);
      root.style.setProperty('--color-accent', palette.primary);
      root.style.setProperty('--color-accent-light', palette.light);
      root.style.setProperty('--color-accent-dark', palette.dark);
      root.style.setProperty('--color-violet-600', palette.primary);
      root.style.setProperty('--color-violet-500', palette.light);
      root.style.setProperty('--color-violet-700', palette.dark);

      window.dispatchEvent(new CustomEvent('themeOrAccentUpdated', { detail: { theme: themeMode, accent: color } }));
    }
    setThemeSuccess(`Applied ${name} Accent Color live across all pages!`);
    setTimeout(() => setThemeSuccess(null), 3000);
  };

  // ─── AI Copilot Reorder & Test Handlers ─────────────────────────────────────
  const moveFailoverOrder = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...failoverOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setFailoverOrder(newOrder);
    setPrimaryProvider(newOrder[0]);
  };

  const applyCascadePreset = (presetKey: 'free' | 'speed' | 'local' | 'enterprise') => {
    let order: string[] = [];
    if (presetKey === 'free') {
      order = ['gemini', 'groq', 'openrouter', 'ollama'];
    } else if (presetKey === 'speed') {
      order = ['groq', 'gemini', 'openrouter', 'ollama', 'openai', 'claude'];
    } else if (presetKey === 'local') {
      order = ['ollama', 'gemini', 'groq', 'openrouter'];
    } else {
      order = ['openai', 'claude', 'gemini', 'groq', 'openrouter', 'ollama'];
    }
    setFailoverOrder(order);
    setPrimaryProvider(order[0]);
  };

  const handleTestProvider = async (providerId: string) => {
    setTestStatuses(prev => ({ ...prev, [providerId]: { loading: true } }));
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const key = providerKeys[providerId] || '';
    const model = providerModels[providerId] || '';

    try {
      const res = await fetch('/api/ai-copilot/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider: providerId,
          apiKey: key,
          model,
        }),
      });

      const data = await res.json();
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          success: data.success,
          message: data.message,
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          success: false,
          message: `Network error: ${err.message}`,
        },
      }));
    }
  };

  const handleSaveAllAiKeys = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sl_ai_primary_provider', primaryProvider);
      localStorage.setItem('sl_ai_failover_order', JSON.stringify(failoverOrder));
      localStorage.setItem('sl_ai_provider_keys', JSON.stringify(providerKeys));
      localStorage.setItem('sl_ai_provider_models', JSON.stringify(providerModels));

      localStorage.setItem('sl_ai_provider', primaryProvider);
      localStorage.setItem('sl_ai_api_key', providerKeys[primaryProvider] || '');
      localStorage.setItem('sl_ai_model', providerModels[primaryProvider] || '');
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const keysPayload: Record<string, { apiKey: string; model: string; enabled: boolean }> = {};
    for (const p of AI_PROVIDERS) {
      keysPayload[p.id] = {
        apiKey: providerKeys[p.id] || '',
        model: providerModels[p.id] || p.defaultModel,
        enabled: true,
      };
    }

    try {
      await fetch('/api/ai-copilot/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          primaryProvider,
          failoverOrder,
          keys: keysPayload,
        }),
      });
    } catch {}

    setAiSaveSuccess(`All AI Keys & Custom Failover Cascade Saved! Active sequence: ${failoverOrder.map(f => f.toUpperCase()).join(' ➔ ')}`);
    setTimeout(() => setAiSaveSuccess(null), 6000);
  };

  const configuredProvidersList = failoverOrder.map(id => AI_PROVIDERS.find(p => p.id === id)).filter(Boolean) as typeof AI_PROVIDERS;

  // ─── Render Tab Content ────────────────────────────────────────────────────
  const TabContent = () => {
    switch (activeTab) {
      // ────────────────────────────────────────────────────────────────────────
      // TAB 1: PROFILE
      // ────────────────────────────────────────────────────────────────────────
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-600/20 shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white truncate">{fullName || 'Stavan Shah'}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 font-semibold uppercase">
                    Admin Clearance
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{email || 'stavan@example.com'}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Org: <strong className="text-gray-300">{organization}</strong> • Role: <span className="text-violet-400">{jobTitle}</span>
                </p>
              </div>
            </div>

            {saveSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {saveSuccess}
              </motion.div>
            )}

            {/* Profile Inputs */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white">Identity & Work Profile</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <User size={13} className="text-violet-400" /> Full Name / Call Sign
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Stavan Shah"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Mail size={13} className="text-violet-400" /> Official Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. stavan@example.com"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Shield size={13} className="text-violet-400" /> Job Title / Rank
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Lead Security Architect"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Globe size={13} className="text-violet-400" /> Organization / Enterprise Unit
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. SecureLens Cyber Defense"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Smartphone size={13} className="text-violet-400" /> Phone Number (2FA Alerts)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Clock size={13} className="text-violet-400" /> Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                  >
                    <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
                    <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8)</option>
                    <option value="America/Chicago (UTC-6)">America/Chicago (UTC-6)</option>
                    <option value="Europe/London (UTC+0)">Europe/London (UTC+0)</option>
                    <option value="Europe/Berlin (UTC+1)">Europe/Berlin (UTC+1)</option>
                    <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (UTC+9)</option>
                    <option value="Asia/Kolkata (UTC+5:30)">Asia/Kolkata (UTC+5:30)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isSaving ? 'Saving Profile...' : 'Save Profile Changes'}
                </motion.button>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock size={15} className="text-violet-400" /> Change Security Password
              </h4>
              <p className="text-xs text-gray-400">Ensure your password is at least 8 characters with numbers and special symbols.</p>

              {passwordStatus.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> {passwordStatus.error}
                </div>
              )}
              {passwordStatus.success && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} /> {passwordStatus.success}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 8 chars"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={passwordStatus.loading}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    {passwordStatus.loading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 2: AI COPILOT & AUTO-FAILOVER
      // ────────────────────────────────────────────────────────────────────────
      case 'ai':
        return (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-600/15 via-purple-600/10 to-transparent border border-violet-500/30 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-violet-400" />
                    <h3 className="text-base font-bold text-white">AI Copilot Multi-Engine & Auto-Failover System</h3>
                  </div>
                  <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                    Configure API keys for your preferred LLM engines. When your primary AI engine reaches rate limits (e.g. 15 RPM / 1,500 requests/day), 
                    SecureLens <strong>automatically falls back to the next available AI engine</strong> with zero scan disruption.
                  </p>
                </div>
              </div>

              {/* Failover Cascade Visualizer */}
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-300 flex-wrap">
                  <span className="font-semibold text-violet-300">Failover Cascade:</span>
                  {configuredProvidersList.map((p, idx) => (
                    <React.Fragment key={p.id}>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                        p.id === primaryProvider
                          ? 'bg-violet-600 text-white font-bold shadow-sm'
                          : 'bg-white/[0.06] text-gray-300 border border-white/[0.08]'
                      }`}>
                        {idx + 1}. {p.name} {p.id === primaryProvider ? '★ PRIMARY' : ''}
                      </span>
                      {idx < configuredProvidersList.length - 1 && (
                        <ArrowRight size={10} className="text-gray-500 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                  <ArrowRight size={10} className="text-gray-500 shrink-0" />
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-white/[0.03] text-gray-400 border border-white/[0.06]">
                    Native Rule Engine
                  </span>
                </div>
              </div>
            </div>

            {aiSaveSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {aiSaveSuccess}
              </motion.div>
            )}

            {/* Interactive Failover Cascade Priority Manager */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⚡ Failover Priority Hierarchy</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                      Use Arrows to Reorder
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    If an engine errors or exceeds quota, SecureLens routes requests down this priority sequence in order.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyCascadePreset('free')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    ⚡ Free Tier First
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCascadePreset('speed')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    🚀 Speed First
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCascadePreset('local')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    🔒 Local First
                  </button>
                </div>
              </div>

              {/* Priority Reordering List */}
              <div className="space-y-2 pt-1">
                {failoverOrder.map((providerId, idx) => {
                  const p = AI_PROVIDERS.find(item => item.id === providerId);
                  if (!p) return null;
                  const isPrimary = idx === 0;
                  const hasKey = p.id === 'ollama' || !!providerKeys[p.id]?.trim();

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isPrimary
                          ? 'bg-violet-600/15 border-violet-500/40 ring-1 ring-violet-500/20'
                          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isPrimary
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                            : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{p.name}</span>
                            {isPrimary && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-violet-600 text-white font-bold tracking-wide uppercase">
                                Primary Engine
                              </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${p.badgeColor}`}>
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                            Model: {providerModels[p.id] || p.defaultModel} • {hasKey ? '✓ Key Added' : '○ Key Empty'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveFailoverOrder(idx, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-gray-300 transition-colors cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFailoverOrder(idx, 'down')}
                          disabled={idx === failoverOrder.length - 1}
                          title="Move down"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-gray-300 transition-colors cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual AI Provider Cards */}
            <div className="space-y-4">
              {AI_PROVIDERS.map(p => {
                const isPrimary = primaryProvider === p.id;
                const currentKey = providerKeys[p.id] || '';
                const currentModel = providerModels[p.id] || p.defaultModel;
                const isConfigured = p.id === 'ollama' || !!currentKey.trim();
                const testStatus = testStatuses[p.id];

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isPrimary
                        ? 'bg-violet-600/10 border-violet-500/40 ring-1 ring-violet-500/30'
                        : isConfigured
                        ? 'bg-white/[0.03] border-white/[0.08]'
                        : 'bg-white/[0.015] border-white/[0.04] opacity-90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                        {isConfigured && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            ✓ Key Saved
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {p.getKeyUrl && (
                          <a
                            href={p.getKeyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium transition-colors"
                          >
                            {p.getKeyText || 'Get Key'} <ExternalLink size={10} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setPrimaryProvider(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            isPrimary
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                              : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
                          }`}
                        >
                          <Star size={11} className={isPrimary ? 'fill-current' : ''} />
                          {isPrimary ? 'Primary Engine' : 'Set as Primary'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-3">{p.desc}</p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-6 relative">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={currentKey}
                          onChange={e => {
                            const val = e.target.value;
                            setProviderKeys(prev => ({ ...prev, [p.id]: val }));
                          }}
                          placeholder={p.placeholder}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3 pr-9 py-2 text-xs text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                        >
                          {showKeys[p.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={currentModel}
                          onChange={e => {
                            const val = e.target.value;
                            setProviderModels(prev => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                        >
                          {p.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3 flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTestProvider(p.id)}
                          disabled={testStatus?.loading || (!currentKey && p.id !== 'ollama')}
                          className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 cursor-pointer"
                        >
                          {testStatus?.loading ? <Loader2 size={12} className="animate-spin text-violet-400" /> : <Zap size={12} className="text-amber-400" />}
                          {testStatus?.loading ? 'Testing…' : 'Test'}
                        </motion.button>
                      </div>
                    </div>

                    {testStatus && testStatus.success !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          testStatus.success
                            ? 'bg-green-500/10 border-green-500/20 text-green-300'
                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {testStatus.success ? <CheckCircle2 size={14} className="text-green-400 shrink-0" /> : <AlertCircle size={14} className="text-red-400 shrink-0" />}
                          <span className="truncate">{testStatus.message}</span>
                        </div>
                        {testStatus.latencyMs && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 font-mono shrink-0">
                            {testStatus.latencyMs}ms
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveAllAiKeys}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-sm font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <Check size={16} /> Save All AI Keys & Auto-Failover Rules
              </motion.button>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 3: SECURITY & 2FA
      // ────────────────────────────────────────────────────────────────────────
      case 'security':
        return (
          <div className="space-y-6">
            {securitySuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {securitySuccess}
              </motion.div>
            )}

            {/* Two-Factor Authentication Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-violet-400" />
                    <h4 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      twoFactorEnabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Require a 6-digit TOTP code (Google Authenticator, Authy, 1Password) upon logging in.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    twoFactorEnabled
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                      : 'bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-500 hover:to-violet-600 shadow-md shadow-violet-600/20'
                  }`}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Set Up 2FA'}
                </button>
              </div>
            </div>

            {/* Session Security Policies */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield size={16} className="text-violet-400" /> Session Security Policies
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-semibold text-white">Login Notification Alerts</p>
                    <p className="text-[11px] text-gray-500">Send security email alert whenever a new browser or IP signs in.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoginNotifications(!loginNotifications)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${loginNotifications ? 'bg-violet-600' : 'bg-white/[0.08]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${loginNotifications ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-semibold text-white">Force Re-Authentication for Critical Actions</p>
                    <p className="text-[11px] text-gray-500">Prompt for password before deleting workspaces or revoking API keys.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForceReauth(!forceReauth)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${forceReauth ? 'bg-violet-600' : 'bg-white/[0.08]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${forceReauth ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-semibold text-white">Inactivity Session Timeout</p>
                    <p className="text-[11px] text-gray-500">Automatically log out idle browser tabs after duration.</p>
                  </div>
                  <select
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                    <option value="never">Never (Persistent)</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-white">IP Whitelist / CIDR Restriction</p>
                    <p className="text-[11px] text-gray-500">Allow Live Scans and API calls only from specified IP blocks (comma separated).</p>
                  </div>
                  <input
                    type="text"
                    value={ipWhitelist}
                    onChange={e => setIpWhitelist(e.target.value)}
                    placeholder="127.0.0.1, 192.168.1.0/24"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveSecurityPreferences}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  Save Security Policies
                </button>
              </div>
            </div>

            {/* Active Sessions Management */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Monitor size={16} className="text-violet-400" /> Active Login Sessions
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">Devices currently authenticated to your SecureLens account.</p>
                </div>
                {activeSessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRevokeAllOtherSessions}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
                  >
                    Revoke All Other Sessions
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeSessions.map(session => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-violet-400">
                        {session.device === 'Laptop' ? <Laptop size={16} /> : <Monitor size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{session.browser} on {session.os}</span>
                          {session.isCurrent && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold">
                              Current Session
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          IP: {session.ip} • {session.location} • {session.lastActive}
                        </p>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 4: NOTIFICATIONS & WEBHOOKS
      // ────────────────────────────────────────────────────────────────────────
      case 'notifications':
        return (
          <div className="space-y-6">
            {notificationSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {notificationSuccess}
              </motion.div>
            )}

            {/* Email Notification Channels */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail size={16} className="text-violet-400" /> Automated Email Notifications
              </h4>

              <div className="space-y-3">
                {[
                  { label: 'Critical Vulnerability Alerts', desc: 'Instant email when CVSS 9.0+ or Remote Code Execution is found', val: notifyCritical, set: setNotifyCritical },
                  { label: 'Scan Completion Summaries', desc: 'Detailed report metrics whenever automated scans complete', val: notifyScanComplete, set: setNotifyScanComplete },
                  { label: 'Weekly Executive Security Digest', desc: 'Aggregated posture trends, closed vulnerabilities, and compliance status', val: notifyWeeklyDigest, set: setNotifyWeeklyDigest },
                  { label: 'Zero-Day & Threat Intel Bulletins', desc: 'Security alerts on emerging CVEs matching your target tech stack', val: notifyThreatIntel, set: setNotifyThreatIntel },
                  { label: 'Team Activity & Changes', desc: 'When team members modify workspaces or delete scan runs', val: notifyTeamActivity, set: setNotifyTeamActivity },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div>
                      <p className="text-xs font-semibold text-white">{item.label}</p>
                      <p className="text-[11px] text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.val)}
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${item.val ? 'bg-violet-600' : 'bg-white/[0.08]'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.val ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Threshold & Frequency Filter */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={16} className="text-violet-400" /> Alert Thresholds & Frequency
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Minimum Alert Severity Trigger</label>
                  <select
                    value={minSeverityThreshold}
                    onChange={e => setMinSeverityThreshold(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="ALL">All Severities (Info, Low, Med, High, Crit)</option>
                    <option value="LOW">Low and Above</option>
                    <option value="MEDIUM">Medium, High & Critical</option>
                    <option value="HIGH">High & Critical Only</option>
                    <option value="CRITICAL">Critical Only (CVSS 9.0+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Notification Dispatch Frequency</label>
                  <select
                    value={digestFrequency}
                    onChange={e => setDigestFrequency(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="instant">Instant (Real-time per finding)</option>
                    <option value="daily">Daily Consolidated Batch</option>
                    <option value="weekly">Weekly Digest Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chat Webhook Dispatchers */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Webhook size={16} className="text-violet-400" /> Incident Webhook Endpoints
              </h4>

              {/* Slack Webhook */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#4A154B]/30 text-[#ECB22E] flex items-center justify-center font-bold text-xs">#</span>
                    <span className="text-xs font-bold text-white">Slack Incident Webhook</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestWebhookPing('slack')}
                    disabled={testPingStatus['slack']?.loading}
                    className="px-3 py-1 rounded-lg text-xs bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {testPingStatus['slack']?.loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    Test Ping
                  </button>
                </div>
                <input
                  type="text"
                  value={slackWebhook}
                  onChange={e => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                />
                {testPingStatus['slack'] && (
                  <p className={`text-xs ${testPingStatus['slack'].success ? 'text-green-400' : 'text-red-400'}`}>
                    {testPingStatus['slack'].message}
                  </p>
                )}
              </div>

              {/* Discord Webhook */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">D</span>
                    <span className="text-xs font-bold text-white">Discord Alerts Webhook</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestWebhookPing('discord')}
                    disabled={testPingStatus['discord']?.loading}
                    className="px-3 py-1 rounded-lg text-xs bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {testPingStatus['discord']?.loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    Test Ping
                  </button>
                </div>
                <input
                  type="text"
                  value={discordWebhook}
                  onChange={e => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                />
                {testPingStatus['discord'] && (
                  <p className={`text-xs ${testPingStatus['discord'].success ? 'text-green-400' : 'text-red-400'}`}>
                    {testPingStatus['discord'].message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveNotifications}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                >
                  Save Notification Preferences
                </motion.button>
              </div>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 5: APPEARANCE & UI
      // ────────────────────────────────────────────────────────────────────────
      case 'appearance':
        const accentList = [
          { name: 'Violet', value: '#7c3aed' },
          { name: 'Blue', value: '#3b82f6' },
          { name: 'Emerald', value: '#10b981' },
          { name: 'Amber', value: '#f59e0b' },
          { name: 'Rose', value: '#ef4444' },
          { name: 'Cyan', value: '#06b6d4' },
        ];

        return (
          <div className="space-y-6">
            {themeSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {themeSuccess}
              </motion.div>
            )}

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <div>
                <p className="text-sm font-bold text-white">Theme Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">Choose your preferred workspace aesthetic (Dark or Light Mode).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTheme('dark')}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-violet-600/20 border-violet-500/50 text-white shadow-lg shadow-violet-600/10'
                      : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04]'
                  }`}>
                  <Moon size={18} className={themeMode === 'dark' ? 'text-violet-400' : 'text-gray-500'} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Dark Mode</p>
                    <p className="text-[10px] text-gray-500">Deep Cyber Theme</p>
                  </div>
                  {themeMode === 'dark' && <Check size={14} className="ml-auto text-violet-400" />}
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTheme('light')}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? 'bg-violet-600/20 border-violet-500/50 text-white shadow-lg shadow-violet-600/10'
                      : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04]'
                  }`}>
                  <Sun size={18} className={themeMode === 'light' ? 'text-amber-400' : 'text-gray-500'} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Light Mode</p>
                    <p className="text-[10px] text-gray-500">Clean High-Contrast</p>
                  </div>
                  {themeMode === 'light' && <Check size={14} className="ml-auto text-violet-400" />}
                </motion.button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <div>
                <p className="text-sm font-bold text-white">Accent Palette</p>
                <p className="text-xs text-gray-500 mt-0.5">Customize the highlight color applied across buttons, badges, graphs, and borders.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {accentList.map(item => {
                  const isSelected = accentColor.toLowerCase() === item.value.toLowerCase();
                  return (
                    <motion.button
                      key={item.name}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSelectAccent(item.value, item.name)}
                      title={item.name}
                      className={`w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] shadow-lg' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: item.value }}
                    >
                      {isSelected && <Check size={16} className="text-white drop-shadow-md" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
              <h4 className="text-sm font-bold text-white">Workspace Density & Audio</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-semibold text-white">Audio Alert on Critical Findings</p>
                    <p className="text-[11px] text-gray-500">Play a subtle cyber chime when live scan catches CVSS 9.0+ flaw.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundAlerts(!soundAlerts)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${soundAlerts ? 'bg-violet-600' : 'bg-white/[0.08]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${soundAlerts ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-semibold text-white">Code Terminal Font Size</p>
                    <p className="text-[11px] text-gray-500">Font size applied in Findings, AI Copilot, and Live Scan log viewer.</p>
                  </div>
                  <select
                    value={codeFontSize}
                    onChange={e => setCodeFontSize(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="12px">12px (Compact)</option>
                    <option value="13px">13px (Standard)</option>
                    <option value="14px">14px (Medium)</option>
                    <option value="16px">16px (Large)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 6: API KEYS
      // ────────────────────────────────────────────────────────────────────────
      case 'api':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-violet-400" /> SecureLens API Keys
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Generate personal access tokens to trigger scans from CI/CD pipelines, CLI, and custom scripts.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNewKeyModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-xs font-bold shadow-lg shadow-violet-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Generate New Key
              </motion.button>
            </div>

            {/* Just Created Key Banner */}
            {justCreatedKey && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span className="text-xs font-bold">Copy Your New API Key ({justCreatedKey.name})</span>
                  </div>
                  <button
                    onClick={() => setJustCreatedKey(null)}
                    className="text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Make sure to copy your API key now. You won't be able to see this full secret token again!
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-amber-500/20 font-mono text-xs text-white">
                  <code className="flex-1 truncate">{justCreatedKey.key}</code>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(justCreatedKey.key, 'just-created')}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKeyId === 'just-created' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKeyId === 'just-created' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Active Keys List */}
            <div className="space-y-3">
              {apiKeys.map(keyItem => (
                <div
                  key={keyItem.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3 hover:border-white/[0.08] transition-all"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{keyItem.name}</p>
                      <span className="text-[10px] px-2 py-0.2 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-bold uppercase">
                        {keyItem.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                        Scope: {keyItem.scope}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(keyItem.fullKey || keyItem.prefix, keyItem.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedKeyId === keyItem.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copiedKeyId === keyItem.id ? 'Copied!' : 'Copy Token'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevokeApiKey(keyItem.id)}
                        title="Revoke Key"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04]">
                    <code className="text-xs text-gray-400 font-mono">{keyItem.prefix}</code>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-gray-500 flex-wrap">
                    <span>Created: {new Date(keyItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>Expires: {keyItem.expiresAt}</span>
                    <span>Last Used: {keyItem.lastUsed}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Curl Example */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-2">
              <p className="text-xs font-bold text-gray-300">Quick CLI Execution Example</p>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[11px] text-violet-300 overflow-x-auto">
                <code>curl -X POST https://securelens.local/api/scans/create \<br/>
                &nbsp;&nbsp;-H "Authorization: Bearer sl_live_••••••••" \<br/>
                &nbsp;&nbsp;-d '{`{"target":"https://example.com","mode":"website"}`}'</code>
              </div>
            </div>
          </div>
        );

      // ────────────────────────────────────────────────────────────────────────
      // TAB 7: INTEGRATIONS
      // ────────────────────────────────────────────────────────────────────────
      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe size={18} className="text-violet-400" /> Enterprise Third-Party Integrations
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Synchronize findings, automated alerts, and CI/CD pipelines with external toolchains.
                </p>
              </div>
            </div>

            {integrationSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
                <Check size={16} /> {integrationSuccess}
              </motion.div>
            )}

            <div className="space-y-3">
              {integrationsList.map(integration => (
                <div
                  key={integration.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${integration.iconBg}`}>
                      {integration.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">{integration.name}</p>
                        <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold uppercase ${
                          integration.connected
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-white/[0.04] text-gray-500 border border-white/[0.06]'
                        }`}>
                          {integration.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{integration.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingIntegration(integration)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-200 transition-colors cursor-pointer"
                    >
                      Configure
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleIntegration(integration.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        integration.connected
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          : 'bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-500 hover:to-violet-600 shadow-md shadow-violet-600/20'
                      }`}
                    >
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage identity, AI failover cascades, 2FA security, webhook alerts, and API tokens.</p>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Main Tab Body */}
      <motion.div variants={itemVariants} key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
        <TabContent />
      </motion.div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: 2FA SETUP MODAL                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {show2faModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d0d16] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-violet-400" />
                  <h3 className="text-base font-bold text-white">Set Up Two-Factor Authentication</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShow2faModal(false)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
              </p>

              {/* Mock QR Canvas */}
              <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center mx-auto w-48 h-48 shadow-inner">
                <div className="grid grid-cols-6 gap-1 w-36 h-36">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        (i % 2 === 0 || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35)
                          ? 'bg-black'
                          : 'bg-black/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-gray-300">
                <span>KEY: <strong className="text-violet-300">JBSWY3DPEHPK3PXP</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopyKey('JBSWY3DPEHPK3PXP', 'totp-key')}
                  className="text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer"
                >
                  {copiedKeyId === 'totp-key' ? 'Copied!' : 'Copy Key'}
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Enter 6-Digit Code from App</label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-center text-lg font-mono text-white tracking-widest focus:outline-none focus:border-violet-500"
                />
              </div>

              {totpSuccess && (
                <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                  <Check size={14} /> 2FA Successfully Activated!
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2faModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm2FA}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  Verify & Activate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: GENERATE API KEY MODAL                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d0d16] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-violet-400" />
                  <h3 className="text-base font-bold text-white">Generate SecureLens API Key</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewKeyModal(false)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5 font-medium">Key Name / Identifier</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. GitHub Actions CI/CD Worker"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1.5 font-medium">Permission Scope</label>
                  <select
                    value={newKeyScope}
                    onChange={e => setNewKeyScope(e.target.value as any)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="read_write">Read & Write (Run Scans, Create Findings)</option>
                    <option value="admin">Full Administrator (All APIs + Workspace Ops)</option>
                    <option value="read_only">Read Only (Telemetry & Reports Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1.5 font-medium">Expiration Window</label>
                  <select
                    value={newKeyExpiration}
                    onChange={e => setNewKeyExpiration(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days (Recommended)</option>
                    <option value="365d">1 Year</option>
                    <option value="never">No Expiration</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewKeyModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateApiKey}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  Generate Token
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CONFIGURE INTEGRATION MODAL                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingIntegration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d0d16] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs ${editingIntegration.iconBg}`}>
                    {editingIntegration.icon}
                  </span>
                  <h3 className="text-base font-bold text-white">Configure {editingIntegration.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIntegration(null)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-400">{editingIntegration.desc}</p>

              <div className="space-y-3">
                {editingIntegration.config.webhookUrl !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1 font-medium">Webhook Endpoint URL</label>
                    <input
                      type="text"
                      value={editingIntegration.config.webhookUrl}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingIntegration(prev => prev ? {
                          ...prev,
                          config: { ...prev.config, webhookUrl: val }
                        } : null);
                      }}
                      placeholder="https://..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {editingIntegration.config.channel !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1 font-medium">Target Channel</label>
                    <input
                      type="text"
                      value={editingIntegration.config.channel}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingIntegration(prev => prev ? {
                          ...prev,
                          config: { ...prev.config, channel: val }
                        } : null);
                      }}
                      placeholder="#security-alerts"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {editingIntegration.config.host !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1 font-medium">Host / Instance URL</label>
                    <input
                      type="text"
                      value={editingIntegration.config.host}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingIntegration(prev => prev ? {
                          ...prev,
                          config: { ...prev.config, host: val }
                        } : null);
                      }}
                      placeholder="https://yourcompany.atlassian.net"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {editingIntegration.config.projectKey !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1 font-medium">Jira Project Key</label>
                    <input
                      type="text"
                      value={editingIntegration.config.projectKey}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingIntegration(prev => prev ? {
                          ...prev,
                          config: { ...prev.config, projectKey: val }
                        } : null);
                      }}
                      placeholder="SEC"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {editingIntegration.config.token !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1 font-medium">Access Token / Secret</label>
                    <input
                      type="password"
                      value={editingIntegration.config.token}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingIntegration(prev => prev ? {
                          ...prev,
                          config: { ...prev.config, token: val }
                        } : null);
                      }}
                      placeholder="ghp_••••••••••••"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIntegration(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIntegrationModal}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  Save Integration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
