/**
 * useWorkItemRealtime - Centralized realtime subscriptions for work items
 * 
 * This hook provides automatic cache invalidation when work items are
 * created, updated, or deleted in the database. It subscribes to
 * postgres_changes events for the specified table(s) and invalidates
 * the relevant query cache(s).
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Supported work item tables
export type WorkItemTable = 
  | 'epics'
  | 'features' 
  | 'stories'
  | 'subtasks'
  | 'defects'
  | 'strategic_themes'
  | 'objectives'
  | 'business_requests'
  | 'dependencies'
  | 'risks'
  | 'incidents';

interface UseWorkItemRealtimeOptions {
  /**
   * The table(s) to subscribe to for realtime updates
   */
  tables: WorkItemTable | WorkItemTable[];
  
  /**
   * Query keys to invalidate when changes are detected.
   * If not provided, the table name will be used as the query key.
   */
  queryKeys?: (string | string[])[];
  
  /**
   * Unique channel identifier suffix (useful when multiple instances exist)
   */
  channelSuffix?: string;
  
  /**
   * Whether the subscription is enabled (default: true)
   */
  enabled?: boolean;
}

/**
 * Hook for subscribing to realtime updates for work item tables
 * 
 * @example
 * // Single table with automatic query key
 * useWorkItemRealtime({ tables: 'features' });
 * 
 * @example
 * // Multiple tables with custom query keys
 * useWorkItemRealtime({
 *   tables: ['epics', 'features'],
 *   queryKeys: [['backlog-items'], ['epic-backlog'], ['feature-backlog']]
 * });
 */
export function useWorkItemRealtime({
  tables,
  queryKeys,
  channelSuffix = '',
  enabled = true,
}: UseWorkItemRealtimeOptions) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    const tableList = Array.isArray(tables) ? tables : [tables];
    const channelName = `work-item-realtime-${tableList.join('-')}${channelSuffix ? `-${channelSuffix}` : ''}`;
    
    // Build the channel with subscriptions for each table
    let channel = supabase.channel(channelName);
    
    for (const table of tableList) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          // Invalidate provided query keys, or default to table name
          if (queryKeys && queryKeys.length > 0) {
            for (const key of queryKeys) {
              const normalizedKey = Array.isArray(key) ? key : [key];
              queryClient.invalidateQueries({ queryKey: normalizedKey });
            }
          } else {
            // Default: invalidate query with table name as key
            queryClient.invalidateQueries({ queryKey: [table] });
          }
        }
      );
    }
    
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables, queryKeys, channelSuffix, enabled, queryClient]);
}

/**
 * Pre-configured hook for epic realtime updates
 */
export function useEpicRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'epics',
    queryKeys: [
      ['epics'],
      ['backlog-items'],
      ['epic-backlog'],
      // Invalidate all Enterprise Strategic Backlog epic queries (any filters)
      ['strategic-backlog-all-epics'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for feature realtime updates
 */
export function useFeatureRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'features',
    queryKeys: [
      ['features'],
      ['feature-backlog'],
      ['feature-detail'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for story realtime updates
 */
export function useStoryRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'stories',
    queryKeys: [
      ['stories'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for subtask realtime updates
 */
export function useSubtaskRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'subtasks',
    queryKeys: [
      ['subtasks'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for theme realtime updates
 */
export function useThemeRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'strategic_themes',
    queryKeys: [
      ['strategic_themes'],
      ['themes'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for defect realtime updates
 */
export function useDefectRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'defects',
    queryKeys: [
      ['defects'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for objective realtime updates
 */
export function useObjectiveRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'objectives',
    queryKeys: [
      ['objectives'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for business request realtime updates
 */
export function useBusinessRequestRealtime(additionalQueryKeys?: string[][]) {
  useWorkItemRealtime({
    tables: 'business_requests',
    queryKeys: [
      ['business_requests'],
      ['business-requests'],
      ...(additionalQueryKeys || []),
    ],
  });
}

/**
 * Pre-configured hook for all work items (for dashboards, etc.)
 */
export function useAllWorkItemsRealtime() {
  useWorkItemRealtime({
    tables: [
      'epics',
      'features',
      'stories',
      'subtasks',
      'defects',
      'strategic_themes',
      'objectives',
      'business_requests',
    ],
    queryKeys: [
      ['epics'],
      ['features'],
      ['stories'],
      ['subtasks'],
      ['defects'],
      ['strategic_themes'],
      ['objectives'],
      ['business_requests'],
      ['backlog-items'],
    ],
  });
}
