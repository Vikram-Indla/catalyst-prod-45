// src/hooks/home/useHomeAnalytics.ts
// JOB-010: Home Analytics & Telemetry System
// Purpose: Track user behavior, adoption, and value metrics for the Home module

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HomeRoleMode } from '@/components/ja/home/HomeRoleModeSelector';

// ============================================
// EVENT TAXONOMY
// ============================================

export type HomeAnalyticsEvent =
  // Global Home Events
  | 'home_viewed'
  | 'home_mode_switched'
  | 'home_state_restored'
  | 'home_load_time'
  | 'home_search_executed'
  | 'home_sort_changed'
  | 'home_filter_applied'
  | 'home_filter_cleared'
  
  // Operations Mode Events
  | 'ops_chip_clicked'
  | 'ops_item_opened'
  | 'ops_status_changed'
  | 'ops_assign_to_me'
  | 'ops_escalate_clicked'
  
  // Delivery Mode Events
  | 'delivery_tab_switched'
  | 'delivery_item_opened'
  | 'delivery_star_toggled'
  | 'delivery_assign_to_me'
  | 'delivery_status_changed'
  | 'delivery_load_more'
  
  // Planner Mode Events
  | 'planner_tab_switched'
  | 'planner_item_opened'
  | 'planner_review_started'
  | 'planner_note_added'
  | 'planner_decision_made'
  
  // Error & Friction Events
  | 'home_api_error'
  | 'home_permission_denied'
  | 'home_empty_state_shown'
  | 'home_action_failed';

export interface HomeAnalyticsEventProperties {
  // Common properties
  tab?: string;
  filter?: string;
  item_type?: string;
  item_id?: string;
  item_key?: string;
  
  // Timing properties
  load_time_ms?: number;
  time_to_action_ms?: number;
  
  // Mode switch properties
  from_mode?: HomeRoleMode;
  to_mode?: HomeRoleMode;
  
  // Search properties
  search_query?: string;
  result_count?: number;
  
  // Error properties
  error_type?: string;
  error_message?: string;
  
  // Action properties
  action_type?: string;
  action_target?: string;
  
  // Star properties
  starred?: boolean;
  
  // Status change properties
  from_status?: string;
  to_status?: string;
}

interface AnalyticsContext {
  mode: HomeRoleMode;
  sessionId: string;
  pageLoadTime: number;
}

// Generate a session ID for the current browser session
function generateSessionId(): string {
  const stored = sessionStorage.getItem('home_analytics_session');
  if (stored) return stored;
  
  const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('home_analytics_session', newId);
  return newId;
}

// ============================================
// ANALYTICS HOOK
// ============================================

