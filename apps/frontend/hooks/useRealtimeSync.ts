'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventBus, EventPayload, EventType } from '@/lib/event-bus';

export interface RealtimeSyncStatus {
  isLive: boolean;
  lastUpdate: number;
  eventCount: number;
  recentEvents: EventPayload[];
  lastEventType?: EventType;
  lastEventData?: any;
  refreshCount?: number;
  lastRefreshTime?: number;
}

/**
 * 🔥 REAL-TIME SYNC HOOK
 * 
 * Subscribe to real-time events and get live status updates.
 * Use this hook on any page that needs to react to real-time data changes.
 * 
 * @example
 * const { isLive, lastUpdate, refresh } = useRealtimeSync();
 * 
 * // Trigger manual refresh
 * refresh();
 */
export function useRealtimeSync(eventFilter?: EventType[] | EventType | '*'): RealtimeSyncStatus & { refresh: () => void } {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [eventCount, setEventCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<EventPayload[]>([]);
  const [lastEventType, setLastEventType] = useState<EventType | undefined>();
  const [lastEventData, setLastEventData] = useState<any>();
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  const lastUpdateRef = React.useRef(Date.now());
  const filterKey = typeof eventFilter === 'string' ? eventFilter : Array.isArray(eventFilter) ? eventFilter.join(',') : '*';

  useEffect(() => {
    // Subscribe to all events or filtered events
    const unsubscribe = EventBus.subscribe('*', (payload) => {
      // Filter if needed
      if (filterKey !== '*') {
        const allowed = filterKey.split(',');
        if (allowed.length > 0 && !allowed.includes(payload.type)) {
          return;
        }
      }
      
      const now = Date.now();
      lastUpdateRef.current = now;
      setLastUpdate(now);
      setEventCount(prev => prev + 1);
      setRecentEvents(prev => [payload, ...prev].slice(0, 10));
      setLastEventType(payload.type);
      setLastEventData(payload.data);
      setIsLive(true);
      
      if (payload.type === 'DATA_REFRESHED') {
        setRefreshCount(prev => prev + 1);
        setLastRefreshTime(now);
      }
    });

    // Monitor connection health
    const healthCheck = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      // Consider offline if no events for 45 seconds
      if (timeSinceUpdate > 45000) {
        setIsLive(false);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(healthCheck);
    };
  }, [filterKey]);

  const refresh = useCallback(() => {
    const now = Date.now();
    lastUpdateRef.current = now;
    setLastUpdate(now);
    setRefreshCount(prev => prev + 1);
    setLastRefreshTime(now);
    EventBus.publish('DATA_REFRESHED', { manual: true }, 'useRealtimeSync');
  }, []);

  return {
    isLive,
    lastUpdate,
    eventCount,
    recentEvents,
    lastEventType,
    lastEventData,
    refreshCount,
    lastRefreshTime,
    refresh,
  };
}

/**
 * Hook for listening to scan-related events
 */
export function useRealtimeScanEvents(callback?: (event: EventPayload) => void) {
  const [scanStarted, setScanStarted] = useState<any>(null);
  const [scanCompleted, setScanCompleted] = useState<any>(null);
  const [scanProgress, setScanProgress] = useState<any>(null);
  const [totalScansStarted, setTotalScansStarted] = useState(0);
  const [totalScansCompleted, setTotalScansCompleted] = useState(0);

  useEffect(() => {
    const scanEvents: EventType[] = [
      'SCAN_STARTED',
      'SCAN_ADDED',
      'SCAN_UPDATED',
      'SCAN_COMPLETED',
      'SCAN_FAILED',
      'SCAN_RUNNING',
      'SCAN_CANCELLED',
    ];

    const unsubscribers = scanEvents.map(eventType =>
      EventBus.subscribe(eventType, (payload) => {
        if (payload.type === 'SCAN_STARTED' || payload.type === 'SCAN_ADDED') {
          setScanStarted(payload.data || true);
          setTotalScansStarted(prev => prev + 1);
        } else if (payload.type === 'SCAN_COMPLETED') {
          setScanCompleted(payload.data || true);
          setTotalScansCompleted(prev => prev + 1);
        } else if (payload.type === 'SCAN_UPDATED' || payload.type === 'SCAN_RUNNING') {
          setScanProgress(payload.data || true);
        }
        
        if (callback) {
          callback(payload);
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [callback]);

  return { scanStarted, scanCompleted, scanProgress, totalScansStarted, totalScansCompleted };
}

/**
 * Hook for listening to finding-related events
 */
export function useRealtimeFindingEvents(callback?: (event: EventPayload) => void) {
  const [findingAdded, setFindingAdded] = useState<any>(null);
  const [findingDeleted, setFindingDeleted] = useState<any>(null);
  const [totalFindingsAdded, setTotalFindingsAdded] = useState(0);

  useEffect(() => {
    const findingEvents: EventType[] = [
      'FINDING_ADDED',
      'FINDING_UPDATED',
      'FINDING_STATUS_CHANGED',
      'FINDING_DELETED',
      'FINDINGS_BULK_DELETED',
      'FINDINGS_BULK_UPDATED',
    ];

    const unsubscribers = findingEvents.map(eventType =>
      EventBus.subscribe(eventType, (payload) => {
        if (payload.type === 'FINDING_ADDED') {
          setFindingAdded(payload.data || true);
          setTotalFindingsAdded(prev => prev + 1);
        } else if (payload.type === 'FINDING_DELETED') {
          setFindingDeleted(payload.data || true);
        }
        
        if (callback) {
          callback(payload);
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [callback]);

  return { findingAdded, findingDeleted, totalFindingsAdded };
}

/**
 * Alias for useRealtimeSync - for data refresh events
 */
export function useRealtimeDataSync() {
  return useRealtimeSync(['DATA_REFRESHED', 'SCAN_COMPLETED', 'FINDING_ADDED']);
}

