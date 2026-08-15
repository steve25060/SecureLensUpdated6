'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, Calendar, Globe, GitBranch, Layers, TrendingUp, TrendingDown, Shield, Zap, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import type { DashboardOverview, RecentScan, ScanActivity } from '@/types/dashboard';
import { useLiveScanSync } from '@/lib/live-scan-store';
import { formatRelativeTime, useLiveClock } from '@/lib/time-utils';

const getDynamicDateLabel = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const SEED: DashboardOverview = {
  securityScores: [
    { name: 'Overall Security Score', score: 84, label: 'Great',     color: 'green',  change: '+12 pts vs last 7 days' },
    { name: 'Authentication Score',   score: 42, label: 'Poor',      color: 'red',    change: '-8 pts vs last 7 days'  },
    { name: 'API Security Score',     score: 91, label: 'Excellent', color: 'green',  change: '+15 pts vs last 7 days' },
    { name: 'Headers Score',          score: 78, label: 'Good',      color: 'yellow', change: '+5 pts vs last 7 days'  },
    { name: 'Dependency Score',       score: 88, label: 'Good',      color: 'green',  change: '+10 pts vs last 7 days' },
    { name: 'Secrets Score',          score: 93, label: 'Excellent', color: 'green',  change: '+18 pts vs last 7 days' },
  ],
  riskOverview: {
    total: 51,
    critical: { count: 2,  pct: 4  },
    high:     { count: 12, pct: 24 },
    medium:   { count: 12, pct: 24 },
    low:      { count: 25, pct: 48 },
  },
  findingsOverTime: [
    { date: getDynamicDateLabel(6), critical: 2,  high: 8,  medium: 15, low: 25 },
    { date: getDynamicDateLabel(5), critical: 3,  high: 12, medium: 18, low: 30 },
    { date: getDynamicDateLabel(4), critical: 1,  high: 10, medium: 12, low: 22 },
    { date: getDynamicDateLabel(3), critical: 4,  high: 15, medium: 20, low: 35 },
    { date: getDynamicDateLabel(2), critical: 2,  high: 11, medium: 16, low: 28 },
    { date: getDynamicDateLabel(1), critical: 3,  high: 14, medium: 18, low: 32 },
    { date: getDynamicDateLabel(0), critical: 2,  high: 12, medium: 12, low: 25 },
  ],
  topVulnerabilityTypes: [
    { name: 'Missing Security Header',    count: 12 },
    { name: 'Weak Cookie Settings',       count: 8  },
    { name: 'SQL Injection',              count: 6  },
    { name: 'Cross-Site Scripting (XSS)', count: 5  },
    { name: 'Vulnerable Dependency',      count: 4  },
  ],
  recentScans: [
    { id: 'scan-001', target: 'acme.com',          type: 'WEBSITE',  status: 'COMPLETED', score: 84, findingsCount: 51, time: 'Just now' },
    { id: 'scan-002', target: 'vulnerable-app',    type: 'GITHUB',   status: 'COMPLETED', score: 67, findingsCount: 38, time: '2h ago'   },
    { id: 'scan-003', target: 'staging.acme.com',  type: 'WEBSITE',  status: 'COMPLETED', score: 72, findingsCount: 34, time: '1d ago'   },
    { id: 'scan-004', target: 'shopify-clone',     type: 'COMBINED', status: 'COMPLETED', score: 90, findingsCount: 23, time: '1d ago'   },
    { id: 'scan-005', target: 'legacy-api',        type: 'GITHUB',   status: 'FAILED',    score: null, findingsCount: 0, time: '2d ago'  },
  ],
  scanActivity: [
    { message: 'Nuclei Scan Completed',        detail: '45 findings',       time: '1m ago', type: 'success' },
    { message: 'OWASP ZAP Completed',          detail: '12 alerts',         time: '2m ago', type: 'success' },
    { message: 'Nmap Scan Completed',          detail: '8 open ports',      time: '3m ago', type: 'success' },
    { message: 'Asset Discovery Completed',    detail: '23 assets found',   time: '4m ago', type: 'success' },
    { message: 'Scan Correlation Completed',   detail: '51 unique findings', time: '5m ago', type: 'info'    },
  ],
};

