/**
 * useCycleExecutionItems - Single source of truth for cycle execution state
 * 
 * ARCHITECTURAL RULE: This hook is the ONLY data source for Kanban, Table, Calendar, Reports.
 * All views MUST consume this hook - no separate queries allowed.
 * 
 * Data Sources:
 * - tm_cycle_scope: current_status (source of truth), assigned_to, priority, due_date
 * - tm_test_runs: latest execution metadata (completed_at, duration, etc.)
 * 
 * Realtime:
 * - Subscribes to tm_cycle_scope and tm_test_runs changes
 * - Auto-refreshes on any mutation
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Execution status directly from tm_cycle_scope.current_status
export type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

// UI-friendly status mapping
export type UIStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

// Priority levels
export type ExecutionPriority = 'critical' | 'high' | 'medium' | 'low';

// Assignee info
export interface ExecutionAssignee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

// Execution item - unified data structure for all views
export interface CycleExecutionItem {
  // Scope identifiers
  id: string; // tm_cycle_scope.id
  testCaseId: string;
  cycleId: string;
  
  // Test case info
  caseKey: string;
  title: string;
  description: string | null;
  module: string | null;
  
  // Status from tm_cycle_scope (SOURCE OF TRUTH)
  status: UIStatus;
  dbStatus: ExecutionStatus;
  
  // Assignment from tm_cycle_scope
  priority: ExecutionPriority;
  assignedTo: string | null;
  assignee: ExecutionAssignee | null;
  dueDate: string | null;
  
  // Execution info from latest tm_test_runs
  latestRunId: string | null;
  executedAt: string | null;
  executedBy: string | null;
  durationSeconds: number | null;
  
  // Metadata
  sortOrder: number;
  addedAt: string | null;
  
  // Linked defect (if any)
  linkedDefectId: string | null;
  linkedDefectKey: string | null;
}

// Summary stats derived from items
export interface ExecutionSummary {
  total: number;
  notRun: number;
  inProgress: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  completionPct: number;
  passRate: number | null;
}

// Filter options
export interface ExecutionFilters {
  status?: UIStatus | null;
  assigneeId?: string | null;
  priority?: ExecutionPriority | null;
  search?: string | null;
}

// Map DB status to UI status
function mapDbToUiStatus(dbStatus: string | null): UIStatus {
  const map: Record<string, UIStatus> = {
    'not_run': 'not_started',
    'in_progress': 'in_progress',
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
  };
  return map[dbStatus || 'not_run'] || 'not_started';
}

// Map UI status to DB status
export function mapUiToDbStatus(uiStatus: UIStatus): ExecutionStatus {
  const map: Record<UIStatus, ExecutionStatus> = {
    'not_started': 'not_run',
    'in_progress': 'in_progress',
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
  };
  return map[uiStatus];
}

// Map priority string to typed priority
function mapPriority(priority: string | null): ExecutionPriority {
  const lower = (priority || 'medium').toLowerCase();
  if (lower === 'critical') return 'critical';
  if (lower === 'high') return 'high';
  if (lower === 'low') return 'low';
  return 'medium';
}

// Calculate summary from items
function calculateSummary(items: CycleExecutionItem[]): ExecutionSummary {
  const summary: ExecutionSummary = {
    total: items.length,
    notRun: 0,
    inProgress: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    completionPct: 0,
    passRate: null,
  };
  
  items.forEach(item => {
    switch (item.status) {
      case 'not_started':
        summary.notRun++;
        break;
      case 'in_progress':
        summary.inProgress++;
        break;
      case 'passed':
        summary.passed++;
        break;
      case 'failed':
        summary.failed++;
        break;
      case 'blocked':
        summary.blocked++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }
  });
  
  const completed = summary.passed + summary.failed + summary.blocked + summary.skipped;
  summary.completionPct = summary.total > 0 ? Math.round((completed / summary.total) * 100) : 0;
  
  const testedCount = summary.passed + summary.failed;
  summary.passRate = testedCount > 0 ? Math.round((summary.passed / testedCount) * 100) : null;
  
  return summary;
}

// Query keys for cache management
export const cycleExecutionKeys = {
  all: ['cycle-execution'] as const,
  items: (cycleId: string) => [...cycleExecutionKeys.all, 'items', cycleId] as const,
  summary: (cycleId: string) => [...cycleExecutionKeys.all, 'summary', cycleId] as const,
};

/**
 * Main hook: useCycleExecutionItems
 * 
 * Returns execution items for a cycle with realtime subscription.
 * ALL views (Kanban, Table, Calendar, Reports) MUST use this hook.
 */
