'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to provide a real-time ticking clock that updates every second.
 * Safe for SSR (initializes with empty / placeholder until client mounts).
 */
export function useLiveClock(updateIntervalMs: number = 1000) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, updateIntervalMs);
    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  if (!mounted) {
    return {
      mounted: false,
      now: new Date(),
      timeString: '--:--:--',
      dateString: 'Loading...',
      formattedFull: 'Real-time sync active',
      isoString: new Date().toISOString(),
      timestamp: Date.now(),
    };
  }

  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedFull = `${dateString} • ${timeString}`;

  return {
    mounted: true,
    now,
    timeString,
    dateString,
    formattedFull,
    isoString: now.toISOString(),
    timestamp: now.getTime(),
  };
}

/**
 * Format any date into accurate, live-reactive relative time.
 * e.g. "Just now", "24s ago", "3m ago", "1h ago", "Today at 20:35", "15 Aug 2026"
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined, currentNow?: Date): string {
  if (!dateInput) return 'Recently';

  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return 'Recently';

    const now = currentNow || new Date();
    const diffMs = now.getTime() - d.getTime();

    // Future or negative diff
    if (diffMs < 0 && Math.abs(diffMs) < 10000) return 'Just now';

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 15) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Format date & time nicely with full clarity.
 * e.g. "Aug 15, 2026, 08:35 PM"
 */
export function formatExactDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Short standard date string e.g. "2026-08-15"
 */
export function getISODateString(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
