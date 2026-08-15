'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, CheckCircle, Info, X, Archive, Filter, Mail, MailOpen, Trash2,
  Clock, Shield, AlertCircle, Zap, Settings, User, ExternalLink, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useLiveScanSync } from '@/lib/live-scan-store';
import { formatRelativeTime, formatExactDateTime } from '@/lib/time-utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
  category: 'scan' | 'finding' | 'system' | 'account';
  target?: string;
  link?: string;
}

const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'n-1', title: 'Critical Finding Detected', message: 'SQL Injection vulnerability found in /api/auth/login endpoint. CVSS: 9.8', type: 'error', read: false, createdAt: new Date(Date.now() - 5 * 60000).toISOString(), category: 'finding', link: '/dashboard/findings' },
  { id: 'n-2', title: 'Live Audit Completed', message: 'Scan of target website completed with 14 findings (1 critical, 4 high)', type: 'success', read: false, createdAt: new Date(Date.now() - 15 * 60000).toISOString(), category: 'scan', link: '/dashboard/reports' },
  { id: 'n-3', title: 'Exposed AWS Access Key', message: 'Hardcoded AWS access key detected in .env.example by scanner engine', type: 'error', read: false, createdAt: new Date(Date.now() - 35 * 60000).toISOString(), category: 'finding', link: '/dashboard/findings' },
  { id: 'n-4', title: 'Security Audit Report Ready', message: 'Your comprehensive executive compliance and vulnerability report is ready for export', type: 'info', read: true, createdAt: new Date(Date.now() - 90 * 60000).toISOString(), category: 'system', link: '/dashboard/reports' },
  { id: 'n-5', title: 'Weak TLS Configuration', message: 'Target website supports TLS 1.0. Upgrade to TLS 1.3 recommended', type: 'warning', read: true, createdAt: new Date(Date.now() - 180 * 60000).toISOString(), category: 'finding', link: '/dashboard/findings' },
  { id: 'n-6', title: 'Workspace Posture Updated', message: 'Production security workspace asset inventory synchronized', type: 'info', read: true, createdAt: new Date(Date.now() - 360 * 60000).toISOString(), category: 'system', link: '/dashboard/workspaces' },
];

