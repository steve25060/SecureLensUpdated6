'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, CheckCircle, Info, X, Archive, Filter, Mail, MailOpen, Trash2,
  Clock, Shield, AlertCircle, Zap, Settings, User, ExternalLink, ArrowRight,
  Loader2, Activity, Sparkles, TrendingUp, Search, Check, RefreshCw, FileText, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useLiveScanSync, getCurrentUserKey } from '@/lib/live-scan-store';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { EventBus } from '@/lib/event-bus';
import { formatRelativeTime, formatExactDateTime } from '@/lib/time-utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
  category: 'scan' | 'finding' | 'report' | 'system' | 'account';
  target?: string;
  link?: string;
  eventType?: string;
}

const typeConfig = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

const categoryConfig = {
  scan: { label: 'Scan', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  finding: { label: 'Finding', icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  report: { label: 'Report', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  system: { label: 'System', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  account: { label: 'Account', icon: User, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
};

function getStorageReadIds(userKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`sl_read_notifications_${userKey}`) || localStorage.getItem('sl_header_read_notifications');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function getStorageDeletedIds(userKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`sl_deleted_notifications_${userKey}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export default function NotificationsPage() {
  const { scans: liveScans, findings: liveFindings, lastUpdated } = useLiveScanSync(3000);
  const { isLive, eventCount, lastEventType, lastEventData, lastUpdate } = useRealtimeSync();

  const [backendNotifications, setBackendNotifications] = useState<AppNotificationItem[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<AppNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<'all' | 'unread' | 'scan' | 'finding' | 'report' | 'system' | 'account'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastQueue, setToastQueue] = useState<Array<{ id: string; message: string; type: string }>>([]);
  const lastProcessedTimeRef = useRef<number>(0);

  const userKey = typeof window !== 'undefined' ? getCurrentUserKey() : 'default';

  // Hydrate read and deleted IDs from localStorage
  useEffect(() => {
    setReadIds(getStorageReadIds(userKey));
    setDeletedIds(getStorageDeletedIds(userKey));
  }, [userKey]);

  // Fetch backend notifications for authenticated user
  const fetchBackendNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/notifications', { headers }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: AppNotificationItem[] = data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.body || n.message || '',
            type: n.type || 'info',
            read: Boolean(n.read),
            createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt || Date.now()).toISOString(),
            category: n.category || 'system',
            link: n.metadata?.link || (n.category === 'scan' ? (n.metadata?.scanId ? `/dashboard/findings?scanId=${n.metadata.scanId}` : '/dashboard/live-scan') : n.category === 'finding' ? '/dashboard/findings' : n.category === 'report' ? '/dashboard/reports' : undefined),
            eventType: n.metadata?.eventType,
            target: n.metadata?.target,
          }));
          setBackendNotifications(mapped);
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications from backend:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendNotifications();
    const handleUpdate = () => fetchBackendNotifications(true);
    window.addEventListener('securelens:notifications-updated', handleUpdate);
    return () => window.removeEventListener('securelens:notifications-updated', handleUpdate);
  }, [fetchBackendNotifications]);

  // Listen to real-time events via EventBus
  useEffect(() => {
    const NOTIFIABLE_EVENTS = [
      'SCAN_STARTED', 'SCAN_COMPLETED', 'SCAN_FAILED',
      'FINDING_ADDED', 'REPORT_GENERATED', 'WORKSPACE_CREATED'
    ];

    if (lastEventType && lastEventData && NOTIFIABLE_EVENTS.includes(lastEventType) && lastUpdate > lastProcessedTimeRef.current) {
      lastProcessedTimeRef.current = lastUpdate;
      const toastId = `${lastEventType}-${Date.now()}`;
      const toastMessage = generateToastMessage(lastEventType, lastEventData);

      setToastQueue(prev => [...prev.slice(-3), { id: toastId, message: toastMessage, type: lastEventType }]);

      const newNotif: AppNotificationItem = {
        id: toastId,
        title: lastEventType.replace(/_/g, ' '),
        message: toastMessage,
        type: getNotificationType(lastEventType),
        read: false,
        createdAt: new Date().toISOString(),
        category: getCategoryFromEvent(lastEventType),
        eventType: lastEventType,
        target: lastEventData?.target,
        link: lastEventType.includes('SCAN')
          ? (lastEventData?.scanId ? `/dashboard/findings?scanId=${lastEventData.scanId}` : '/dashboard/live-scan')
          : lastEventType.includes('FINDING')
          ? '/dashboard/findings'
          : lastEventType.includes('REPORT')
          ? '/dashboard/reports'
          : undefined,
      };

      setRealtimeNotifications(prev => [newNotif, ...prev]);

      const timer = setTimeout(() => {
        setToastQueue(prev => prev.filter(t => t.id !== toastId));
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [lastEventType, lastEventData, lastUpdate]);

  // Combine and deduplicate backend, realtime, and live scan milestones
  const allNotifications = useMemo(() => {
    const notifMap = new Map<string, AppNotificationItem>();

    // 1. Backend persistent notifications
    backendNotifications.forEach(n => {
      if (!deletedIds.has(n.id)) {
        notifMap.set(n.id, {
          ...n,
          read: n.read || readIds.has(n.id),
        });
      }
    });

    // 2. Realtime dynamic events
    realtimeNotifications.forEach(n => {
      if (!deletedIds.has(n.id) && !notifMap.has(n.id)) {
        notifMap.set(n.id, {
          ...n,
          read: n.read || readIds.has(n.id),
        });
      }
    });

    // 3. Auto-derive notifications from completed live scans
    liveScans.forEach(ls => {
      const scanNotifId = `notif-scan-${ls.id}`;
      if (!deletedIds.has(scanNotifId) && !notifMap.has(scanNotifId) && ls.target) {
        const critCount = (ls.findings || []).filter(f => f?.severity === 'CRITICAL').length;
        const findingsCount = ls.findingsCount ?? (ls.findings?.length || 0);

        notifMap.set(scanNotifId, {
          id: scanNotifId,
          title: ls.status === 'COMPLETED' ? `Live Scan Completed: ${ls.target}` : ls.status === 'FAILED' ? `Scan Failed: ${ls.target}` : `Scan Running: ${ls.target}`,
          message: ls.status === 'COMPLETED'
            ? `Security audit discovered ${findingsCount} finding${findingsCount === 1 ? '' : 's'} (Posture Score: ${ls.score ?? 98}/100)`
            : ls.status === 'FAILED'
            ? `Scanner engine encountered an execution error on target ${ls.target}`
            : `Automated vulnerability inspection in progress for ${ls.target}`,
          type: ls.status === 'FAILED' ? 'error' : critCount > 0 ? 'warning' : 'success',
          read: readIds.has(scanNotifId),
          createdAt: ls.createdAt || ls.time || new Date().toISOString(),
          category: 'scan',
          target: ls.target,
          link: `/dashboard/findings?scanId=${ls.id}`,
        });
      }
    });

    return Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [backendNotifications, realtimeNotifications, liveScans, readIds, deletedIds]);

  // Filter and search
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(n => {
      // Tab filter
      if (filter === 'unread' && n.read) return false;
      if (filter !== 'all' && filter !== 'unread' && n.category !== filter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchMessage = n.message.toLowerCase().includes(q);
        const matchTarget = n.target?.toLowerCase().includes(q);
        return matchTitle || matchMessage || matchTarget;
      }
      return true;
    });
  }, [allNotifications, filter, search]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !n.read).length;
  }, [allNotifications]);

  // Actions
  const handleMarkAsRead = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newRead = new Set(readIds);
    newRead.add(id);
    setReadIds(newRead);

    try {
      localStorage.setItem(`sl_read_notifications_${userKey}`, JSON.stringify(Array.from(newRead)));
      localStorage.setItem('sl_header_read_notifications', JSON.stringify(Array.from(newRead)));
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
  }, [readIds, userKey]);

  const handleMarkAllAsRead = useCallback(async () => {
    const allIds = allNotifications.map(n => n.id);
    const newRead = new Set([...readIds, ...allIds]);
    setReadIds(newRead);

    try {
      localStorage.setItem(`sl_read_notifications_${userKey}`, JSON.stringify(Array.from(newRead)));
      localStorage.setItem('sl_header_read_notifications', JSON.stringify(Array.from(newRead)));
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
  }, [allNotifications, readIds, userKey]);

  const handleDelete = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newDeleted = new Set(deletedIds);
    newDeleted.add(id);
    setDeletedIds(newDeleted);

    try {
      localStorage.setItem(`sl_deleted_notifications_${userKey}`, JSON.stringify(Array.from(newDeleted)));
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
  }, [deletedIds, userKey]);

  const handleClearAll = useCallback(async () => {
    const allIds = allNotifications.map(n => n.id);
    const newDeleted = new Set([...deletedIds, ...allIds]);
    setDeletedIds(newDeleted);

    try {
      localStorage.setItem(`sl_deleted_notifications_${userKey}`, JSON.stringify(Array.from(newDeleted)));
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch('/api/notifications/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    setBackendNotifications([]);
    setRealtimeNotifications([]);
    window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
  }, [allNotifications, deletedIds, userKey]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Toast Notification Stack */}
      <div className="fixed bottom-6 right-6 z-[60] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toastQueue.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border border-violet-500/30 bg-violet-600/15 backdrop-blur-xl text-white text-xs font-medium shadow-2xl shadow-violet-900/40"
            >
              <Sparkles size={15} className="text-violet-400 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-semibold text-white truncate">{toast.message}</p>
                <p className="text-[10px] text-violet-300/80 uppercase tracking-wider">{toast.type.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => setToastQueue(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-60 hover:opacity-100 p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Security Notifications & Live Alerts
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE SYNC
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time threat alerts, scan completion telemetry, and automated security advisory notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <MailOpen size={13} /> Mark all as read ({unreadCount})
            </motion.button>
          )}
          {allNotifications.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-gray-400 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 size={13} /> Clear all
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06] flex-wrap">
          {(['all', 'unread', 'scan', 'finding', 'report', 'system'] as const).map(f => {
            const count =
              f === 'all'
                ? allNotifications.length
                : f === 'unread'
                ? unreadCount
                : allNotifications.filter(n => n.category === f).length;

            const isActive = filter === f;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                }`}
              >
                <span>{f === 'all' ? 'All Alerts' : f === 'unread' ? 'Unread' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : f === 'unread' && unreadCount > 0
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/[0.04] text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative max-w-sm flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts by target or title..."
            className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-violet-500/50 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
          />
        </div>
      </motion.div>

      {/* Notifications List / Empty State */}
      <AnimatePresence mode="wait">
        {filteredNotifications.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-16 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-violet-400 opacity-80" />
            </div>
            <h3 className="text-base font-semibold text-white">
              {filter === 'unread'
                ? 'All caught up!'
                : search.trim()
                ? 'No alerts match your search'
                : 'No notifications recorded yet'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
              {filter === 'unread'
                ? 'You have read all security advisories and notifications.'
                : search.trim()
                ? 'Try adjusting your search terms or clearing the filter.'
                : 'Automated vulnerability alerts, scan milestone telemetry, and report ready notifications will appear here in real-time.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredNotifications.map((notif) => {
              const cfg = typeConfig[notif.type] || typeConfig.info;
              const catCfg = categoryConfig[notif.category] || categoryConfig.system;
              const Icon = cfg.icon;
              const CatIcon = catCfg.icon;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  variants={itemVariants}
                  className={`rounded-2xl border p-4.5 transition-all group relative ${
                    notif.read
                      ? 'bg-white/[0.015] border-white/[0.04] opacity-80 hover:opacity-100 hover:border-white/[0.08]'
                      : 'bg-white/[0.035] border-violet-500/20 shadow-lg shadow-violet-900/10 hover:border-violet-500/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity Icon */}
                    <div className={`p-2.5 rounded-xl ${cfg.bg} border ${cfg.border} shrink-0 mt-0.5`}>
                      <Icon size={16} className={cfg.color} />
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`text-sm font-bold truncate ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed break-words">
                        {notif.message}
                      </p>

                      {/* Meta pills & direct links */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap text-xs">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catCfg.bg} ${catCfg.color}`}>
                          <CatIcon size={10} />
                          {catCfg.label}
                        </span>

                        {notif.target && (
                          <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                            <ExternalLink size={10} className="text-gray-500" />
                            {notif.target}
                          </span>
                        )}

                        <span
                          className="flex items-center gap-1 text-[11px] text-gray-500"
                          title={formatExactDateTime(notif.createdAt)}
                        >
                          <Clock size={11} className="text-gray-500" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>

                        {notif.link && (
                          <Link
                            href={notif.link}
                            className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors ml-auto group/link"
                          >
                            <span>View Details</span>
                            <ArrowRight size={11} className="transition-transform group-hover/link:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Actions on hover */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-violet-300 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <MailOpen size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete notification"
                      >
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

function generateToastMessage(eventType: string, data: any): string {
  switch (eventType) {
    case 'SCAN_STARTED':
      return `🚀 Live scan initiated for ${data?.target || 'target asset'}`;
    case 'SCAN_COMPLETED':
      return `✅ Scan completed on ${data?.target || 'target'} (${data?.findingCount ?? data?.findingsCount ?? 0} findings discovered)`;
    case 'SCAN_FAILED':
      return `❌ Scan failed on ${data?.target || 'target'}: ${data?.reason || 'Execution interrupted'}`;
    case 'FINDING_ADDED':
      return `🔴 New ${data?.severity || 'Vulnerability'} Finding: ${data?.title || 'Security Advisory'}`;
    case 'REPORT_GENERATED':
      return `📊 Report ready for export: ${data?.name || 'Security Audit Summary'}`;
    case 'WORKSPACE_CREATED':
      return `✨ Security Workspace initialized: ${data?.name || 'New Workspace'}`;
    default:
      return `📢 Alert: ${data?.message || eventType.replace(/_/g, ' ')}`;
  }
}

function getNotificationType(eventType: string): 'info' | 'warning' | 'success' | 'error' {
  if (eventType.includes('COMPLETED') || eventType.includes('SUCCESS') || eventType.includes('CREATED')) return 'success';
  if (eventType.includes('FAILED') || eventType.includes('ERROR') || eventType.includes('CRITICAL')) return 'error';
  if (eventType.includes('FINDING') || eventType.includes('HIGH')) return 'warning';
  return 'info';
}

function getCategoryFromEvent(eventType: string): 'scan' | 'finding' | 'report' | 'system' | 'account' {
  if (eventType.includes('SCAN')) return 'scan';
  if (eventType.includes('FINDING')) return 'finding';
  if (eventType.includes('REPORT')) return 'report';
  if (eventType.includes('ACCOUNT') || eventType.includes('USER')) return 'account';
  return 'system';
}