export function useHomeAnalytics(mode: HomeRoleMode) {
  const contextRef = useRef<AnalyticsContext>({
    mode,
    sessionId: '',
    pageLoadTime: performance.now(),
  });
  
  const lastActionTimeRef = useRef<number>(performance.now());
  const isTrackingRef = useRef<boolean>(true);

  // Initialize session ID
  useEffect(() => {
    contextRef.current.sessionId = generateSessionId();
    contextRef.current.mode = mode;
  }, [mode]);

  /**
   * Core tracking function - sends event to analytics table
   * Designed for performance: fire-and-forget, no blocking
   */
  const trackEvent = useCallback(async (
    eventName: HomeAnalyticsEvent,
    properties: HomeAnalyticsEventProperties = {}
  ): Promise<void> => {
    // Skip if tracking is disabled
    if (!isTrackingRef.current) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.debug('[Analytics] No user session, skipping event:', eventName);
        return;
      }

      const eventData = {
        user_id: user.id,
        event_name: eventName as string,
        home_mode: contextRef.current.mode as string,
        event_properties: JSON.parse(JSON.stringify(properties)),
        session_id: contextRef.current.sessionId,
      };

      // Fire-and-forget insert - don't await in production
      supabase
        .from('home_analytics_events')
        .insert([eventData])
        .then(({ error }) => {
          if (error) {
            console.warn('[Analytics] Failed to track event:', eventName, error.message);
          } else {
            console.debug('[Analytics] Tracked:', eventName, properties);
          }
        });

    } catch (error) {
      // Silently fail - analytics should never break the app
      console.warn('[Analytics] Error tracking event:', error);
    }
  }, []);

  // ============================================
  // GLOBAL HOME EVENTS
  // ============================================

  const trackHomeViewed = useCallback(() => {
    contextRef.current.pageLoadTime = performance.now();
    trackEvent('home_viewed');
  }, [trackEvent]);

  const trackModeSwitched = useCallback((fromMode: HomeRoleMode, toMode: HomeRoleMode) => {
    contextRef.current.mode = toMode;
    trackEvent('home_mode_switched', {
      from_mode: fromMode,
      to_mode: toMode,
    });
  }, [trackEvent]);

  const trackStateRestored = useCallback(() => {
    trackEvent('home_state_restored');
  }, [trackEvent]);

  const trackLoadTime = useCallback((loadTimeMs: number) => {
    trackEvent('home_load_time', { load_time_ms: loadTimeMs });
  }, [trackEvent]);

  const trackSearchExecuted = useCallback((query: string, resultCount: number) => {
    trackEvent('home_search_executed', {
      search_query: query.slice(0, 100), // Truncate for privacy
      result_count: resultCount,
    });
  }, [trackEvent]);

  const trackSortChanged = useCallback((sortBy: string) => {
    trackEvent('home_sort_changed', { action_type: sortBy });
  }, [trackEvent]);

  const trackFilterApplied = useCallback((filter: string) => {
    trackEvent('home_filter_applied', { filter });
  }, [trackEvent]);

  const trackFilterCleared = useCallback(() => {
    trackEvent('home_filter_cleared');
  }, [trackEvent]);

  // ============================================
  // OPERATIONS MODE EVENTS
  // ============================================

  const trackOpsChipClicked = useCallback((chipType: 'major' | 'sla' | 'blocked' | 'awaiting-me') => {
    trackEvent('ops_chip_clicked', { action_type: chipType });
  }, [trackEvent]);

  const trackOpsItemOpened = useCallback((itemType: 'incident' | 'release', itemId: string, itemKey?: string) => {
    const timeToAction = performance.now() - lastActionTimeRef.current;
    trackEvent('ops_item_opened', {
      item_type: itemType,
      item_id: itemId,
      item_key: itemKey,
      time_to_action_ms: Math.round(timeToAction),
    });
    lastActionTimeRef.current = performance.now();
  }, [trackEvent]);

  const trackOpsStatusChanged = useCallback((itemId: string, fromStatus: string, toStatus: string) => {
    trackEvent('ops_status_changed', {
      item_id: itemId,
      from_status: fromStatus,
      to_status: toStatus,
    });
  }, [trackEvent]);

  const trackOpsAssignToMe = useCallback((itemId: string) => {
    trackEvent('ops_assign_to_me', { item_id: itemId });
  }, [trackEvent]);

  // ============================================
  // DELIVERY MODE EVENTS
  // ============================================

  const trackDeliveryTabSwitched = useCallback((tab: 'worked-on' | 'assigned' | 'starred') => {
    trackEvent('delivery_tab_switched', { tab });
  }, [trackEvent]);

  const trackDeliveryItemOpened = useCallback((itemType: string, itemId: string, itemKey?: string) => {
    const timeToAction = performance.now() - lastActionTimeRef.current;
    trackEvent('delivery_item_opened', {
      item_type: itemType,
      item_id: itemId,
      item_key: itemKey,
      time_to_action_ms: Math.round(timeToAction),
    });
    lastActionTimeRef.current = performance.now();
  }, [trackEvent]);

  const trackDeliveryStarToggled = useCallback((itemId: string, starred: boolean) => {
    trackEvent('delivery_star_toggled', { item_id: itemId, starred });
  }, [trackEvent]);

  const trackDeliveryAssignToMe = useCallback((itemId: string) => {
    trackEvent('delivery_assign_to_me', { item_id: itemId });
  }, [trackEvent]);

  const trackDeliveryStatusChanged = useCallback((itemId: string, fromStatus: string, toStatus: string) => {
    trackEvent('delivery_status_changed', {
      item_id: itemId,
      from_status: fromStatus,
      to_status: toStatus,
    });
  }, [trackEvent]);

  const trackDeliveryLoadMore = useCallback((currentCount: number) => {
    trackEvent('delivery_load_more', { result_count: currentCount });
  }, [trackEvent]);

  // ============================================
  // PLANNER MODE EVENTS
  // ============================================

  const trackPlannerTabSwitched = useCallback((tab: 'planned' | 'upcoming' | 'pending-review') => {
    trackEvent('planner_tab_switched', { tab });
  }, [trackEvent]);

  const trackPlannerItemOpened = useCallback((itemId: string, itemKey?: string) => {
    const timeToAction = performance.now() - lastActionTimeRef.current;
    trackEvent('planner_item_opened', {
      item_id: itemId,
      item_key: itemKey,
      time_to_action_ms: Math.round(timeToAction),
    });
    lastActionTimeRef.current = performance.now();
  }, [trackEvent]);

  const trackPlannerReviewStarted = useCallback((itemId: string) => {
    trackEvent('planner_review_started', { item_id: itemId });
  }, [trackEvent]);

  const trackPlannerNoteAdded = useCallback((itemId: string) => {
    trackEvent('planner_note_added', { item_id: itemId });
  }, [trackEvent]);

  const trackPlannerDecisionMade = useCallback((itemId: string, decision: string) => {
    trackEvent('planner_decision_made', { item_id: itemId, action_type: decision });
  }, [trackEvent]);

  // ============================================
  // ERROR & FRICTION EVENTS
  // ============================================

  const trackApiError = useCallback((errorType: string, errorMessage?: string) => {
    trackEvent('home_api_error', {
      error_type: errorType,
      error_message: errorMessage?.slice(0, 200), // Truncate for safety
    });
  }, [trackEvent]);

  const trackPermissionDenied = useCallback((resource: string) => {
    trackEvent('home_permission_denied', { action_target: resource });
  }, [trackEvent]);

  const trackEmptyStateShown = useCallback((tab?: string, filter?: string) => {
    trackEvent('home_empty_state_shown', { tab, filter });
  }, [trackEvent]);

  const trackActionFailed = useCallback((action: string, reason: string) => {
    trackEvent('home_action_failed', {
      action_type: action,
      error_message: reason,
    });
  }, [trackEvent]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const disableTracking = useCallback(() => {
    isTrackingRef.current = false;
  }, []);

  const enableTracking = useCallback(() => {
    isTrackingRef.current = true;
  }, []);

  const resetTimestamp = useCallback(() => {
    lastActionTimeRef.current = performance.now();
  }, []);

  return {
    // Core
    trackEvent,
    
    // Global
    trackHomeViewed,
    trackModeSwitched,
    trackStateRestored,
    trackLoadTime,
    trackSearchExecuted,
    trackSortChanged,
    trackFilterApplied,
    trackFilterCleared,
    
    // Operations
    trackOpsChipClicked,
    trackOpsItemOpened,
    trackOpsStatusChanged,
    trackOpsAssignToMe,
    
    // Delivery
    trackDeliveryTabSwitched,
    trackDeliveryItemOpened,
    trackDeliveryStarToggled,
    trackDeliveryAssignToMe,
    trackDeliveryStatusChanged,
    trackDeliveryLoadMore,
    
    // Planner
    trackPlannerTabSwitched,
    trackPlannerItemOpened,
    trackPlannerReviewStarted,
    trackPlannerNoteAdded,
    trackPlannerDecisionMade,
    
    // Errors
    trackApiError,
    trackPermissionDenied,
    trackEmptyStateShown,
    trackActionFailed,
    
    // Utility
    disableTracking,
    enableTracking,
    resetTimestamp,
  };
}

// ============================================
// TYPES EXPORT
// ============================================

export type HomeAnalytics = ReturnType<typeof useHomeAnalytics>;
