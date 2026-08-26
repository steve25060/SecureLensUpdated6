'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  Radio,
  ShieldAlert,
  FileText,
  Sparkles,
  BarChart2,
  Settings,
  Bell,
  Menu,
  X,
  Zap,
  Shield,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard',     href: '/dashboard',              icon: LayoutDashboard },
  { name: 'Workspaces',    href: '/dashboard/workspaces',   icon: Briefcase },
  { name: 'Live Scan',     href: '/dashboard/live-scan',    icon: Radio },
  { name: 'Findings',      href: '/dashboard/findings',     icon: ShieldAlert },
  { name: 'Reports',       href: '/dashboard/reports',      icon: FileText },
  { name: 'AI Copilot',    href: '/dashboard/ai-copilot',   icon: Sparkles },
  { name: 'Analytics',     href: '/dashboard/analytics',    icon: BarChart2 },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings',      href: '/dashboard/settings',     icon: Settings },
] as const;

interface NavLinksProps {
  pathname: string;
  onClose?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ pathname, onClose }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
        if (token) {
          fetch('/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.ok ? r.json() : [])
            .then(data => {
              if (Array.isArray(data)) {
                setUnreadCount(data.filter((n: any) => !n.read).length);
              }
            })
            .catch(() => {});
        } else {
          setUnreadCount(0);
        }
      } catch {}
    };
    updateUnread();
    window.addEventListener('storage', updateUnread);
    window.addEventListener('userProfileUpdated', updateUnread);
    window.addEventListener('securelens:notifications-updated', updateUnread);
    return () => {
      window.removeEventListener('storage', updateUnread);
      window.removeEventListener('userProfileUpdated', updateUnread);
      window.removeEventListener('securelens:notifications-updated', updateUnread);
    };
  }, []);

  return (
    <nav className="mt-3 space-y-1 px-3" aria-label="Main navigation">
      {NAV_ITEMS.map((item, index) => {
        const { name, href, icon: Icon } = item;
        const badgeCount: number = name === 'Notifications' ? unreadCount : ('badge' in item ? Number(item.badge) : 0);
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href);
        const isHovered = hoveredItem === name;

        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link
              href={href}
              onClick={onClose}
              onMouseEnter={() => setHoveredItem(name)}
              onMouseLeave={() => setHoveredItem(null)}
              className="relative group block"
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-300 ease-out overflow-hidden
                ${isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
                }
              `}>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/20 via-violet-600/10 to-transparent border border-violet-500/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  >
                    <div className="absolute left-0 top-1/3 bottom-1/3 w-0.5 bg-gradient-to-b from-violet-400 to-violet-600 rounded-full" />
                  </motion.div>
                )}

                <motion.div
                  className={`
                    relative z-10 flex items-center gap-3 w-full
                    ${isActive ? '' : 'group-hover:translate-x-1'}
                    transition-transform duration-200
                  `}
                >
                  <div className={`
                    relative flex items-center justify-center w-8 h-8 rounded-lg
                    transition-all duration-300
                    ${isActive
                      ? 'bg-violet-600/20 text-violet-400'
                      : 'text-gray-500 group-hover:text-gray-300 bg-transparent group-hover:bg-white/5'
                    }
                  `}>
                    <Icon size={16} className="transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <span className="relative z-10 flex-1">{name}</span>
                  {badgeCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full px-1.5 py-0.5 leading-none shadow-lg shadow-red-500/25 relative z-10"
                    >
                      {badgeCount}
                    </motion.span>
                  )}
                </motion.div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
};

const SidebarContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/[0.04] shrink-0">
        <Link
          href="/"
          onClick={onClose}
          className="inline-flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:shadow-violet-600/40 transition-shadow">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Secure<span className="text-violet-400">Lens</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-4 scrollbar-thin">
        <NavLinks pathname={pathname} onClose={onClose} />
      </div>

      <div className="px-3 pb-4 shrink-0">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600/10 via-violet-600/5 to-transparent border border-violet-500/20 p-4 group hover:border-violet-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-white">Upgrade to Pro</p>
            </div>
            <p className="text-[11px] text-gray-400/80 mb-3 leading-relaxed">
              Unlock AI-powered scans, unlimited workspaces, and team collaboration.
            </p>
            <button className="relative w-full py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-500 hover:to-violet-600 active:from-violet-700 active:to-violet-800 transition-all duration-200 shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.button
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-surface border border-white/10 text-violet-400 shadow-lg backdrop-blur-xl"
        onClick={() => setMobileOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </motion.button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col md:hidden bg-background-secondary border-r border-white/[0.06]"
              aria-label="Mobile navigation"
            >
              <motion.button
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close navigation"
              >
                <X size={18} />
              </motion.button>
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex flex-col w-[var(--sidebar-width)] bg-background-secondary border-r border-white/[0.04] shrink-0 min-h-screen">
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