const typeConfig = {
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

const categoryConfig = {
  scan: { label: 'Scan', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  finding: { label: 'Finding', icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  system: { label: 'System', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  account: { label: 'Account', icon: User, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
};

export default function NotificationsPage() {
  const { scans: liveScans, findings: liveFindings, lastUpdated } = useLiveScanSync();
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [deletedNotifIds, setDeletedNotifIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('sl_deleted_notifications') || '[]');
      } catch {}
    }
    return [];
  });
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('sl_read_notifications') || '[]');
      } catch {}
    }
    return [];
  });
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
      fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          if (!isMounted) return;
          if (Array.isArray(data) && data.length > 0) {
            const formatted: Notification[] = data.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.body || n.message || '',
              type: (n.type || 'info') as Notification['type'],
              read: Boolean(n.read),
              createdAt: n.createdAt || new Date().toISOString(),
              category: (n.category || 'scan') as Notification['category'],
            }));
            setNotifications(formatted);
          }
        })
        .catch(() => {});
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeNotifications = React.useMemo(() => {
    const liveItems: Notification[] = [];

    liveScans.forEach((ls) => {
      liveItems.push({
        id: `live-notif-scan-${ls.id}`,
        title: `Live Scan Finished: ${ls.target}`,
        message: `Security audit completed with ${ls.findingsCount || 0} vulnerabilities detected across ${ls.engines?.length || 5} engines.`,
        type: ls.findingsCount > 0 ? 'warning' : 'success',
        read: readNotifIds.includes(`live-notif-scan-${ls.id}`),
        createdAt: ls.createdAt || new Date().toISOString(),
        category: 'scan',
        target: ls.target,
        link: `/dashboard/live-scan?target=${encodeURIComponent(ls.target)}`,
      });
    });

    const critFindings = liveFindings.filter(f => f.severity === 'CRITICAL');
    critFindings.slice(0, 3).forEach(cf => {
      liveItems.push({
        id: `live-notif-crit-${cf.id}`,
        title: `🔴 Critical Vulnerability: ${cf.title}`,
        message: `Discovered on target ${cf.target} by ${cf.source}. Immediate remediation required.`,
        type: 'error',
        read: readNotifIds.includes(`live-notif-crit-${cf.id}`),
        createdAt: cf.createdAt || new Date().toISOString(),
        category: 'finding',
        target: cf.target,
        link: `/dashboard/findings?target=${encodeURIComponent(cf.target)}`,
      });
    });

    const combined = [...liveItems, ...notifications.map(n => ({
      ...n,
      read: n.read || readNotifIds.includes(n.id),
    }))];

    const uniqueMap = new Map();
    combined.forEach(item => {
      if (!uniqueMap.has(item.id) && !deletedNotifIds.includes(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [liveScans, liveFindings, notifications, deletedNotifIds, readNotifIds]);

  const markAsRead = async (id: string) => {
    setReadNotifIds(prev => {
      const updated = [...prev, id];
      if (typeof window !== 'undefined') localStorage.setItem('sl_read_notifications', JSON.stringify(updated));
      return updated;
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    setDeletedNotifIds(prev => {
      const updated = [...prev, id];
      if (typeof window !== 'undefined') localStorage.setItem('sl_deleted_notifications', JSON.stringify(updated));
      return updated;
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  };

  const markAllRead = async () => {
    const allIds = activeNotifications.map(n => n.id);
    setReadNotifIds(prev => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      if (typeof window !== 'undefined') localStorage.setItem('sl_read_notifications', JSON.stringify(updated));
      return updated;
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  };

  const filtered = activeNotifications
    .filter(n => {
      if (filter === 'unread') return !n.read;
      if (filter === 'read') return n.read;
      return true;
    })
    .filter(n => {
      if (categoryFilter === 'all') return true;
      return n.category === categoryFilter;
    });

  const unreadCount = activeNotifications.filter(n => !n.read).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-all cursor-pointer">
              <MailOpen size={13} /> Mark all read
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-all cursor-pointer">
            <Archive size={13} /> Archive
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06]">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                filter === f ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-violet-500 text-white rounded-full text-[10px]">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/[0.06]" />

        <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06]">
          {(['all', 'scan', 'finding', 'system', 'account'] as const).map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                categoryFilter === c ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {c === 'all' ? 'All Types' : c}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Bell size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-gray-600 mt-1">We&apos;ll notify you when something important happens.</p>
          </motion.div>
        ) : (
          <motion.div key="list" variants={containerVariants} initial="hidden" animate="visible" className="space-y-2.5">
            {filtered.map((notif) => {
              const config = typeConfig[notif.type];
              const catConfig = categoryConfig[notif.category];
              const Icon = config.icon;
              const CatIcon = catConfig.icon;
              return (
                <motion.div key={notif.id} layout variants={itemVariants}
                  className={`rounded-xl border p-4 hover:bg-white/[0.03] transition-all group ${
                    notif.read ? 'bg-white/[0.01] border-white/[0.04] opacity-60' : `${config.bg} ${config.border}`
                  }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${config.bg} ${config.border} border shrink-0 mt-0.5`}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={`text-sm font-semibold ${notif.read ? 'text-gray-400' : 'text-white'}`}>{notif.title}</h3>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-400" title={formatExactDateTime(notif.createdAt)}>
                          <Clock size={10} className="text-violet-400" />{formatRelativeTime(notif.createdAt)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${catConfig.bg}`}>
                          <CatIcon size={9} className={catConfig.color} />{catConfig.label}
                        </span>
                        {notif.link && (
                          <Link href={notif.link} className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium transition-colors ml-auto">
                            View <ArrowRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      {!notif.read && (
                        <button onClick={() => markAsRead(notif.id)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-violet-400 transition-colors cursor-pointer"
                          title="Mark as read">
                          <MailOpen size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(notif.id)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete notification">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
