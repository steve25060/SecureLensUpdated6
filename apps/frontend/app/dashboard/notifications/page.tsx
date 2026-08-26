'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, CheckCircle, Info, X, Archive, Filter, Mail, MailOpen, Trash2,
  Clock, Shield, AlertCircle, Zap, Settings, User, ExternalLink, ArrowRight,
  Loader2, Activity, Sparkles, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useLiveScanSync } from '@/lib/live-scan-store';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
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
  eventType?: string;
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    title: 'Critical Finding Detected',
    message: 'SQL Injection vulnerability found in /api/auth/login endpoint. CVSS: 9.8',
    type: 'error',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    category: 'finding',
    link: '/dashboard/findings',
    eventType: 'FINDING_ADDED'
  },
  {
    id: 'n-2',
    title: 'Live Audit Completed',
    message: 'Scan of target website completed with 14 findings (1 critical, 4 high)',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    category: 'scan',
    link: '/dashboard/reports',
    eventType: 'SCAN_COMPLETED'
  },
  {
    id: 'n-3',
    title: 'Exposed AWS Access Key',
    message: 'Hardcoded AWS access key detected in .env.example by scanner engine',
    type: 'error',
    read: false,
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    category: 'finding',
    link: '/dashboard/findings',
    eventType: 'FINDING_ADDED'
  },
  {
    id: 'n-4',
    title: 'Security Audit Report Ready',
    message: 'Your comprehensive executive compliance and vulnerability report is ready for export',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    category: 'system',
    link: '/dashboard/reports',
    eventType: 'REPORT_GENERATED'
  },
  {
    id: 'n-5',
    title: 'Weak TLS Configuration',
    message: 'Target website supports TLS 1.0. Upgrade to TLS 1.3 recommended',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
    category: 'finding',
    link: '/dashboard/findings',
    eventType: 'FINDING_ADDED'
  },
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
  account: { label: 'Account', icon: User, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' }
};

