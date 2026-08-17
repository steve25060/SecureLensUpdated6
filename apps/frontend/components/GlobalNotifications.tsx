'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus, EventPayload } from '@/lib/event-bus';
import { X, CheckCircle2, AlertTriangle, Info, Zap, FileText, Activity } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  icon: any;
  timestamp: number;
}

const MAX_TOASTS = 5;
const TOAST_DURATION = 4000;

/**
 * 🔔 GLOBAL NOTIFICATIONS
 * 
 * Real-time toast notifications that appear across ALL dashboard pages
 * Subscribes to EventBus and shows user-friendly notifications for all events
 */
export default function GlobalNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = EventBus.subscribe('*', (payload: EventPayload) => {
      const toast = eventToToast(payload);
      if (toast) {
        addToast(toast);
      }
    });

    return unsubscribe;
  }, []);

  const addToast = (toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    setToasts(prev => {
      const updated = [newToast, ...prev].slice(0, MAX_TOASTS);
      return updated;
    });

    // Auto-dismiss
    setTimeout(() => {
      dismissToast(newToast.id);
    }, TOAST_DURATION);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, x: 100 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto"
          >
            <div
              className={`
                flex items-center gap-3 min-w-[320px] max-w-[440px] px-4 py-3.5 rounded-2xl shadow-2xl
                backdrop-blur-2xl border transition-all
                ${toast.type === 'success' ? 'bg-[#0b1615]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40' : ''}
                ${toast.type === 'warning' ? 'bg-[#151222]/95 border-violet-500/40 text-violet-200 shadow-violet-950/40' : ''}
                ${toast.type === 'info' ? 'bg-[#0c1424]/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/40' : ''}
                ${toast.type === 'error' ? 'bg-[#1a1215]/95 border-rose-500/40 text-rose-200 shadow-rose-950/40' : ''}
              `}
            >
              <div
                className={`
                  p-1.5 rounded-xl
                  ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                  ${toast.type === 'warning' ? 'bg-violet-500/20 text-violet-300' : ''}
                  ${toast.type === 'info' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                  ${toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' : ''}
                `}
              >
                <toast.icon className="w-4 h-4" />
              </div>
              
              <p className="flex-1 text-xs font-semibold text-white/95 leading-snug">
                {toast.message}
              </p>
              
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Convert EventBus payload to user-friendly toast notification
 */
function eventToToast(payload: EventPayload): Omit<Toast, 'id' | 'timestamp'> | null {
  const { type, data } = payload;

  switch (type) {
    case 'SCAN_STARTED':
      return {
        message: `🚀 Scan started: ${data?.target || 'Unknown target'}`,
        type: 'info',
        icon: Zap,
      };

    case 'SCAN_COMPLETED':
      const score = data?.score ?? 98;
      return {
        message: `✅ Scan completed: ${data?.target || 'Target'} (Score: ${score}/100)`,
        type: 'success',
        icon: CheckCircle2,
      };

    case 'SCAN_FAILED':
      return {
        message: `❌ Scan failed: ${data?.target || 'Target'}`,
        type: 'error',
        icon: AlertTriangle,
      };

    case 'FINDING_ADDED':
      const findingSeverity = (data?.severity || '').toUpperCase();
      if (findingSeverity === 'CRITICAL' || findingSeverity === 'HIGH') {
        return {
          message: `🛡️ New ${findingSeverity} finding: ${data?.title || 'Vulnerability detected'}`,
          type: 'warning',
          icon: Zap,
        };
      }
      return null; // Don't notify for low severity

    case 'FINDINGS_BULK_DELETED':
      return {
        message: `🗑️ Deleted ${data?.count || 0} findings`,
        type: 'info',
        icon: Info,
      };

    case 'WORKSPACE_CREATED':
      return {
        message: `✨ Workspace created: ${data?.name || 'New workspace'}`,
        type: 'success',
        icon: CheckCircle2,
      };

    case 'WORKSPACE_DELETED':
      return {
        message: `🗑️ Workspace deleted: ${data?.name || 'Workspace'}`,
        type: 'info',
        icon: Info,
      };

    case 'REPORT_GENERATED':
      return {
        message: `📄 Report generated: ${data?.format || 'Report'}`,
        type: 'success',
        icon: FileText,
      };

    case 'ANALYTICS_UPDATED':
      return {
        message: `📊 Analytics updated`,
        type: 'info',
        icon: Activity,
      };

    default:
      return null; // Don't show toast for other events
  }
}