const scoreColor = (score: number) => {
  if (score >= 80) return { ring: '#22c55e', label: 'text-green-400', bg: 'from-green-500/20 to-green-500/5', border: 'border-green-500/20' };
  if (score >= 60) return { ring: '#eab308', label: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/20' };
  if (score >= 40) return { ring: '#f97316', label: 'text-orange-400', bg: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/20' };
  return { ring: '#ef4444', label: 'text-red-400', bg: 'from-red-500/20 to-red-500/5', border: 'border-red-500/20' };
};

const riskDonutData = (r: DashboardOverview['riskOverview']) => {
  const list = [
    { name: 'Critical', value: r.critical?.count ?? 0, color: '#ef4444' },
    { name: 'High',     value: r.high?.count ?? 0,     color: '#f97316' },
    { name: 'Medium',   value: r.medium?.count ?? 0,   color: '#eab308' },
    { name: 'Low',      value: r.low?.count ?? 0,      color: '#22c55e' },
  ];
  const nonZero = list.filter(d => d.value > 0);
  return nonZero.length > 0 ? nonZero : [{ name: 'No Vulnerabilities', value: 1, color: '#22c55e' }];
};

const typeBadge = (type: RecentScan['type']) => {
  const map = {
    WEBSITE:  { label: 'Website',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Globe size={10} /> },
    GITHUB:   { label: 'GitHub',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: <GitBranch size={10} /> },
    COMBINED: { label: 'Both',     cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20', icon: <Layers size={10} /> },
  };
  return map[type];
};

const statusBadge = (status: RecentScan['status']) => ({
  COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  FAILED:    'bg-red-500/10 text-red-400 border border-red-500/20',
  RUNNING:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  PENDING:   'bg-gray-500/10 text-gray-400 border border-gray-500/20',
}[status]);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
  }
};

interface ScoreGaugeProps {
  score: number;
  label: string;
  name: string;
  change: string;
  index: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, name, change, index }) => {
  const { ring, label: labelCls, bg, border } = scoreColor(score);
  const isPositive = change.startsWith('+');
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1000;
      const steps = 30;
      let current = 0;
      const increment = score / steps;
      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(interval);
        } else {
          setAnimatedScore(Math.round(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, index * 100);
    return () => clearTimeout(timer);
  }, [score, index]);

  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-b ${bg} border ${border} p-4 group hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300`}
      whileHover={{ y: -2 }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.03] to-transparent rounded-full blur-2xl" />
      <p className="text-[11px] text-gray-400 font-medium mb-3 truncate">{name}</p>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle
              cx="36" cy="36" r="28" fill="none"
              stroke={ring}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(animatedScore / 100) * 176} 176`}
              transform="rotate(-90 36 36)"
              initial={{ strokeDasharray: '0 176' }}
              animate={{ strokeDasharray: `${(animatedScore / 100) * 176} 176` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${labelCls}`}>{animatedScore}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={`text-xs font-semibold ${labelCls}`}>{label}</span>
          <span className={`text-[10px] flex items-center gap-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {change}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview>(SEED);
  const [loading, setLoading] = useState(true);
  const { scans: liveScans, findings: liveFindings, lastUpdated } = useLiveScanSync();

  useEffect(() => {
    let isMounted = true;
    const fetchOverview = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
      fetch('/api/dashboard/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(json => {
          if (isMounted) setData(json);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastUpdated]);

  const activeData = React.useMemo(() => {
    const formattedRecentScans: RecentScan[] = liveScans.slice(0, 6).map(ls => {
      let score = ls.score;
      if (score === undefined || score === null || score === 0) {
        score = Math.max(15, 100 - ((ls.findingsCount || 0) * 6));
      }
      return {
        id: ls.id,
        target: ls.target,
        type: ls.type,
        status: (ls.status === 'CANCELLED' ? 'FAILED' : ls.status) as RecentScan['status'],
        score,
        findingsCount: ls.findingsCount,
        time: formatRelativeTime(ls.createdAt || ls.time),
      };
    });

    const recentScans = [...formattedRecentScans, ...(data?.recentScans || []).filter(s => !formattedRecentScans.some(l => l.id === s.id))].slice(0, 6);

    const liveActivities: ScanActivity[] = liveScans.slice(0, 4).map(ls => ({
      message: `${ls.type === 'WEBSITE' ? 'Website' : 'Code'} Scan ${ls.status || 'Completed'}`,
      detail: `${ls.target} (${ls.findingsCount} findings)`,
      time: formatRelativeTime(ls.createdAt || ls.time),
      type: ls.status === 'COMPLETED' ? 'success' : 'info',
    }));

    // If live findings exist, dynamically compute the riskOverview from live findings
    let riskOverview = data?.riskOverview || SEED.riskOverview;
    if (liveFindings.length > 0) {
      const crit = liveFindings.filter(f => f.severity === 'CRITICAL').length;
      const high = liveFindings.filter(f => f.severity === 'HIGH').length;
      const med = liveFindings.filter(f => f.severity === 'MEDIUM').length;
      const low = liveFindings.filter(f => f.severity === 'LOW').length;
      const total = liveFindings.length;
      riskOverview = {
        total,
        critical: { count: crit, pct: total > 0 ? Math.round((crit / total) * 100) : 0 },
        high: { count: high, pct: total > 0 ? Math.round((high / total) * 100) : 0 },
        medium: { count: med, pct: total > 0 ? Math.round((med / total) * 100) : 0 },
        low: { count: low, pct: total > 0 ? Math.round((low / total) * 100) : 0 },
      };
    }

    return {
      ...(data || SEED),
      riskOverview,
      recentScans: recentScans.length > 0 ? recentScans : (data?.recentScans || SEED.recentScans),
      scanActivity: [...liveActivities, ...(data?.scanActivity || SEED.scanActivity)].slice(0, 6),
    };
  }, [data, liveScans, liveFindings, lastUpdated]);

  const donut = riskDonutData(activeData.riskOverview);

  const totalScansCount = liveScans.length > 0 ? liveScans.length : (data?.recentScans?.length || 12);
  const distinctTargets = new Set([
    ...liveScans.map(s => s.target),
    ...(data?.recentScans || []).map(s => s.target),
  ]).size;

  const quickStats = [
    { label: 'Total Scans', value: `${totalScansCount}`, change: '+100% Live', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Active Findings', value: `${activeData.riskOverview.total}`, change: 'Real-time', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Security Score', value: `${liveScans[0]?.score ?? activeData.securityScores[0]?.score ?? 84}/100`, change: 'Aggregated', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Target Assets', value: `${distinctTargets || 1}`, change: 'Active Targets', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here&apos;s what&apos;s happening with your security posture.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
          >
            <Calendar size={14} /> Last 7 days
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/live-scan')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40"
          >
            <Plus size={14} /> New Scan
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className={`${stat.bg} border border-white/[0.04] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.08] transition-all duration-300`}
              whileHover={{ y: -1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={stat.color} />
                <span className={`text-[11px] font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{stat.change}</span>
              </div>
              <p className="text-xl font-bold text-white mb-0.5">{stat.value}</p>
              <p className="text-[11px] text-gray-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {loading ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 h-36 shimmer" />
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {activeData.securityScores.map((s, i) => (
            <ScoreGauge key={i} score={s.score} label={s.label} name={s.name} change={s.change} index={i} />
          ))}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3 relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] transition-all duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full blur-3xl" />
          <h3 className="text-sm font-semibold text-white mb-4 relative">Risk Overview</h3>
          <div className="flex flex-col items-center relative">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} cx="50%" cy="50%" innerRadius={42} outerRadius={58} dataKey="value" strokeWidth={0}>
                    {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{activeData.riskOverview.total}</span>
                <span className="text-[10px] text-gray-500">Total</span>
              </div>
            </div>
            <div className="mt-5 w-full space-y-2.5">
              {[
                { label: 'Critical', ...activeData.riskOverview.critical, color: 'bg-red-500', dot: 'bg-red-500' },
                { label: 'High',     ...activeData.riskOverview.high,     color: 'bg-orange-500', dot: 'bg-orange-500' },
                { label: 'Medium',   ...activeData.riskOverview.medium,   color: 'bg-yellow-500', dot: 'bg-yellow-500' },
                { label: 'Low',      ...activeData.riskOverview.low,      color: 'bg-green-500', dot: 'bg-green-500' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                    <span className="text-gray-400">{r.label}</span>
                  </div>
                  <span className="text-gray-300 font-medium">{r.count} <span className="text-gray-600 font-normal">({r.pct}%)</span></span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/findings')} className="mt-5 text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 group/btn">
            View all findings <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="lg:col-span-6 rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] transition-all duration-300">
          <h3 className="text-sm font-semibold text-white mb-4">Findings Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={activeData.findingsOverTime}>
              <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,15,26,0.95)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  fontSize: 12,
                  backdropFilter: 'blur(20px)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Critical" />
              <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2.5} dot={false} name="High" />
              <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2.5} dot={false} name="Medium" />
              <Line type="monotone" dataKey="low" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Low" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] transition-all duration-300">
          <h3 className="text-sm font-semibold text-white mb-4">Top Vulnerabilities</h3>
          <div className="space-y-3">
            {activeData.topVulnerabilityTypes.map((v, i) => (
              <div key={v.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-[10px] text-gray-600 font-mono w-4">{i + 1}</span>
                  <span className="text-xs text-gray-300 truncate">{v.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(v.count / (activeData.topVulnerabilityTypes[0]?.count || 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                  <span className="text-xs text-white font-semibold w-5 text-right">{v.count}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/dashboard/analytics')} className="mt-5 text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 group/btn">
            View analytics <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Scans</h3>
            <button onClick={() => router.push('/dashboard/live-scan')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 group/btn">
              View all <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Target', 'Type', 'Status', 'Score', 'Findings', 'Time'].map(h => (
                    <th key={h} className="pb-3 text-left text-gray-500 font-medium pr-5 text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {activeData.recentScans.map((scan, i) => {
                  const type = typeBadge(scan.type);
                  return (
                    <motion.tr
                      key={scan.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => router.push('/dashboard/findings')}
                      className="hover:bg-white/[0.02] transition-colors group/row cursor-pointer"
                    >
                      <td className="py-3 pr-5">
                        <span className="text-gray-200 font-medium">{scan.target}</span>
                      </td>
                      <td className="py-3 pr-5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${type.cls}`}>
                          {type.icon}{type.label}
                        </span>
                      </td>
                      <td className="py-3 pr-5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${statusBadge(scan.status)}`}>
                          {scan.status === 'COMPLETED' ? 'Completed' : scan.status === 'FAILED' ? 'Failed' : scan.status}
                        </span>
                      </td>
                      <td className="py-3 pr-5">
                        <span className="font-semibold" style={{ color: (typeof scan.score === 'number' && scan.score > 0) ? scoreColor(scan.score).ring : '#6b7280' }}>
                          {(typeof scan.score === 'number' && scan.score > 0) ? `${scan.score}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-gray-400">{scan.findingsCount}</td>
                      <td className="py-3 text-gray-500">{scan.time}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 group hover:border-white/[0.08] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Scan Activity</h3>
          </div>
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/30 via-violet-500/10 to-transparent" />
            <div className="space-y-5">
              {activeData.scanActivity.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 relative"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.08 + 0.2, type: 'spring' }}
                    className={`mt-1.5 w-3.5 h-3.5 rounded-full border-2 border-background shrink-0 flex items-center justify-center ${a.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${a.type === 'success' ? 'bg-green-200' : 'bg-blue-200'}`} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 font-medium">{a.message}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{a.time}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
