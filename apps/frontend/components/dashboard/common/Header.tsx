'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User, Settings, Moon, Sun, CheckCircle, AlertTriangle, Info, X, Clock, Radio, Palette } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLiveClock } from '@/lib/time-utils';
import { getStoredThemeConfig, THEME_PRESETS } from '@/lib/theme-manager';

interface User {
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/workspaces': 'Workspaces',
  '/dashboard/live-scan': 'Live Scan',
  '/dashboard/github-scan': 'GitHub Scan',
  '/dashboard/findings': 'Findings',
  '/dashboard/reports': 'Reports',
  '/dashboard/ai-copilot': 'AI Copilot',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
  '/dashboard/notifications': 'Notifications',
};

interface HeaderNotification {
  id: string | number;
  title: string;
  message: string;
  time: string;
  type: string;
  read: boolean;
}

const Header: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [initials, setInitials] = useState('U');
  const router = useRouter();
  const pathname = usePathname();
  const notifRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';
  const liveClock = useLiveClock(1000);

  useEffect(() => {
    const loadUserData = () => {
      const userStr = localStorage.getItem('user');
      const userEmail = localStorage.getItem('user_email');
      const userName = localStorage.getItem('user_name');
      const googleUser = localStorage.getItem('google_user');

      let userData: User = {};

      if (userStr) {
        try { userData = JSON.parse(userStr); } catch { }
      }
      if (userEmail) userData.email = userEmail;
      if (userName) userData.name = userName;
      if (googleUser) {
        try {
          const gd = JSON.parse(googleUser);
          userData.firstName = gd.given_name;
          userData.lastName = gd.family_name;
          userData.email = gd.email;
        } catch { }
      }

      setUser(userData);

      let displayName = '';
      if (userData.name) displayName = userData.name;
      else if (userData.firstName && userData.lastName) displayName = `${userData.firstName} ${userData.lastName}`;
      else if (userData.firstName) displayName = userData.firstName;
      else if (userData.email) displayName = userData.email.split('@')[0];

      if (displayName) {
        const parts = displayName.split(' ');
        const init = parts.map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
        setInitials(init || 'U');
      }
    };

    loadUserData();

    const handleProfileUpdate = () => loadUserData();
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const handleLogout = () => {
    ['access_token', 'user', 'user_email', 'user_name', 'google_user', 'sl_token', 'sl-auth'].forEach(k => localStorage.removeItem(k));
    router.push('/login');
  };

  const [readNotifIds, setReadNotifIds] = useState<(string | number)[]>([]);

  const fetchHeaderNotifications = () => {
    try {
      const storedRead = JSON.parse(localStorage.getItem('sl_header_read_notifications') || '[]');
      setReadNotifIds(storedRead);
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setNotifications(data.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.body || n.message || '',
              type: n.type || 'info',
              read: Boolean(n.read),
              time: 'Just now',
            })));
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchHeaderNotifications();
    window.addEventListener('securelens:notifications-updated', fetchHeaderNotifications);
    window.addEventListener('storage', fetchHeaderNotifications);
    return () => {
      window.removeEventListener('securelens:notifications-updated', fetchHeaderNotifications);
      window.removeEventListener('storage', fetchHeaderNotifications);
    };
  }, []);

  const handleMarkAllRead = async () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('sl_header_read_notifications', JSON.stringify(allIds));
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
    if (token) {
      fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
  };

  const handleNotifClick = async (id: string | number) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      localStorage.setItem('sl_header_read_notifications', JSON.stringify(updated));
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('sl_token') : null;
      if (token) {
        fetch(`/api/notifications/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('securelens:notifications-updated'));
    }
    setNotifOpen(false);
    router.push('/dashboard/notifications');
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = (e.target as HTMLInputElement).value.trim();
      if (q) {
        router.push(`/dashboard/findings?search=${encodeURIComponent(q)}`);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !readNotifIds.includes(n.id)).length;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} className="text-green-400" />;
      case 'critical':
      case 'error': return <AlertTriangle size={14} className="text-red-400" />;
      default: return <Info size={14} className="text-blue-400" />;
    }
  };

  return (
    <header className="w-full flex items-center justify-between bg-background-secondary/80 backdrop-blur-xl border-b border-white/[0.04] pl-16 pr-4 md:px-6 py-3.5 z-30 min-w-0">
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{pageTitle}</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate hidden xs:block">
            {pathname === '/dashboard' ? 'Welcome back! Here\'s your security overview.' : `Manage your ${pageTitle.toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Real-time Clock & Live Engine Sync Status */}
      <div className="hidden xl:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-1.5 text-gray-300 font-mono text-[12px]">
          <Clock size={12} className="text-gray-400" />
          <span className="font-semibold text-white">{liveClock.timeString}</span>
        </div>
        <span className="text-gray-600 font-normal">|</span>
        <span className="text-[11px] text-gray-400 font-sans">{liveClock.dateString}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
          Live Sync
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <div className="relative hidden md:block w-44 lg:w-60">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search findings... (Enter)"
            onKeyDown={handleSearchSubmit}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-gray-300 placeholder-gray-500 pl-9 pr-4 py-1.5 outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all duration-200"
            aria-label="Global search"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-600 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">↵</kbd>
          </div>
        </div>

        <div className="relative" ref={notifRef}>
          <motion.button
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            onClick={() => setNotifOpen(v => !v)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 text-[9px] leading-none bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold shadow-lg shadow-red-500/25"
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 bg-background-secondary border border-white/[0.06] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer transition-colors bg-transparent border-0"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <Bell size={24} className="mx-auto text-gray-600 mb-2 opacity-50" />
                      <p className="text-xs text-gray-400 font-medium">No notifications yet</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Real-time alerts will appear here</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isRead = notif.read || readNotifIds.includes(notif.id);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif.id)}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer ${!isRead ? 'bg-violet-600/[0.05]' : 'opacity-70'}`}
                        >
                          <div className="mt-0.5">{typeIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${!isRead ? 'text-white font-semibold' : 'text-gray-400'}`}>{notif.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{notif.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-gray-600">{notif.time}</span>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-white/[0.04] text-center">
                  <button onClick={() => { setNotifOpen(false); router.push('/dashboard/notifications'); }}
                    className="text-[11px] text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">View all notifications</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={() => router.push('/dashboard/settings?tab=appearance')}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-1.5 cursor-pointer group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Cyber Defense Theme Customizer"
          aria-label="Theme Customizer"
        >
          <Palette size={18} className="group-hover:text-violet-400 transition-colors" />
        </motion.button>

        <motion.button
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Help"
        >
          <HelpCircle size={18} />
        </motion.button>

        <div className="h-5 w-px bg-white/[0.06]" aria-hidden="true" />

        <div className="relative" ref={dropdownRef}>
          <motion.button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <motion.div
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white text-xs font-bold select-none shadow-lg shadow-violet-600/20"
              whileHover={{ scale: 1.05 }}
            >
              {initials}
            </motion.div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{getDisplayName()}</p>
              <p className="text-[11px] text-gray-500 leading-tight">Administrator</p>
            </div>
            <motion.div
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="text-gray-500" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-background-secondary border border-white/[0.06] rounded-xl shadow-2xl shadow-black/50 py-1.5 z-50 overflow-hidden"
                role="menu"
              >
                <div className="px-4 py-2 border-b border-white/[0.04] mb-1">
                  <p className="text-xs font-medium text-white">{getDisplayName()}</p>
                  <p className="text-[10px] text-gray-500">{user?.email || ''}</p>
                </div>
                {[
                  { label: 'Profile', href: '/dashboard/settings', icon: User },
                  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    role="menuitem"
                  >
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-white/[0.04] mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.04] transition-colors"
                    role="menuitem"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