export function useCycleExecutionItems(cycleId: string, filters?: ExecutionFilters) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: cycleExecutionKeys.items(cycleId),
    queryFn: async (): Promise<CycleExecutionItem[]> => {
      if (!cycleId) return [];
      
      // Query tm_cycle_scope with test case details
      const { data: scopeData, error: scopeError } = await (supabase as any)
        .from('tm_cycle_scope')
        .select(`
          id,
          cycle_id,
          test_case_id,
          current_status,
          assigned_to,
          priority,
          due_date,
          sort_order,
          added_at,
          test_case:tm_test_cases(
            id,
            case_key,
            title,
            description,
            priority:tm_case_priorities(name),
            folder:tm_folders(name)
          ),
          assignee:profiles(id, full_name, avatar_url)
        `)
        .eq('cycle_id', cycleId)
        .order('sort_order', { ascending: true });
      
      if (scopeError) {
        console.error('[useCycleExecutionItems] Scope query error:', scopeError);
        throw scopeError;
      }
      
      const scopeItems = scopeData || [];
      const scopeIds = scopeItems.map((s: any) => s.id);
      
      // Get latest run for each scope item
      let runsByScope: Record<string, any> = {};
      
      if (scopeIds.length > 0) {
        const { data: runs, error: runsError } = await (supabase as any)
          .from('tm_test_runs')
          .select('id, cycle_scope_id, status, completed_at, executed_by, duration_seconds')
          .in('cycle_scope_id', scopeIds)
          .order('completed_at', { ascending: false });
        
        if (!runsError && runs) {
          runs.forEach((run: any) => {
            if (!runsByScope[run.cycle_scope_id]) {
              runsByScope[run.cycle_scope_id] = run;
            }
          });
        }
      }
      
      // Map to execution items
      const items: CycleExecutionItem[] = scopeItems.map((scope: any) => {
        const testCase = scope.test_case;
        const run = runsByScope[scope.id];
        const assigneeProfile = scope.assignee;
        
        // Use scope priority if set, otherwise fall back to test case priority
        const effectivePriority = scope.priority || testCase?.priority?.name;
        
        return {
          id: scope.id,
          testCaseId: scope.test_case_id,
          cycleId: scope.cycle_id,
          caseKey: testCase?.case_key || 'TC-???',
          title: testCase?.title || 'Unknown Test Case',
          description: testCase?.description || null,
          module: testCase?.folder?.name || null,
          status: mapDbToUiStatus(scope.current_status),
          dbStatus: (scope.current_status || 'not_run') as ExecutionStatus,
          priority: mapPriority(effectivePriority),
          assignedTo: scope.assigned_to,
          assignee: assigneeProfile ? {
            id: assigneeProfile.id,
            full_name: assigneeProfile.full_name || 'Unknown',
            avatar_url: assigneeProfile.avatar_url,
          } : null,
          dueDate: scope.due_date || null,
          latestRunId: run?.id || null,
          executedAt: run?.completed_at || null,
          executedBy: run?.executed_by || null,
          durationSeconds: run?.duration_seconds || null,
          sortOrder: scope.sort_order || 0,
          addedAt: scope.added_at || null,
          linkedDefectId: null,
          linkedDefectKey: null,
        };
      });
      
      return items;
    },
    enabled: !!cycleId,
    staleTime: 30000,
  });
  
  // Apply client-side filters
  const filteredItems = useCallback(() => {
    let items = query.data || [];
    
    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }
    
    if (filters?.assigneeId) {
      if (filters.assigneeId === 'unassigned') {
        items = items.filter(item => !item.assignedTo);
      } else {
        items = items.filter(item => item.assignedTo === filters.assigneeId);
      }
    }
    
    if (filters?.priority) {
      items = items.filter(item => item.priority === filters.priority);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.caseKey.toLowerCase().includes(search)
      );
    }
    
    return items;
  }, [query.data, filters]);
  
  // Calculate summary from all items (unfiltered)
  const summary = useCallback((): ExecutionSummary => {
    return calculateSummary(query.data || []);
  }, [query.data]);
  
  // Realtime subscription
  useEffect(() => {
    if (!cycleId) return;
    
    // Subscribe to tm_cycle_scope changes
    const scopeChannel = supabase
      .channel(`cycle-scope-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_scope',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
        }
      )
      .subscribe();
    
    // Subscribe to tm_test_runs changes for this cycle's scope items
    const runsChannel = supabase
      .channel(`cycle-runs-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_test_runs',
        },
        () => {
          // Invalidate and refetch (we can't filter by cycle_id directly)
          queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(scopeChannel);
      supabase.removeChannel(runsChannel);
    };
  }, [cycleId, queryClient]);
  
  return {
    // Raw items from query
    allItems: query.data || [],
    
    // Filtered items based on provided filters
    items: filteredItems(),
    
    // Summary stats
    summary: summary(),
    
    // Query state
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Query client for manual invalidation
    invalidate: () => queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) }),
  };
}

/**
 * Group items by status for Kanban view
 */
export function groupByStatus(items: CycleExecutionItem[]): Record<UIStatus, CycleExecutionItem[]> {
  const groups: Record<UIStatus, CycleExecutionItem[]> = {
    not_started: [],
    in_progress: [],
    passed: [],
    failed: [],
    blocked: [],
    skipped: [],
  };
  
  items.forEach(item => {
    groups[item.status].push(item);
  });
  
  return groups;
}

/**
 * Group items by date for Calendar view
 */
export function groupByDate(items: CycleExecutionItem[], dateField: 'dueDate' | 'executedAt'): Record<string, CycleExecutionItem[]> {
  const groups: Record<string, CycleExecutionItem[]> = {};
  
  items.forEach(item => {
    const dateValue = item[dateField];
    if (!dateValue) return;
    
    const dateKey = new Date(dateValue).toISOString().split('T')[0];
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });
  
  return groups;
}
