/**
 * 🔥 REAL-TIME EVENT BUS
 * Centralized event broadcasting system for cross-page real-time synchronization
 * 
 * This enables ALL dashboard pages to communicate and update in real-time
 * without page refreshes or manual polling.
 */

export type EventType =
  | 'SCAN_STARTED'
  | 'SCAN_ADDED'
  | 'SCAN_UPDATED'
  | 'SCAN_PROGRESS'
  | 'SCAN_COMPLETED'
  | 'SCAN_FAILED'
  | 'SCAN_RUNNING'
  | 'SCAN_CANCELLED'
  | 'SCAN_DELETED'
  | 'SCANS_BULK_DELETED'
  | 'SCANS_CLEARED'
  | 'SCAN_SYNCED'
  | 'SCAN_SYNC_FAILED'
  | 'FINDING_ADDED'
  | 'FINDING_UPDATED'
  | 'FINDING_STATUS_CHANGED'
  | 'FINDING_DELETED'
  | 'FINDINGS_BULK_DELETED'
  | 'FINDINGS_BULK_UPDATED'
  | 'FINDINGS_CLEARED'
  | 'WORKSPACE_CREATED'
  | 'WORKSPACE_UPDATED'
  | 'WORKSPACE_DELETED'
  | 'REPORT_GENERATED'
  | 'REPORT_DELETED'
  | 'NOTIFICATION_RECEIVED'
  | 'ANALYTICS_UPDATED'
  | 'SETTINGS_CHANGED'
  | 'USER_ACTIVITY'
  | 'ACTIVE_SCAN_UPDATED'
  | 'ACTIVE_SCAN_CLEARED'
  | 'USER_STORAGE_HYDRATED'
  | 'DATA_REFRESHED';

export interface EventPayload {
  type: EventType;
  timestamp: number;
  data: any;
  source?: string;
}

type EventCallback = (payload: EventPayload) => void;
type Unsubscribe = () => void;

class EventBusService {
  private subscribers: Map<EventType | '*', Set<EventCallback>> = new Map();
  private eventHistory: EventPayload[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to specific event type or all events ('*')
   */
  subscribe(eventType: EventType | '*', callback: EventCallback): Unsubscribe {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Publish event to all subscribers
   */
  publish(type: EventType, data: any, source?: string): void {
    const payload: EventPayload = {
      type,
      data,
      timestamp: Date.now(),
      source,
    };

    // Add to history
    this.eventHistory.unshift(payload);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.pop();
    }

    // Notify specific event subscribers
    const typeSubscribers = this.subscribers.get(type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`EventBus: Error in ${type} callback:`, error);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`EventBus: Error in wildcard callback:`, error);
        }
      });
    }

    // Debug log in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`[EventBus] ${type}`, data);
    }
  }

  /**
   * Get recent event history
   */
  getHistory(limit = 50): EventPayload[] {
    return this.eventHistory.slice(0, limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscriber count for debugging
   */
  getSubscriberCount(eventType?: EventType | '*'): number {
    if (eventType) {
      return this.subscribers.get(eventType)?.size || 0;
    }
    let total = 0;
    this.subscribers.forEach(subs => total += subs.size);
    return total;
  }

  /**
   * Unsubscribe all listeners (cleanup)
   */
  unsubscribeAll(): void {
    this.subscribers.clear();
  }
}

// Singleton instance
export const EventBus = new EventBusService();

/**
 * React Hook for subscribing to events
 */
import { useEffect } from 'react';

export function useEventBus(
  eventType: EventType | '*',
  callback: EventCallback,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = EventBus.subscribe(eventType, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ...deps]);
}

/**
 * React Hook for publishing events
 */
export function useEventPublisher() {
  return (type: EventType, data: any, source?: string) => {
    EventBus.publish(type, data, source);
  };
}

/**
 * Cross-tab synchronization using localStorage
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'securelens_event' && e.newValue) {
      try {
        const payload: EventPayload = JSON.parse(e.newValue);
        EventBus.publish(payload.type, payload.data, 'cross-tab');
      } catch (error) {
        console.error('EventBus: Cross-tab sync error', error);
      }
    }
  });

  // Helper to broadcast events across tabs
  const originalPublish = EventBus.publish.bind(EventBus);
  EventBus.publish = (type: EventType, data: any, source?: string) => {
    originalPublish(type, data, source);
    
    // Broadcast to other tabs
    if (source !== 'cross-tab') {
      try {
        localStorage.setItem('securelens_event', JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
          source: 'cross-tab',
        }));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  };
}

export default EventBus;
