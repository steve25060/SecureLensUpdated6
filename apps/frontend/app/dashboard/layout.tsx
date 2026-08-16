'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/common/Sidebar';
import Header from '@/components/dashboard/common/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ArrowRight, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getActiveScanSession, setActiveScanSession, EVENT_ACTIVE_SCAN_UPDATED, type ActiveScanSession } from '@/lib/live-scan-store';
import { applyThemeConfig, getStoredThemeConfig, THEME_PRESETS } from '@/lib/theme-manager';
import GlobalNotifications from '@/components/GlobalNotifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accentColor, setAccentColor] = React.useState('#8b5cf6');
  const [activeScan, setActiveScan] = useState<ActiveScanSession | null>(null);
  const [dismissedScanId, setDismissedScanId] = useState<string | null>(null);

  React.useEffect(() => {
    const syncTheme = () => {
      const config = getStoredThemeConfig();
      applyThemeConfig(config);
      const preset = THEME_PRESETS.find(p => p.id === config.presetId);
      if (preset) {
        setAccentColor(preset.primary);
      }
    };

    syncTheme();
    window.addEventListener('themeOrAccentUpdated', syncTheme);
    return () => {
      window.removeEventListener('themeOrAccentUpdated', syncTheme);
    };
  }, []);

  // ─── Global Live Scan Monitor ──────────────────────────────────────────────
  useEffect(() => {
    const checkActiveScan = async () => {
      const session = getActiveScanSession();
      if (!session) {
        setActiveScan(null);
        return;
      }

      if (session.status === 'running' || session.status === 'queued' || session.status === 'processing') {
        setActiveScan(session);

        // Background poll status if user is on other pages
        try {
          const token = localStorage.getItem('access_token') || localStorage.getItem('sl_token');
          const res = await fetch(`/api/scans/${session.scanId}/status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const st = await res.json();
            const currentSt = (st.status?.toLowerCase() as ActiveScanSession['status']) || 'running';
            const prog = typeof st.progress === 'number' ? st.progress : session.progress;
            
            const updated: ActiveScanSession = {
              ...session,
              status: currentSt,
              progress: prog,
            };
            setActiveScanSession(updated);
            setActiveScan(updated);
          }
        } catch { /* ignore network blips */ }
      } else {
        setActiveScan(session);
      }
    };

    checkActiveScan();
    const interval = setInterval(checkActiveScan, 2000);

    const handleSessionUpdate = (e: any) => {
      setActiveScan(e.detail || null);
    };
    window.addEventListener(EVENT_ACTIVE_SCAN_UPDATED, handleSessionUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener(EVENT_ACTIVE_SCAN_UPDATED, handleSessionUpdate);
    };
  }, []);

  const isLiveScanPage = pathname === '/dashboard/live-scan';
  const showFloatingWidget = !isLiveScanPage && activeScan && activeScan.scanId !== dismissedScanId && (
    activeScan.status === 'running' || activeScan.status === 'queued' || activeScan.status === 'processing'
  );

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* ─── Global Real-Time Notifications ─────────────────────────────────── */}
      <GlobalNotifications />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{
            background: `radial-gradient(ellipse at top right, ${accentColor}20 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{
            background: `radial-gradient(ellipse at bottom left, ${accentColor}10 0%, transparent 50%)`,
          }}
        />
      </div>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* ─── Global Background Live Scan Floating Indicator ─────────────────── */}
      <AnimatePresence>
        {showFloatingWidget && activeScan && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0b0f19]/95 border border-violet-500/40 shadow-2xl shadow-violet-600/25 backdrop-blur-2xl group transition-all hover:border-violet-400"
          >
            <div
              onClick={() => router.push(`/dashboard/live-scan?scanId=${activeScan.scanId}`)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                <Radio size={16} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0b0f19] animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0b0f19]" />
              </div>
              <div className="min-w-0 max-w-[220px]">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-white truncate">Live Scan in Progress</p>
                  <span className="text-[11px] font-bold text-violet-400 tabular-nums">{activeScan.progress}%</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{activeScan.target || 'Target Website'}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-violet-300 group-hover:text-white font-medium pl-2 border-l border-white/10">
                <span>View</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissedScanId(activeScan.scanId);
              }}
              title="Dismiss floating banner (scan will continue in background)"
              className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