export default function NotificationsPage() {
  const { scans: liveScans, findings: liveFindings } = useLiveScanSync(5000);
  
  // Real-time synchronization - listen to critical actionable events
  const { isLive, eventCount, lastEventType, lastEventData, lastUpdate } = useRealtimeSync();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'scan' | 'finding' | 'system'>('all');
  const [toastQueue, setToastQueue] = useState<Array<{ id: string; message: string; type: string }>>([]);
  const lastProcessedTimeRef = useRef<number>(0);

  // Fetch real user notifications from backend
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (!token) return;
    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.body || n.message || '',
            type: n.type || 'info',
            read: Boolean(n.read),
            createdAt: n.createdAt || new Date().toISOString(),
            category: n.category || 'scan',
            link: n.metadata?.link,
            eventType: n.metadata?.eventType,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Show toast ONLY for distinct, actionable real-time security events
  useEffect(() => {
    const NOTIFIABLE_EVENTS = ['SCAN_STARTED', 'SCAN_COMPLETED', 'SCAN_FAILED', 'FINDING_ADDED', 'REPORT_GENERATED'];
    
    if (lastEventType && lastEventData && NOTIFIABLE_EVENTS.includes(lastEventType) && lastUpdate > lastProcessedTimeRef.current) {
      lastProcessedTimeRef.current = lastUpdate;
      const toastId = `${lastEventType}-${Date.now()}`;
      const toastMessage = generateToastMessage(lastEventType, lastEventData);
      
      setToastQueue(prev => [...prev.slice(-4), { id: toastId, message: toastMessage, type: lastEventType }]);
      
      // Add to persistent notifications list
      const newNotification: Notification = {
        id: toastId,
        title: lastEventType.replace(/_/g, ' '),
        message: toastMessage,
        type: getNotificationType(lastEventType),
        read: false,
        createdAt: new Date().toISOString(),
        category: getCategoryFromEvent(lastEventType),
        eventType: lastEventType,
      };
      
      setNotifications(prev => [newNotification, ...prev]);

      // Auto-remove toast after 4 seconds
      const timer = setTimeout(() => {
        setToastQueue(prev => prev.filter(t => t.id !== toastId));
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [lastEventType, lastEventData, lastUpdate]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return n.category === filter;
    });
  }, [notifications, filter]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Real-time Toast Notifications */}
      <AnimatePresence>
        {toastQueue.map((toast) => (
          <motion.div
            key={toast.id}
            className="fixed bottom-4 right-4 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-w-sm z-50"
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{toast.message}</p>
                <p className="text-xs text-slate-400 mt-1">{toast.type}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header with Real-time Status */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <p className="text-sm text-slate-400">Real-time security alerts and updates</p>
              </div>
            </div>

            {/* Live Status & Event Counter Badge */}
            <div className="flex items-center gap-3">
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700"
                animate={{ scale: isLive ? 1 : 0.95 }}
              >
                <Activity className={`w-4 h-4 ${isLive ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
                <span className="text-sm text-slate-300">{isLive ? 'Live' : 'Offline'}</span>
              </motion.div>

              {eventCount > 0 && (
                <motion.div
                  className="px-3 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <span className="text-sm font-bold text-violet-400">{eventCount}</span>
                </motion.div>
              )}

              {unreadCount > 0 && (
                <div className="px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-sm font-semibold text-red-400">{unreadCount} unread</span>
                </div>
              )}
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'unread', 'scan', 'finding', 'system'] as const).map(f => (
                <motion.button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === f
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark all read
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={notifications.length === 0}
                className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            <motion.div className="space-y-3" variants={containerVariants}>
              {filteredNotifications.map((notification, i) => {
                const typeIcon = typeConfig[notification.type].icon;
                const categoryInfo = categoryConfig[notification.category];
                
                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border transition-all group hover:shadow-lg ${
                      notification.read
                        ? 'bg-slate-800/30 border-slate-700/30'
                        : 'bg-slate-800/60 border-slate-700/60 shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg flex-shrink-0 ${typeConfig[notification.type].bg}`}>
                        {React.createElement(typeIcon, {
                          className: `w-5 h-5 ${typeConfig[notification.type].color}`
                        })}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white truncate">{notification.title}</h3>
                            <p className="text-sm text-slate-300 mt-1 line-clamp-2">{notification.message}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${categoryInfo.bg}`}>
                            {React.createElement(categoryInfo.icon, { className: 'w-3 h-3' })}
                            {categoryInfo.label}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notification.link && (
                          <Link href={notification.link}>
                            <button className="p-2 hover:bg-slate-700 rounded transition-colors">
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                            </button>
                          </Link>
                        )}
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 hover:bg-slate-700 rounded transition-colors"
                            title="Mark as read"
                          >
                            <MailOpen className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12"
              variants={itemVariants}
            >
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No notifications yet. Your real-time alerts will appear here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Helper functions
function generateToastMessage(eventType: string, data: any): string {
  switch (eventType) {
    case 'SCAN_STARTED':
      return `🚀 Scan started on ${data.target || 'new target'}`;
    case 'SCAN_COMPLETED':
      return `✅ Scan completed: ${data.findingCount || 0} findings`;
    case 'SCAN_FAILED':
      return `❌ Scan failed: ${data.reason || 'Unknown error'}`;
    case 'FINDING_ADDED':
      return `🔴 New finding: ${data.title} (${data.severity || 'unknown'})`;
    case 'FINDING_UPDATED':
      return `📝 Finding updated: ${data.title}`;
    case 'FINDING_DELETED':
      return `🗑️ Finding removed: ${data.title}`;
    case 'REPORT_GENERATED':
      return `📊 Report generated: ${data.name || 'New report'}`;
    case 'WORKSPACE_CREATED':
      return `📁 New workspace: ${data.name || 'Untitled'}`;
    case 'NOTIFICATION_RECEIVED':
      return `📢 ${data.message || 'New notification'}`;
    case 'SETTINGS_CHANGED':
      return `⚙️ Settings updated`;
    default:
      return `📌 ${eventType}: ${data.message || 'Event received'}`;
  }
}

function getNotificationType(eventType: string): 'info' | 'warning' | 'success' | 'error' {
  if (eventType.includes('SCAN') || eventType.includes('REPORT')) return 'info';
  if (eventType.includes('COMPLETED') || eventType.includes('SUCCESS')) return 'success';
  if (eventType.includes('FAILED') || eventType.includes('DELETED')) return 'error';
  if (eventType.includes('CRITICAL') || eventType.includes('HIGH')) return 'error';
  return 'warning';
}

function getCategoryFromEvent(eventType: string): 'scan' | 'finding' | 'system' | 'account' {
  if (eventType.includes('SCAN')) return 'scan';
  if (eventType.includes('FINDING') || eventType.includes('REPORT')) return 'finding';
  if (eventType.includes('ACCOUNT') || eventType.includes('USER')) return 'account';
  return 'system';
}
